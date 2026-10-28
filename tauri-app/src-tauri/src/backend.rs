//! Real EasyTier backend for the Tauri commands.
//!
//! Every function here mirrors a `#[tauri::command]` in `commands.rs` (same name,
//! same argument names, same JSON shape) but forwards to the repository's
//! existing EasyTier core in `rust/src/api/*` — the same code the Flutter build
//! drives through flutter_rust_bridge. The Svelte frontend therefore talks to
//! the identical networking implementation, with no behaviour reimplemented.
//!
//! Selected at build time via the `real-backend` feature (see lib.rs).

use serde::Deserialize;
use serde_json::Value;
use std::time::Duration;
use tauri::State;

use rust_lib_astral::api::{firewall, hops, magic_wall, nat_test, nt, simple, utils};

use crate::commands::{
    AppState, CreateServerOptions, KVNetworkStatus, KVNodeConnectionStats, KVNodeInfo,
    MagicWallRule, MagicWallStatus, NetworkTestResult, NodeHopStats,
};

/* ------------------------------------------------------------------ */
/* flags mapping                                                       */
/* ------------------------------------------------------------------ */

/// `FlagsC` as sent by the frontend (camelCase JSON, see types.ts).
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct FlagsIn {
    default_protocol: String,
    dev_name: String,
    enable_encryption: bool,
    enable_ipv6: bool,
    mtu: u32,
    latency_first: bool,
    enable_exit_node: bool,
    no_tun: bool,
    use_smoltcp: bool,
    relay_network_whitelist: String,
    disable_p2p: bool,
    enable_udp_broadcast_relay: bool,
    relay_all_peer_rpc: bool,
    disable_udp_hole_punching: bool,
    disable_tcp_hole_punching: bool,
    multi_thread: bool,
    data_compress_algo: i32,
    bind_device: bool,
    enable_kcp_proxy: bool,
    disable_kcp_input: bool,
    disable_relay_kcp: bool,
    proxy_forward_by_system: bool,
    accept_dns: bool,
    private_mode: bool,
    enable_quic_proxy: bool,
    disable_quic_input: bool,
    disable_sym_hole_punching: bool,
    tcp_whitelist: String,
    udp_whitelist: String,
    socks5_port: u16,
}

impl Default for FlagsIn {
    fn default() -> Self {
        Self {
            default_protocol: "tcp".into(),
            dev_name: "astral".into(),
            enable_encryption: true,
            enable_ipv6: true,
            mtu: 1420,
            latency_first: false,
            enable_exit_node: false,
            no_tun: false,
            use_smoltcp: true,
            relay_network_whitelist: String::new(),
            disable_p2p: false,
            enable_udp_broadcast_relay: true,
            relay_all_peer_rpc: false,
            disable_udp_hole_punching: false,
            disable_tcp_hole_punching: false,
            multi_thread: true,
            data_compress_algo: 1,
            bind_device: true,
            enable_kcp_proxy: true,
            disable_kcp_input: false,
            disable_relay_kcp: true,
            proxy_forward_by_system: false,
            accept_dns: false,
            private_mode: false,
            enable_quic_proxy: false,
            disable_quic_input: false,
            disable_sym_hole_punching: false,
            tcp_whitelist: String::new(),
            udp_whitelist: String::new(),
            socks5_port: 0,
        }
    }
}

fn to_core_flags(raw: &Value) -> simple::FlagsC {
    let f: FlagsIn = serde_json::from_value(raw.clone()).unwrap_or_default();
    simple::FlagsC {
        default_protocol: f.default_protocol,
        // rust/src/api/simple.rs forces this value; keep it identical.
        dev_name: "astral".to_string(),
        enable_encryption: f.enable_encryption,
        enable_ipv6: f.enable_ipv6,
        mtu: f.mtu,
        latency_first: f.latency_first,
        enable_exit_node: f.enable_exit_node,
        no_tun: f.no_tun,
        use_smoltcp: f.use_smoltcp,
        relay_network_whitelist: f.relay_network_whitelist,
        disable_p2p: f.disable_p2p,
        enable_udp_broadcast_relay: f.enable_udp_broadcast_relay,
        relay_all_peer_rpc: f.relay_all_peer_rpc,
        disable_udp_hole_punching: f.disable_udp_hole_punching,
        disable_tcp_hole_punching: f.disable_tcp_hole_punching,
        multi_thread: f.multi_thread,
        data_compress_algo: f.data_compress_algo,
        bind_device: f.bind_device,
        enable_kcp_proxy: f.enable_kcp_proxy,
        disable_kcp_input: f.disable_kcp_input,
        disable_relay_kcp: f.disable_relay_kcp,
        proxy_forward_by_system: f.proxy_forward_by_system,
        accept_dns: f.accept_dns,
        private_mode: f.private_mode,
        enable_quic_proxy: f.enable_quic_proxy,
        disable_quic_input: f.disable_quic_input,
        disable_sym_hole_punching: f.disable_sym_hole_punching,
        tcp_whitelist: f.tcp_whitelist,
        udp_whitelist: f.udp_whitelist,
        socks5_port: f.socks5_port,
    }
}

