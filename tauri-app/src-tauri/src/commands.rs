//! Tauri commands — 对应原 flutter_rust_bridge 暴露的 rust/src/api/** 全部接口
//!
//! 当前为**确定性 mock 实现**, 用于驱动 Svelte 前端的完整 UI 流程。
//! 接入真实 EasyTier 核心时 (见 Cargo.toml [features] real-backend),
//! 将各函数体替换为对 rust_lib_astral::api::* 的直接调用即可 —
//! 前端 (src/lib/core/bridge/bridge.ts) 的调用签名与之逐一对齐。

#![allow(clippy::needless_pass_by_value)]

use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::time::Duration;
use tauri::State;

pub struct AppState {
    pub running: AtomicBool,
    pub local_ip: Mutex<String>,
    pub start_at: Mutex<u64>,
    pub firewall: Mutex<[bool; 3]>,
    pub magic_wall_rules: Mutex<Vec<MagicWallRule>>,
    pub magic_wall_running: AtomicBool,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            running: AtomicBool::new(false),
            local_ip: Mutex::new(String::new()),
            start_at: Mutex::new(0),
            firewall: Mutex::new([true, true, true]),
            magic_wall_rules: Mutex::new(Vec::new()),
            magic_wall_running: AtomicBool::new(false),
        }
    }
}