/* ------------------------------------------------------------------ */
/* status mapping                                                      */
/* ------------------------------------------------------------------ */

fn map_status(src: simple::KVNetworkStatus) -> KVNetworkStatus {
    KVNetworkStatus {
        total_nodes: src.total_nodes.to_string(),
        nodes: src
            .nodes
            .into_iter()
            .map(|n| KVNodeInfo {
                peer_id: n.peer_id as i64,
                hostname: n.hostname,
                ipv4: n.ipv4,
                latency_ms: n.latency_ms,
                nat: n.nat,
                hops: n
                    .hops
                    .into_iter()
                    .map(|h| NodeHopStats {
                        peer_id: h.peer_id as i64,
                        target_ip: h.target_ip,
                        latency_ms: h.latency_ms,
                        packet_loss: h.packet_loss as f64,
                        node_name: h.node_name,
                    })
                    .collect(),
                loss_rate: n.loss_rate as f64,
                connections: n
                    .connections
                    .into_iter()
                    .map(|c| KVNodeConnectionStats {
                        conn_type: c.conn_type,
                        rx_bytes: c.rx_bytes.to_string(),
                        tx_bytes: c.tx_bytes.to_string(),
                        rx_packets: c.rx_packets.to_string(),
                        tx_packets: c.tx_packets.to_string(),
                    })
                    .collect(),
                tunnel_proto: n.tunnel_proto,
                conn_type: n.conn_type,
                rx_bytes: n.rx_bytes.to_string(),
                tx_bytes: n.tx_bytes.to_string(),
                version: n.version,
                cost: n.cost as i64,
                proxy_cidrs: n.proxy_cidrs,
            })
            .collect(),
    }
}

fn map_rule_to_core(r: &MagicWallRule) -> magic_wall::MagicWallRule {
    magic_wall::MagicWallRule {
        // The core identifies rules by a single string id.
        id: r.rule_id.clone(),
        name: r.name.clone(),
        enabled: r.enabled,
        action: r.action.clone(),
        protocol: r.protocol.clone(),
        direction: r.direction.clone(),
        app_path: r.app_path.clone(),
        remote_ip: r.remote_ip.clone(),
        local_ip: r.local_ip.clone(),
        remote_port: r.remote_port.clone(),
        local_port: r.local_port.clone(),
        description: r.description.clone(),
        created_at: r.created_at,
    }
}

/* ------------------------------------------------------------------ */
/* simple                                                              */
/* ------------------------------------------------------------------ */

#[tauri::command]
pub fn easytier_version() -> String {
    simple::easytier_version().unwrap_or_default()
}

#[tauri::command]
pub async fn is_easytier_running(_state: State<'_, AppState>) -> bool {
    simple::is_easytier_running().await
}

#[tauri::command]
pub async fn get_ips(_state: State<'_, AppState>) -> Vec<String> {
    simple::get_ips().await
}

#[tauri::command]
pub async fn get_running_info(_state: State<'_, AppState>) -> String {
    simple::get_running_info().await
}

#[tauri::command]
pub async fn create_server(
    _state: State<'_, AppState>,
    opts: CreateServerOptions,
) -> Result<String, String> {
    let flag = to_core_flags(&opts.flags);
    let handle = simple::create_server(
        opts.username,
        opts.enable_dhcp,
        opts.specified_ip,
        opts.room_name,
        opts.room_password,
        opts.severurl,
        opts.onurl,
        opts.cidrs,
        vec![],
        flag,
    );
    handle.await.map_err(|e| format!("任务失败: {e}"))??;
    Ok("ok".to_string())
}

#[tauri::command]
pub fn close_server(_state: State<'_, AppState>) {
    simple::close_server();
}

#[tauri::command]
pub async fn get_network_status(_state: State<'_, AppState>) -> KVNetworkStatus {
    map_status(simple::get_network_status().await)
}

#[tauri::command]
pub fn init_app(_state: State<'_, AppState>) {
    simple::init_app();
}

/* ------------------------------------------------------------------ */
/* nat                                                                 */
/* ------------------------------------------------------------------ */

#[tauri::command]
pub async fn test_network_connectivity(stun_server: String) -> NetworkTestResult {
    match nat_test::test_network_connectivity(stun_server) {
        Ok(r) => NetworkTestResult {
            nat_type_v4: r.nat_type_v4,
            nat_type_v6: r.nat_type_v6,
            ipv4_latency: r.ipv4_latency,
            ipv6_latency: r.ipv6_latency,
        },
        Err(e) => NetworkTestResult {
            nat_type_v4: format!("失败: {e}"),
            nat_type_v6: "-".into(),
            ipv4_latency: -1,
            ipv6_latency: -1,
        },
    }
}