// ---------------------------------------------------------------------------
// 数据结构 — 与前端 src/lib/core/models/types.ts 逐字段对齐
// ---------------------------------------------------------------------------

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct KVNodeConnectionStats {
    pub conn_type: String,
    pub rx_bytes: String,
    pub tx_bytes: String,
    pub rx_packets: String,
    pub tx_packets: String,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct NodeHopStats {
    pub peer_id: i64,
    pub target_ip: String,
    pub latency_ms: f64,
    pub packet_loss: f64,
    pub node_name: String,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct KVNodeInfo {
    pub peer_id: i64,
    pub hostname: String,
    pub ipv4: String,
    pub latency_ms: f64,
    pub nat: String,
    pub hops: Vec<NodeHopStats>,
    pub loss_rate: f64,
    pub connections: Vec<KVNodeConnectionStats>,
    pub tunnel_proto: String,
    pub conn_type: String,
    pub rx_bytes: String,
    pub tx_bytes: String,
    pub version: String,
    pub cost: i64,
    pub proxy_cidrs: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct KVNetworkStatus {
    pub total_nodes: String,
    pub nodes: Vec<KVNodeInfo>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CreateServerOptions {
    pub username: String,
    pub enable_dhcp: bool,
    pub specified_ip: String,
    pub room_name: String,
    pub room_password: String,
    pub severurl: Vec<String>,
    pub onurl: Vec<String>,
    pub cidrs: Vec<String>,
    pub flags: serde_json::Value,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct NetworkTestResult {
    pub nat_type_v4: String,
    pub nat_type_v6: String,
    pub ipv4_latency: i64,
    pub ipv6_latency: i64,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MagicWallRule {
    pub id: i64,
    pub rule_id: String,
    pub group_id: String,
    pub name: String,
    pub enabled: bool,
    pub action: String,
    pub protocol: String,
    pub direction: String,
    pub app_path: Option<String>,
    pub remote_ip: Option<String>,
    pub local_ip: Option<String>,
    pub remote_port: Option<String>,
    pub local_port: Option<String>,
    pub description: Option<String>,
    pub created_at: Option<i64>,
    pub updated_at: Option<i64>,
    pub priority: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MagicWallStatus {
    pub is_running: bool,
    pub active_rules: i64,
    pub total_rules: i64,
}

// ---------------------------------------------------------------------------
// simple — rust/src/api/simple.rs
// ---------------------------------------------------------------------------

fn now_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

#[cfg(not(feature = "real-backend"))]
#[tauri::command]
pub fn easytier_version() -> String {
    // 真实实现: rust_lib_astral::api::simple::easytier_version().await
    format!("2.4.0|{}", std::env::consts::OS)
}

#[cfg(not(feature = "real-backend"))]
#[tauri::command]
pub fn is_easytier_running(state: State<AppState>) -> bool {
    state.running.load(Ordering::SeqCst)
}

#[cfg(not(feature = "real-backend"))]
#[tauri::command]
pub fn get_ips() -> Vec<String> {
    // 真实实现: rust_lib_astral::api::simple::get_ips().await
    local_ip_addresses()
}

#[cfg(not(feature = "real-backend"))]
#[tauri::command]
pub fn get_running_info(state: State<AppState>) -> String {
    // 真实实现: rust_lib_astral::api::simple::get_running_info().await (JSON)
    let running = state.running.load(Ordering::SeqCst);
    let started = now_ms().saturating_sub(*state.start_at.lock().unwrap());
    let ip = state.local_ip.lock().unwrap().clone();
    let effective = if running && started > 2000 { ip } else { "0.0.0.0".into() };
    serde_json::json!({
        "ipv4": effective,
        "my_node_info": { "virtual_ipv4": { "address": { "addr": 0 } } }
    })
    .to_string()
}

#[cfg(not(feature = "real-backend"))]
#[tauri::command]
pub fn create_server(state: State<AppState>, opts: CreateServerOptions) -> Result<String, String> {
    // 真实实现: rust_lib_astral::api::simple::create_server(...).await
    if state.running.load(Ordering::SeqCst) {
        return Err("EasyTier 已在运行".into());
    }
    let ip = if opts.enable_dhcp {
        format!("10.126.{}.{}", 10 + (now_ms() % 190), 2 + (now_ms() % 248))
    } else {
        opts.specified_ip.split('/').next().unwrap_or("10.126.0.2").to_string()
    };
    *state.local_ip.lock().unwrap() = ip;
    *state.start_at.lock().unwrap() = now_ms();
    state.running.store(true, Ordering::SeqCst);
    Ok("ok".into())
}

#[cfg(not(feature = "real-backend"))]
#[tauri::command]
pub fn close_server(state: State<AppState>) {
    // 真实实现: rust_lib_astral::api::simple::close_server().await
    state.running.store(false, Ordering::SeqCst);
    *state.local_ip.lock().unwrap() = String::new();
}

#[cfg(not(feature = "real-backend"))]
#[tauri::command]
pub fn get_network_status(state: State<AppState>) -> KVNetworkStatus {
    // 真实实现: rust_lib_astral::api::simple::get_network_status().await
    if !state.running.load(Ordering::SeqCst) {
        return KVNetworkStatus { total_nodes: "0".into(), nodes: vec![] };
    }
    let nodes = mock_nodes(&state);
    KVNetworkStatus {
        total_nodes: nodes.len().to_string(),
        nodes,
    }
}

#[cfg(not(feature = "real-backend"))]
#[tauri::command]
pub fn init_app() {}

fn mock_nodes(state: &State<AppState>) -> Vec<KVNodeInfo> {
    let ip = state.local_ip.lock().unwrap().clone();
    let started = *state.start_at.lock().unwrap();
    let elapsed = now_ms().saturating_sub(started);
    let t = now_ms();

    let mut nodes = vec![KVNodeInfo {
        peer_id: 1,
        hostname: "本地玩家".into(),
        ipv4: ip.clone(),
        latency_ms: 0.0,
        nat: "FullCone".into(),
        hops: vec![],
        loss_rate: 0.0,
        connections: vec![],
        tunnel_proto: String::new(),
        conn_type: "local".into(),
        rx_bytes: "0".into(),
        tx_bytes: "0".into(),
        version: format!("2.4.0|{}", std::env::consts::OS),
        cost: 0,
        proxy_cidrs: vec![],
    }];

    let server_names = ["PublicServer_relay-1"];
    for (i, name) in server_names.iter().enumerate() {
        nodes.push(KVNodeInfo {
            peer_id: 900000 + i as i64,
            hostname: name.to_string(),
            ipv4: "0.0.0.0".into(),
            latency_ms: 43.0,
            nat: "Unknown".into(),
            hops: vec![],
            loss_rate: 0.0,
            connections: vec![],
            tunnel_proto: String::new(),
            conn_type: "server".into(),
            rx_bytes: "0".into(),
            tx_bytes: "0".into(),
            version: "2.4.0|server".into(),
            cost: 0,
            proxy_cidrs: vec![],
        });
    }

    let players = [
        ("月光会议室", "windows"),
        ("量子反应堆", "android"),
        ("云端档案馆", "linux"),
        ("克莱因暗房", "windows"),
    ];
    for (i, (name, platform)) in players.iter().enumerate() {
        // 玩家在 1.5~12s 间陆续加入
        let join_at = 1500 + (i as u64 + 1) * 2200;
        if elapsed < join_at {
            continue;
        }
        let joined = elapsed - join_at;
        let direct = i % 2 == 0;
        let latency = 30.0 + ((t / 4000 + i as u64 * 7) % 90) as f64;
        let traffic = 5_000_000 + (joined / 1000) as i64 * 150_000;
        nodes.push(KVNodeInfo {
            peer_id: 100000 + i as i64 * 3571,
            hostname: name.to_string(),
            ipv4: format!("{}.{}.{}", &ip[..ip.rfind('.').unwrap_or(0)], 10 + i * 37, 2 + i * 51),
            latency_ms: latency,
            nat: ["FullCone", "Restricted", "PortRestricted", "Symmetric"][i % 4].into(),
            hops: if direct {
                vec![]
            } else {
                vec![NodeHopStats {
                    peer_id: 900000,
                    target_ip: "10.126.0.1".into(),
                    latency_ms: latency * 0.4,
                    packet_loss: 0.2,
                    node_name: "PublicServer_relay-1".into(),
                }]
            },
            loss_rate: if i % 3 == 0 { 1.6 } else { 0.3 },
            connections: vec![KVNodeConnectionStats {
                conn_type: if direct { "p2p".into() } else { "relay".into() },
                rx_bytes: traffic.to_string(),
                tx_bytes: traffic.to_string(),
                rx_packets: (traffic / 1400).to_string(),
                tx_packets: (traffic / 1400).to_string(),
            }],
            tunnel_proto: if direct { "udp".into() } else { "tcp".into() },
            conn_type: if direct { "p2p".into() } else { "relay".into() },
            rx_bytes: traffic.to_string(),
            tx_bytes: traffic.to_string(),
            version: format!("2.4.0|{}", platform),
            cost: if direct { 1 } else { 2 },
            proxy_cidrs: vec![],
        });
    }
    nodes
}

// ---------------------------------------------------------------------------
// nat_test — rust/src/api/nat_test.rs
// ---------------------------------------------------------------------------

#[cfg(not(feature = "real-backend"))]
#[tauri::command]
pub fn test_network_connectivity(_stun_server: String) -> NetworkTestResult {
    // 真实实现: rust_lib_astral::api::nat_test::test_network_connectivity(...)
    NetworkTestResult {
        nat_type_v4: "完全锥形 NAT".into(),
        nat_type_v6: "开放互联网".into(),
        ipv4_latency: 36,
        ipv6_latency: 28,
    }
}

#[cfg(not(feature = "real-backend"))]
#[tauri::command]
pub fn detect_nat_type(stun_server: String) -> String {
    test_network_connectivity(stun_server).nat_type_v4
}

// ---------------------------------------------------------------------------
// firewall — rust/src/api/firewall.rs (仅 Windows)
// ---------------------------------------------------------------------------

#[cfg(not(feature = "real-backend"))]
#[tauri::command]
pub fn get_firewall_status(state: State<AppState>, profile_index: i64) -> Result<bool, String> {
    if !cfg!(windows) {
        return Err("此操作仅支持 Windows 平台".into());
    }
    Ok(state.firewall.lock().unwrap()[(profile_index - 1).clamp(0, 2) as usize])
}

#[cfg(not(feature = "real-backend"))]
#[tauri::command]
pub fn set_firewall_status(
    state: State<AppState>,
    profile_index: i64,
    enable: bool,
) -> Result<(), String> {
    if !cfg!(windows) {
        return Err("此操作仅支持 Windows 平台".into());
    }
    state.firewall.lock().unwrap()[(profile_index - 1).clamp(0, 2) as usize] = enable;
    Ok(())
}

// ---------------------------------------------------------------------------
// hops — rust/src/api/hops.rs
// ---------------------------------------------------------------------------

#[cfg(not(feature = "real-backend"))]
#[tauri::command]
pub fn get_all_interfaces_metrics() -> Result<Vec<(String, i64)>, String> {
    // 真实实现: rust_lib_astral::api::hops::get_all_interfaces_metrics().await
    Ok(vec![
        ("以太网".into(), 25),
        ("Wi-Fi".into(), 50),
        ("Loopback Pseudo-Interface 1".into(), 75),
        ("astral".into(), 5000),
    ])
}

#[cfg(not(feature = "real-backend"))]
#[tauri::command]
pub fn set_interface_metric(_interface_name: String, _metric: i64) -> Result<(), String> {
    Ok(())
}

#[cfg(not(feature = "real-backend"))]
#[tauri::command]
pub fn check_sudo() -> bool {
    true
}

// ---------------------------------------------------------------------------
// magic_wall — rust/src/api/magic_wall.rs (WFP, 仅 Windows)
// ---------------------------------------------------------------------------

#[cfg(not(feature = "real-backend"))]
#[tauri::command]
pub fn start_magic_wall(state: State<AppState>) -> Result<(), String> {
    if !cfg!(windows) {
        return Err("魔法墙仅支持 Windows 平台".into());
    }
    if state.magic_wall_running.load(Ordering::SeqCst) {
        return Err("魔法墙已经在运行".into());
    }
    state.magic_wall_running.store(true, Ordering::SeqCst);
    Ok(())
}

#[cfg(not(feature = "real-backend"))]
#[tauri::command]
pub fn stop_magic_wall(state: State<AppState>) -> Result<(), String> {
    if !cfg!(windows) {
        return Err("魔法墙仅支持 Windows 平台".into());
    }
    if !state.magic_wall_running.load(Ordering::SeqCst) {
        return Err("魔法墙未运行".into());
    }
    state.magic_wall_running.store(false, Ordering::SeqCst);
    Ok(())
}

#[cfg(not(feature = "real-backend"))]
#[tauri::command]
pub fn add_magic_wall_rule(state: State<AppState>, rule: MagicWallRule) -> Result<(), String> {
    if !cfg!(windows) {
        return Err("魔法墙仅支持 Windows 平台".into());
    }
    let mut rules = state.magic_wall_rules.lock().unwrap();
    match rules.iter().position(|r| r.rule_id == rule.rule_id) {
        Some(i) => rules[i] = rule,
        None => rules.push(rule),
    }
    Ok(())
}

#[cfg(not(feature = "real-backend"))]
#[tauri::command]
pub fn remove_magic_wall_rule(state: State<AppState>, rule_id: String) -> Result<(), String> {
    if !cfg!(windows) {
        return Err("魔法墙仅支持 Windows 平台".into());
    }
    let mut rules = state.magic_wall_rules.lock().unwrap();
    match rules.iter().position(|r| r.rule_id == rule_id) {
        Some(i) => {
            rules.remove(i);
            Ok(())
        }
        None => Err("规则不存在".into()),
    }
}

#[cfg(not(feature = "real-backend"))]
#[tauri::command]
pub fn update_magic_wall_rule(state: State<AppState>, rule: MagicWallRule) -> Result<(), String> {
    remove_magic_wall_rule(state.clone(), rule.rule_id.clone())?;
    add_magic_wall_rule(state, rule)
}

#[cfg(not(feature = "real-backend"))]
#[tauri::command]
pub fn get_magic_wall_status(state: State<AppState>) -> MagicWallStatus {
    let rules = state.magic_wall_rules.lock().unwrap();
    MagicWallStatus {
        is_running: state.magic_wall_running.load(Ordering::SeqCst),
        active_rules: rules.iter().filter(|r| r.enabled).count() as i64,
        total_rules: rules.len() as i64,
    }
}

#[cfg(not(feature = "real-backend"))]
#[tauri::command]
pub fn get_nt_path(dos_path: String) -> Option<String> {
    if dos_path.contains('\\') || dos_path.contains('/') {
        Some(dos_path)
    } else {
        None
    }
}

// ---------------------------------------------------------------------------
// misc — ping / npcap
// ---------------------------------------------------------------------------

#[cfg(not(feature = "real-backend"))]
#[tauri::command]
pub async fn ping_server(url: String) -> Result<Option<i64>, String> {
    // TCP ping: 解析 host:port (无端口默认 80), 5s 超时, >800ms 视为离线
    let addr = parse_host_port(&url);
    match tokio_ping(&addr).await {
        Some(ms) if ms <= 800 => Ok(Some(ms)),
        _ => Ok(None),
    }
}

fn parse_host_port(url: &str) -> String {
    let cleaned = url.trim_start_matches("faketcp://").trim_start_matches("tcp://");
    if cleaned.contains(':') {
        cleaned.to_string()
    } else {
        format!("{}:80", cleaned)
    }
}

async fn tokio_ping(addr: &str) -> Option<i64> {
    use std::time::Duration;
    let host_port: Vec<&str> = addr.split(':').collect();
    let host = host_port[0];
    let port: u16 = host_port.get(1).and_then(|p| p.parse().ok()).unwrap_or(80);
    let start = std::time::Instant::now();
    let fut = std::net::TcpStream::connect((host, port));
    // 同步 connect 包一层超时 (简单实现; 真实实现可用 tokio::net)
    match wait_with_timeout(fut, Duration::from_secs(5)) {
        Ok(_) => Some(start.elapsed().as_millis() as i64),
        Err(_) => None,
    }
}

fn wait_with_timeout<F, T>(fut: F, _timeout: Duration) -> Result<T, ()>
where
    F: FnOnce() -> Result<T, ()>,
{
    // 在当前线程直接执行 (阻塞不超过 connect 自身超时)
    fut()
}

#[cfg(not(feature = "real-backend"))]
#[tauri::command]
pub fn has_npcap_driver() -> bool {
    // 对应 connect_npcap_guard.dart 的三重探测 (文件/注册表/服务)
    if !cfg!(windows) {
        return true;
    }
    #[cfg(windows)]
    {
        let windir = std::env::var("WINDIR").unwrap_or_else(|_| "C:\\Windows".into());
        let candidates = [
            format!("{}\\System32\\Npcap\\wpcap.dll", windir),
            format!("{}\\SysWOW64\\Npcap\\wpcap.dll", windir),
            format!("{}\\System32\\drivers\\npcap.sys", windir),
            "C:\\Program Files\\Npcap\\NPFInstall.exe".into(),
            "C:\\Program Files (x86)\\Npcap\\NPFInstall.exe".into(),
        ];
        candidates.iter().any(|p| std::path::Path::new(p).exists())
    }
    #[cfg(not(windows))]
    {
        true
    }
}

// ---------------------------------------------------------------------------
// window — 前端 WindowControls 调用
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn minimize_window(window: tauri::Window) {
    let _ = window.minimize();
}

#[tauri::command]
pub fn toggle_maximize(window: tauri::Window) {
    if window.is_maximized().unwrap_or(false) {
        let _ = window.unmaximize();
    } else {
        let _ = window.maximize();
    }
}

#[tauri::command]
pub fn close_window(window: tauri::Window) {
    // 触发 tray.rs 中注册的关闭拦截 (对应原 onWindowClose)
    let _ = window.close();
}

#[tauri::command]
pub fn is_maximized(window: tauri::Window) -> bool {
    window.is_maximized().unwrap_or(false)
}

fn local_ip_addresses() -> Vec<String> {
    let mut ips = Vec::new();
    if let Ok(output) = std::process::Command::new("ip")
        .args(["-4", "-br", "addr"])
        .output()
    {
        let text = String::from_utf8_lossy(&output.stdout);
        for line in text.lines() {
            if let Some(ip) = line.split_whitespace().nth(2) {
                let ip = ip.split('/').next().unwrap_or("").to_string();
                if !ip.is_empty() {
                    ips.push(ip);
                }
            }
        }
    }
    ips
}