#[tauri::command]
pub async fn detect_nat_type(stun_server: String) -> String {
    nat_test::detect_nat_type(stun_server).unwrap_or_else(|e| format!("失败: {e}"))
}

/* ------------------------------------------------------------------ */
/* firewall                                                            */
/* ------------------------------------------------------------------ */

#[tauri::command]
pub async fn get_firewall_status(
    _state: State<'_, AppState>,
    profile_index: i64,
) -> Result<bool, String> {
    #[cfg(target_os = "windows")]
    {
        firewall::get_firewall_status(profile_index as u32).map_err(|e| format!("{e}"))
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = profile_index;
        Err("此操作仅支持 Windows 平台".into())
    }
}

#[tauri::command]
pub async fn set_firewall_status(
    _state: State<'_, AppState>,
    profile_index: i64,
    enable: bool,
) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        firewall::set_firewall_status(profile_index as u32, enable).map_err(|e| format!("{e}"))
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = (profile_index, enable);
        Err("此操作仅支持 Windows 平台".into())
    }
}

/* ------------------------------------------------------------------ */
/* hops                                                                */
/* ------------------------------------------------------------------ */

#[tauri::command]
pub async fn get_all_interfaces_metrics() -> Result<Vec<(String, i64)>, String> {
    hops::get_all_interfaces_metrics()
        .map(|v| v.into_iter().map(|(n, m)| (n, m as i64)).collect())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn set_interface_metric(interface_name: String, metric: i64) -> Result<(), String> {
    hops::set_interface_metric(&interface_name, metric.max(0) as u32).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn check_sudo() -> bool {
    utils::check_sudo()
}

/* ------------------------------------------------------------------ */
/* magic wall                                                          */
/* ------------------------------------------------------------------ */

#[tauri::command]
pub async fn start_magic_wall(_state: State<'_, AppState>) -> Result<(), String> {
    magic_wall::start_magic_wall()
}

#[tauri::command]
pub async fn stop_magic_wall(_state: State<'_, AppState>) -> Result<(), String> {
    magic_wall::stop_magic_wall()
}

#[tauri::command]
pub async fn add_magic_wall_rule(
    _state: State<'_, AppState>,
    rule: MagicWallRule,
) -> Result<(), String> {
    magic_wall::add_magic_wall_rule(map_rule_to_core(&rule))
}

#[tauri::command]
pub async fn remove_magic_wall_rule(
    _state: State<'_, AppState>,
    rule_id: String,
) -> Result<(), String> {
    magic_wall::remove_magic_wall_rule(rule_id)
}

#[tauri::command]
pub async fn update_magic_wall_rule(
    _state: State<'_, AppState>,
    rule: MagicWallRule,
) -> Result<(), String> {
    magic_wall::update_magic_wall_rule(map_rule_to_core(&rule))
}

#[tauri::command]
pub async fn get_magic_wall_status(_state: State<'_, AppState>) -> MagicWallStatus {
    match magic_wall::get_magic_wall_status() {
        Ok(s) => MagicWallStatus {
            is_running: s.is_running,
            active_rules: s.active_rules as i64,
            total_rules: s.total_rules as i64,
        },
        Err(_) => MagicWallStatus {
            is_running: false,
            active_rules: 0,
            total_rules: 0,
        },
    }
}

#[tauri::command]
pub async fn get_nt_path(dos_path: String) -> Option<String> {
    nt::get_nt_path(&dos_path)
}

/* ------------------------------------------------------------------ */
/* misc                                                                */
/* ------------------------------------------------------------------ */

/// TCP-connect probe, budget 800ms — same rule as
/// lib/shared/utils/network/ping_util.dart.
#[tauri::command]
pub async fn ping_server(url: String) -> Result<Option<i64>, String> {
    let started = std::time::Instant::now();
    let addr = url.clone();
    let handle = tokio::spawn(async move { tokio::net::TcpStream::connect(addr).await.is_ok() });
    match tokio::time::timeout(Duration::from_millis(800), handle).await {
        Ok(Ok(true)) => Ok(Some(started.elapsed().as_millis() as i64)),
        _ => Ok(None),
    }
}

#[tauri::command]
pub async fn has_npcap_driver() -> bool {
    #[cfg(target_os = "windows")]
    {
        std::path::Path::new(r"C:\Windows\System32\Npcap\wpcap.dll").exists()
            || std::path::Path::new(r"C:\Windows\SysWOW64\Npcap\wpcap.dll").exists()
    }
    #[cfg(not(target_os = "windows"))]
    {
        true
    }
}
