use easytier::common::config::{ConfigFileControl, PortForwardConfig};
pub use easytier::{
    common::{
        self,
        config::{ConfigLoader, NetworkIdentity, PeerConfig, TomlConfigLoader},
        global_ctx::{EventBusSubscriber, GlobalCtxEvent},
    },
    instance::factory::{NativeInstanceManager, native_instance_manager, subscribe_native_instance_event},
    proto,
    proto::{
        api::{
            instance::{PeerRoutePair, Route},
        },
        common::NatType,
    },
};
use lazy_static::lazy_static;
use serde_json::json;
pub use std::collections::BTreeMap;
use std::sync::Arc;
use tokio::runtime::Runtime;
use tokio::sync::RwLock;
pub use tokio::task::JoinHandle;
use uuid::Uuid;

pub static DEFAULT_ET_DNS_ZONE: &str = "as.net.";

lazy_static! {
    static ref MANAGER: NativeInstanceManager = native_instance_manager();
    static ref CURRENT_ID: Arc<RwLock<Option<Uuid>>> = Arc::new(RwLock::new(None));
}
// 鍒涘缓涓€涓?NetworkInstance 绫诲瀷鍙橀噺 鍌ㄥ瓨褰撳墠鏈嶅姟鍣?lazy_static! {
    static ref RT: Runtime = Runtime::new().expect("鍒涘缓 Tokio 杩愯鏃跺け璐?);
}

fn peer_conn_info_to_string(p: proto::api::instance::PeerConnInfo) -> String {
    format!(
        "my_peer_id: {}, dst_peer_id: {}, tunnel_info: {:?}",
        p.my_peer_id, p.peer_id, p.tunnel
    )
}

pub fn send_udp_to_localhost(message: &str) -> Result<(), String> {
    use std::net::UdpSocket;

    let socket = match UdpSocket::bind("0.0.0.0:0") {
        Ok(s) => s,
        Err(e) => return Err(format!("缁戝畾UDP濂楁帴瀛楀け璐? {}", e)),
    };

    match socket.send_to(message.as_bytes(), "127.0.0.1:9999") {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("鍙戦€乁DP鏁版嵁澶辫触: {}", e)),
    }
}

pub fn handle_event(mut events: EventBusSubscriber) -> tokio::task::JoinHandle<()> {
    tokio::spawn(async move {
        loop {
            match events.recv().await {
                Ok(e) => {
                    //  println!("Received event: {:?}", e);
                    match e {
                        GlobalCtxEvent::PeerAdded(p) => {
                            println!("{}", format!("鏂拌妭鐐瑰凡娣诲姞銆傝妭鐐笽D: {}", p));
                            let _ = send_udp_to_localhost(&format!("鏂拌妭鐐瑰凡娣诲姞銆傝妭鐐笽D: {}", p));
                        }
                        GlobalCtxEvent::PeerRemoved(p) => {
                            println!("{}", format!("鑺傜偣宸茬Щ闄ゃ€傝妭鐐笽D: {}", p));
                            let _ = send_udp_to_localhost(&format!("鑺傜偣宸茬Щ闄ゃ€傝妭鐐笽D: {}", p));
                        }
                        GlobalCtxEvent::PeerConnAdded(p) => {
                            let conn_info = peer_conn_info_to_string(p);
                            let msg = format!("鏂拌妭鐐硅繛鎺ュ凡娣诲姞銆傝繛鎺ヤ俊鎭? {}", conn_info);
                            println!("{}", msg);
                            let _ = send_udp_to_localhost(&msg);
                        }
                        GlobalCtxEvent::PeerConnRemoved(p) => {
                            let msg = format!(
                                "鑺傜偣杩炴帴宸茬Щ闄ゃ€傝繛鎺ヤ俊鎭? {}",
                                peer_conn_info_to_string(p)
                            );
                            println!("{}", msg);
                            let _ = send_udp_to_localhost(&msg);
                        }
                        GlobalCtxEvent::ListenerAddFailed(p, msg) => {
                            let msg = format!("鐩戝惉鍣ㄦ坊鍔犲け璐ャ€傜洃鍚櫒: {}, 娑堟伅: {}", p, msg);
                            println!("{}", msg);
                            let _ = send_udp_to_localhost(&msg);
                        }
                        GlobalCtxEvent::ListenerAcceptFailed(p, msg) => {
                            let msg = format!("鐩戝惉鍣ㄦ帴鍙楀け璐ャ€傜洃鍚櫒: {}, 娑堟伅: {}", p, msg);
                            println!("{}", msg);
                            let _ = send_udp_to_localhost(&msg);
                        }
                        GlobalCtxEvent::ListenerAdded(p) => {
                            if p.scheme() == "ring" {
                                continue;
                            }
                            let msg = format!("鏂扮洃鍚櫒宸叉坊鍔犮€傜洃鍚櫒: {}", p);
                            println!("{}", msg);
                            let _ = send_udp_to_localhost(&msg);
                        }
                        GlobalCtxEvent::ConnectionAccepted(local, remote) => {
                            let msg = format!("鏂拌繛鎺ュ凡鎺ュ彈銆傛湰鍦? {}, 杩滅▼: {}", local, remote);
                            println!("{}", msg);
                            let _ = send_udp_to_localhost(&msg);
                        }
                        GlobalCtxEvent::ConnectionError(local, remote, err) => {
                            let msg = format!(
                                "杩炴帴閿欒銆傛湰鍦? {}, 杩滅▼: {}, 閿欒: {}",
                                local, remote, err
                            );
                            println!("{}", msg);
                            let _ = send_udp_to_localhost(&msg);
                        }
                        GlobalCtxEvent::TunDeviceReady(dev) => {
                            let msg = format!("TUN 璁惧灏辩华銆傝澶? {}", dev);
                            println!("{}", msg);
                            let _ = send_udp_to_localhost(&msg);
                        }
                        GlobalCtxEvent::TunDeviceError(err) => {
                            let msg = format!("TUN 璁惧閿欒銆傞敊璇? {}", err);
                            println!("{}", msg);
                            let _ = send_udp_to_localhost(&msg);
                        }
                        GlobalCtxEvent::Connecting(dst) => {
                            let msg = format!("姝ｅ湪杩炴帴鍒拌妭鐐广€傜洰鏍? {}", dst);
                            println!("{}", msg);
                            let _ = send_udp_to_localhost(&msg);
                        }
                        GlobalCtxEvent::ConnectError(dst, ip_version, err) => {
                            let msg = format!(
                                "杩炴帴鍒拌妭鐐归敊璇€傜洰鏍? {}, IP鐗堟湰: {}, 閿欒: {}",
                                dst, ip_version, err
                            );
                            println!("{}", msg);
                            let _ = send_udp_to_localhost(&msg);
                        }
                        GlobalCtxEvent::VpnPortalStarted(portal) => {
                            let msg = format!("VPN 闂ㄦ埛宸插惎鍔ㄣ€傞棬鎴? {}", portal);
                            println!("{}", msg);
                            let _ = send_udp_to_localhost(&msg);
                        }
                        GlobalCtxEvent::VpnPortalClientConnected(portal, client_addr) => {
                            let msg = format!(
                                "VPN 闂ㄦ埛瀹㈡埛绔凡杩炴帴銆傞棬鎴? {}, 瀹㈡埛绔湴鍧€: {}",
                                portal, client_addr
                            );
                            println!("{}", msg);
                            let _ = send_udp_to_localhost(&msg);
                        }
                        GlobalCtxEvent::VpnPortalClientDisconnected(portal, client_addr) => {
                            let msg = format!(
                                "VPN 闂ㄦ埛瀹㈡埛绔凡鏂紑杩炴帴銆傞棬鎴? {}, 瀹㈡埛绔湴鍧€: {}",
                                portal, client_addr
                            );
                            println!("{}", msg);
                            let _ = send_udp_to_localhost(&msg);
                        }
                        GlobalCtxEvent::DhcpIpv4Changed(old, new) => {
                            let msg = format!("DHCP IP 宸叉洿鏀广€傛棫: {:?}, 鏂? {:?}", old, new);
                            println!("{}", msg);
                            let _ = send_udp_to_localhost(&msg);
                        }
                        GlobalCtxEvent::DhcpIpv4Conflicted(ip) => {
                            let msg = format!("DHCP IP 鍐茬獊銆侷P: {:?}", ip);
                            println!("{}", msg);
                            let _ = send_udp_to_localhost(&msg);
                        }
                        GlobalCtxEvent::PortForwardAdded(port_forward_config_pb) => {
                            let msg = format!("绔彛杞彂宸叉坊鍔犮€傞厤缃? {:?}", port_forward_config_pb);
                            println!("{}", msg);
                            let _ = send_udp_to_localhost(&msg);
                        }
                        GlobalCtxEvent::ConfigPatched(_) => {}
                        GlobalCtxEvent::ProxyCidrsUpdated(_, _) => {}
                        _ => {}
                    }
                }
                Err(err) => {
                    eprintln!("鎺ユ敹浜嬩欢閿欒: {:?}", err);
                    // 鏍规嵁閿欒绫诲瀷鍐冲畾鏄惁涓柇寰幆
                    match err {
                        tokio::sync::broadcast::error::RecvError::Closed => {
                            let msg = "浜嬩欢閫氶亾宸插叧闂紝鍋滄浜嬩欢澶勭悊銆?;
                            println!("{}", msg);
                            let _ = send_udp_to_localhost(msg);
                            break; // Exit the loop if the channel is closed
                        }
                        tokio::sync::broadcast::error::RecvError::Lagged(n) => {
                            let msg = format!("浜嬩欢澶勭悊婊炲悗锛屼涪澶变簡 {} 涓簨浠躲€?, n);
                            eprintln!("{}", msg);
                            let _ = send_udp_to_localhost(&msg);
                            // Decide if lagging is critical enough to break or just log
                        }
                    }
                }
            }
        }
    })
}

async fn create_and_store_network_instance(cfg: TomlConfigLoader) -> Result<(), String> {
    println!("{:?}", cfg);

    // 鍦ㄧЩ鍔?cfg 涔嬪墠鍏堣幏鍙?ID
    let name = cfg.get_id().to_string();
    let had_instance = {
        let mut instance_guard = CURRENT_ID.write().await;
        instance_guard.take().is_some()
    };
    // 鍒涘缓骞跺惎鍔ㄧ綉缁滃疄渚?    let instance_id = MANAGER
        .run_network_instance(cfg, ConfigFileControl::STATIC_CONFIG)
        .map_err(|e| format!("start instance failed: {}", e))?;
    // 璁㈤槄瀹炰緥浜嬩欢
    if let Some(instance) = MANAGER.instance(instance_id) {
        if let Some(events) = subscribe_native_instance_event(&instance) {
            handle_event(events);
        }
    }
    println!("instance {} started", name);
    // 灏嗗疄渚?ID 瀛樺偍鍒?CURRENT_ID 涓?    let mut instance_guard = CURRENT_ID.write().await;
    *instance_guard = Some(instance_id);
    if !had_instance {
        println!("瀹炰緥宸叉垚鍔熷偍瀛?);
    } else {
        println!("缃戠粶瀹炰緥宸插瓨鍦?);
    }
    print!("鎴愬姛鍌ㄥ瓨");

    Ok(())
}

// 杩斿洖EasyTier鐨勭増鏈彿
pub fn easytier_version() -> Result<String, String> {
    Ok(easytier::VERSION.to_string())
}

// 鏄惁鍦ㄨ繍琛?pub async fn is_easytier_running() -> bool {
    let instance = CURRENT_ID.read().await;
    instance.is_some()
}
// 瀹氫箟鑺傜偣璺宠穬缁熻淇℃伅缁撴瀯浣?pub struct NodeHopStats {
    pub peer_id: u32,
    pub target_ip: String, // 鐩爣鑺傜偣IP
    pub latency_ms: f64,   // 寤惰繜(姣)
    pub packet_loss: f32,  // 涓㈠寘鐜?    pub node_name: String, // 鑺傜偣鍚嶇О
}

// 瀹氫箟鑺傜偣杩炴帴缁熻淇℃伅缁撴瀯浣?pub struct KVNodeConnectionStats {
    pub conn_type: String, // 杩炴帴绫诲瀷
    pub rx_bytes: u64,
    pub tx_bytes: u64,
    pub rx_packets: u64,
    pub tx_packets: u64,
}
// 瀹氫箟鑺傜偣淇℃伅缁撴瀯浣?pub struct KVNodeInfo {
    pub peer_id: u32,
    pub hostname: String,
    pub ipv4: String,
    pub latency_ms: f64,
    pub nat: String, // NAT绫诲瀷
    // NodeHopStats 鍒楄〃 浠庤繎鍒拌繙
    pub hops: Vec<NodeHopStats>,
    pub loss_rate: f32,
    pub connections: Vec<KVNodeConnectionStats>,

    pub tunnel_proto: String,
    pub conn_type: String, // 杩炴帴绫诲瀷
    pub rx_bytes: u64,
    pub tx_bytes: u64,

    pub version: String,
    pub cost: i32,
    pub proxy_cidrs: Vec<String>,
}
// 瀹氫箟鑺傜偣缃戠粶鐘舵€佺粨鏋勪綋
pub struct KVNetworkStatus {
    pub total_nodes: usize,
    pub nodes: Vec<KVNodeInfo>,
}

async fn current_running_info() -> Option<easytier::proto::api::manage::NetworkInstanceRunningInfo> {
    let guard = CURRENT_ID.read().await;
    let id = (*guard)?;
    MANAGER.network_info(id).await
}

// 鑾峰彇缃戠粶涓墍鏈夎妭鐐圭殑IP鍦板潃鍒楄〃
pub async fn get_ips() -> Vec<String> {
    let mut result = Vec::new();

    // Lock the mutex and access the instance if it exists
    if let Some(info) = current_running_info().await {
            // Add all remote node IPs
            for route in &info.routes {
                if let Some(ipv4_addr) = &route.ipv4_addr {
                    if let Some(addr) = &ipv4_addr.address {
                        let ip = format!(
                            "{}.{}.{}.{}/{}",
                            (addr.addr >> 24) & 0xFF,
                            (addr.addr >> 16) & 0xFF,
                            (addr.addr >> 8) & 0xFF,
                            addr.addr & 0xFF,
                            ipv4_addr.network_length
                        );
                        // Avoid duplicates
                        if !result.contains(&ip) {
                            result.push(ip);
                        }
                    }
                }
            }
    }

    result
}

// 璁剧疆TUN璁惧鐨勬枃浠舵弿杩扮
pub async fn set_tun_fd(fd: i32) -> Result<(), String> {
    let guard = CURRENT_ID.read().await;
    let id = guard
        .as_ref()
        .ok_or_else(|| "No instance available".to_string())?;
    MANAGER
        .attach_tun_fd(*id, fd)
        .map_err(|e| format!("failed to send tun fd: {}", e))?;
    Ok(())
}

pub async fn get_running_info() -> String {
    if let Some(info) = current_running_info().await {
        return serde_json::to_string(&json!({
            "dev_name": info.dev_name,
            "my_node_info": info.my_node_info.as_ref().map(|node| json!({
                "virtual_ipv4": node.virtual_ipv4.as_ref().map(|addr| json!({
                    "address": addr.address.as_ref().map(|a| json!({ "addr": a.addr })),
                })),
            })),
            "routes": info.routes,
            "peer_route_pairs": info.peer_route_pairs,
        }))
        .unwrap_or_else(|_| "null".to_string());
    }
    "null".to_string()
}

pub struct FlagsC {
    pub default_protocol: String,
    pub dev_name: String,
    pub enable_encryption: bool,
    pub enable_ipv6: bool,
    pub mtu: u32,
    pub latency_first: bool,
    pub enable_exit_node: bool,
    pub no_tun: bool,
    pub use_smoltcp: bool,
    pub relay_network_whitelist: String,
    pub disable_p2p: bool,
    pub enable_udp_broadcast_relay: bool,
    pub relay_all_peer_rpc: bool,
    pub disable_udp_hole_punching: bool,
    pub disable_tcp_hole_punching: bool,
    pub multi_thread: bool,
    pub data_compress_algo: i32,
    pub bind_device: bool,
    pub enable_kcp_proxy: bool,
    pub disable_kcp_input: bool,
    pub disable_relay_kcp: bool,
    pub proxy_forward_by_system: bool,
    pub accept_dns: bool,
    pub private_mode: bool,
    pub enable_quic_proxy: bool,
    pub disable_quic_input: bool,
    pub disable_sym_hole_punching: bool,
    pub tcp_whitelist: String,
    pub udp_whitelist: String,
    /// SOCKS5 鐩戝惉绔彛锛? 琛ㄧず绂佺敤
    pub socks5_port: u16,
}

pub struct Forward {
    pub bind_addr: String,
    pub dst_addr: String,
    pub proto: String,
}

// 鍒涘缓鏈嶅姟鍣?pub fn create_server(
    username: String,
    enable_dhcp: bool,
    specified_ip: String,
    room_name: String,
    room_password: String,
    severurl: Vec<String>,
    onurl: Vec<String>,
    cidrs: Vec<String>,
    forwards: Vec<Forward>,
    flag: FlagsC,
) -> JoinHandle<Result<(), String>> {
    print!("{}", format!("鍒涘缓鏈嶅姟鍣? {}锛屽惎鐢―HCP: {}, 鎸囧畾IP: {}, 鎴块棿鍚嶇О: {}, 鎴块棿瀵嗙爜: {}, 鏈嶅姟鍣║RL: {:?}, 鐩戝惉鍣║RL: {:?}", username, enable_dhcp, specified_ip, room_name, room_password, severurl, onurl));
    RT.spawn(async move {
        // Create config with better error handling
        let cfg = TomlConfigLoader::default();

        // Set listeners with proper error handling
        let mut listeners = Vec::new();
        for url in onurl {
            match url.parse() {
                Ok(parsed) => listeners.push(parsed),
                Err(e) => return Err(format!("Invalid listener URL: {}, error: {}", url, e)),
            }
        }
        cfg.set_listeners(listeners);

        // Set hostname and other settings
        cfg.set_hostname(Some(username));
        cfg.set_dhcp(enable_dhcp);
        for c in cidrs {
            let _ = cfg.add_proxy_cidr(c.parse().unwrap(), None);
        }
        let mut old = cfg.get_port_forwards();

        for c in forwards {
            // 鎵撳嵃
            println!(
                "{}",
                format!(
                    "娣诲姞绔彛杞彂: {} -> {} -{}",
                    c.bind_addr, c.dst_addr, c.proto
                )
            );
            let port_forward_item = PortForwardConfig {
                bind_addr: c.bind_addr.parse().unwrap(),
                dst_addr: c.dst_addr.parse().unwrap(),
                proto: c.proto,
            };
            old.push(port_forward_item);
        }

        cfg.set_port_forwards(old);
        // Set flags more efficiently by directly mapping from input
        let mut flags = cfg.get_flags();
        flags.default_protocol = flag.default_protocol;
        flags.dev_name = "astral".to_string();
        flags.enable_encryption = flag.enable_encryption;
        flags.enable_ipv6 = flag.enable_ipv6;
        flags.latency_first = flag.latency_first;
        flags.no_tun = flag.no_tun;
        flags.use_smoltcp = flag.use_smoltcp;
        flags.relay_network_whitelist = flag.relay_network_whitelist;
        flags.disable_p2p = flag.disable_p2p;
        flags.enable_udp_broadcast_relay = flag.enable_udp_broadcast_relay;
        flags.relay_all_peer_rpc = flag.relay_all_peer_rpc;
        flags.disable_udp_hole_punching = flag.disable_udp_hole_punching;
        flags.disable_tcp_hole_punching = flag.disable_tcp_hole_punching;
        flags.multi_thread = flag.multi_thread;
        flags.data_compress_algo = flag.data_compress_algo;
        flags.bind_device = flag.bind_device;
        flags.enable_kcp_proxy = flag.enable_kcp_proxy;
        flags.disable_kcp_input = flag.disable_kcp_input;
        flags.disable_relay_kcp = flag.disable_relay_kcp;
        flags.proxy_forward_by_system = flag.proxy_forward_by_system;

        flags.private_mode = flag.private_mode;
        flags.enable_quic_proxy = flag.enable_quic_proxy;
        flags.disable_quic_input = flag.disable_quic_input;
        flags.disable_sym_hole_punching = flag.disable_sym_hole_punching;
        cfg.set_flags(flags);

        if flag.socks5_port > 0 {
            let portal = format!("socks5://127.0.0.1:{}", flag.socks5_port);
            match portal.parse() {
                Ok(url) => cfg.set_socks5_portal(Some(url)),
                Err(e) => return Err(format!("Invalid SOCKS5 portal: {}, error: {}", portal, e)),
            }
        }

        // Set port whitelists
        if !flag.tcp_whitelist.is_empty() {
            let tcp_ports: Vec<String> = flag
                .tcp_whitelist
                .split(',')
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .collect();
            cfg.set_tcp_whitelist(tcp_ports);
        }
        if !flag.udp_whitelist.is_empty() {
            let udp_ports: Vec<String> = flag
                .udp_whitelist
                .split(',')
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .collect();
            cfg.set_udp_whitelist(udp_ports);
        }

        // Configure peer connections with proper error handling
        let mut peer_configs = Vec::new();
        for url in severurl {
            match url.parse() {
                Ok(uri) => peer_configs.push(PeerConfig {
                    uri,
                    peer_public_key: None,
                }),
                Err(e) => return Err(format!("Invalid server URL: {}, error: {}", url, e)),
            }
        }
        cfg.set_peers(peer_configs);

        // Set IP if DHCP is disabled
        if !enable_dhcp && !specified_ip.is_empty() {
            let ip_str = format!("{}/24", specified_ip);
            match ip_str.parse() {
                Ok(ip) => cfg.set_ipv4(Some(ip)),
                Err(e) => {
                    return Err(format!(
                        "Invalid IP address: {}, error: {}",
                        specified_ip, e
                    ))
                }
            }
        }

        // Set network identity
        cfg.set_network_identity(NetworkIdentity::new(room_name, room_password));

        // 鐩存帴鍚姩缃戠粶瀹炰緥锛屾棤闇€宓屽 spawn
        create_and_store_network_instance(cfg).await
    })
}

// 鍏抽棴鏈嶅姟鍣ㄥ疄渚?pub fn close_server() {
    RT.spawn(async {
        // 鑾峰彇mutex閿?        let mut locked_instance = CURRENT_ID.write().await;

        println!(
            "鍏抽棴鍓嶅疄渚嬬姸鎬? {}",
            if locked_instance.is_some() {
                "瀛樺湪"
            } else {
                "涓嶅瓨鍦?
            }
        ); // 娣诲姞鍏抽棴鍓嶆棩蹇?
        // 濡傛灉瀹炰緥瀛樺湪锛屽垯鍒犻櫎瀹?        if let Some(id) = locked_instance.take() {
            println!("姝ｅ湪鍏抽棴瀹炰緥");
            let _ = MANAGER.delete_network_instances(vec![id]).await;
            println!("瀹炰緥宸叉垚鍔熷叧闂?);
        } else {
            println!("娌℃湁鎵惧埌闇€瑕佸叧闂殑瀹炰緥");
        }

        println!(
            "鍏抽棴鍚庡疄渚嬬姸鎬? {}",
            if locked_instance.is_some() {
                "瀛樺湪"
            } else {
                "涓嶅瓨鍦?
            }
        ); // 娣诲姞鍏抽棴鍚庢棩蹇?    });
}

// 鍒涘缓涓€涓綉鍗¤穬鐐规暟鎹粨鏋?// 缃戝崱璺冪偣鏁版嵁缁撴瀯

pub async fn get_peer_route_pairs() -> Result<Vec<PeerRoutePair>, String> {
    if let Some(info) = current_running_info().await {
                let mut pairs = info.peer_route_pairs;
                // 濡傛灉瀛樺湪鏈湴鑺傜偣淇℃伅锛屾坊鍔犲埌缁撴灉涓?                if let Some(my_node_info) = &info.my_node_info {
                    // 鑾峰彇鏈湴鑺傜偣ID
                    // 娉ㄦ剰锛氳繖閲岀殑閫昏緫鍙兘闇€瑕佹牴鎹崟渚嬫ā寮忚皟鏁达紝鍋囪鏈湴鑺傜偣淇℃伅鍙互鐩存帴浠?info 涓幏鍙?                    // 浣跨敤鍘熷閫昏緫鏌ユ壘鏈湴 peer_id
                    let my_peer_id = info
                        .peers
                        .iter()
                        .find(|p| p.conns.iter().any(|c| !c.is_client))
                        .map(|p| p.peer_id)
                        .unwrap_or(0);

                    // 鍒涘缓涓€涓〃绀烘湰鍦拌妭鐐圭殑Route
                    let my_route = proto::api::instance::Route {
                        peer_id: my_peer_id,
                        ipv4_addr: my_node_info.virtual_ipv4.clone(),
                        ipv6_addr: None, // 娣诲姞ipv6鍦板潃瀛楁,鐩墠鏆備笉鏀寔ipv6
                        next_hop_peer_id: my_peer_id, // 鎸囧悜鑷繁
                        cost: 0,         // 鍒拌嚜宸辩殑鎴愭湰涓?
                        path_latency: 0, // 鍒拌嚜宸辩殑寤惰繜涓?
                        proxy_cidrs: vec![],
                        hostname: my_node_info.hostname.clone(),
                        stun_info: my_node_info.stun_info.clone(),
                        inst_id: "local".to_string(), // 鏍囪涓烘湰鍦板疄渚?                        version: my_node_info.version.clone(),
                        feature_flag: None, // 鏈湴鑺傜偣閫氬父娌℃湁鐗规€ф爣蹇?                        next_hop_peer_id_latency_first: None,
                        cost_latency_first: None,
                        path_latency_latency_first: None,
                    };

                    // 鍒涘缓涓€涓〃绀烘湰鍦拌妭鐐圭殑PeerInfo锛屽寘鍚綉缁滅粺璁′俊鎭?                    // 娉ㄦ剰锛氭湰鍦拌妭鐐圭殑PeerInfo鍙兘闇€瑕佺壒娈婂鐞嗘垨浠庡叾浠栧湴鏂硅幏鍙?                    let my_peer_info = info.peers.iter().find(|p| p.peer_id == my_peer_id).cloned();

                    // 鍒涘缓涓€涓〃绀烘湰鍦拌妭鐐圭殑PeerRoutePair
                    let my_pair = proto::api::instance::PeerRoutePair {
                        route: Some(my_route),
                        peer: my_peer_info, // 浣跨敤鎵惧埌鐨凱eerInfo鎴朜one
                    };

                    // 娣诲姞鍒扮粨鏋滀腑
                    pairs.push(my_pair);
                }

                return Ok(pairs);
    } else {
        Err("娌℃湁杩愯涓殑缃戠粶瀹炰緥".to_string())
    }
}

// 鑾峰彇缃戠粶鐘舵€佷俊鎭?pub async fn get_network_status() -> KVNetworkStatus {
    let pairs = get_peer_route_pairs().await.unwrap_or_default();

    // 鎻愬墠鑾峰彇杩愯淇℃伅
    let running_info = current_running_info().await;
    let local_peer_id = running_info
        .as_ref()
        .and_then(|info| {
            info.peers
                .iter()
                .find(|p| p.conns.iter().any(|c| !c.is_client))
                .map(|p| p.peer_id)
        })
        .unwrap_or(0);

    let mut nodes = Vec::new();
    for pair in pairs.iter() {
        if let Some(route) = &pair.route {
            let cost = route.cost;
            // 浣跨敤 get_running_info 涓殑閫昏緫鏉ヨ幏鍙朓Pv4鍦板潃
            let ipv4 = route
                .ipv4_addr
                .as_ref()
                .and_then(|addr| addr.address.as_ref())
                .map(|a| {
                    format!(
                        "{}.{}.{}.{}",
                        (a.addr >> 24) & 0xFF,
                        (a.addr >> 16) & 0xFF,
                        (a.addr >> 8) & 0xFF,
                        a.addr & 0xFF
                    )
                })
                .unwrap_or_else(|| "0.0.0.0".to_string());
            let mut node_info = KVNodeInfo {
                peer_id: route.peer_id,
                hostname: route.hostname.clone(),

                hops: {
                    // 鏂板缓閫掑綊鍑芥暟鏀堕泦瀹屾暣璺緞
                    fn collect_hops(
                        pairs: &[PeerRoutePair],
                        current_peer_id: u32,
                        mut path: Vec<NodeHopStats>,
                        visited: &mut std::collections::HashSet<u32>,
                    ) -> Vec<NodeHopStats> {
                        if visited.contains(&current_peer_id) {
                            return path;
                        }
                        visited.insert(current_peer_id);

                        // 鏌ユ壘褰撳墠鑺傜偣鐨勪俊鎭?                        if let Some(pair) = pairs.iter().find(|p| {
                            p.route
                                .as_ref()
                                .map_or(false, |r| r.peer_id == current_peer_id)
                        }) {
                            if let Some(route) = &pair.route {
                                // 鑾峰彇IP鍦板潃
                                let ip = route
                                    .ipv4_addr
                                    .as_ref()
                                    .and_then(|addr| addr.address.as_ref())
                                    .map(|a| {
                                        format!(
                                            "{}.{}.{}.{}",
                                            (a.addr >> 24) & 0xFF,
                                            (a.addr >> 16) & 0xFF,
                                            (a.addr >> 8) & 0xFF,
                                            a.addr & 0xFF
                                        )
                                    })
                                    .unwrap_or_default();

                                // 璁＄畻寤惰繜鍜屼涪鍖呯巼
                                let (latency, loss) = pair.peer.as_ref().map_or((0.0, 0.0), |p| {
                                    let min_latency = p
                                        .conns
                                        .iter()
                                        .filter_map(|c| c.stats.as_ref().map(|s| s.latency_us))
                                        .min()
                                        .unwrap_or(0)
                                        as f64
                                        / 1000.0;

                                    let avg_loss = p.conns.iter().map(|c| c.loss_rate).sum::<f32>()
                                        / p.conns.len().max(1) as f32;

                                    (min_latency, avg_loss as f64)
                                });

                                // 娣诲姞褰撳墠鑺傜偣鍒拌矾寰?                                path.push(NodeHopStats {
                                    peer_id: current_peer_id,
                                    target_ip: ip,
                                    latency_ms: latency,
                                    packet_loss: loss as f32,
                                    node_name: route.hostname.clone(),
                                });

                                // 濡傛灉涓嬩竴璺充笉鏄嚜宸憋紝缁х画閫掑綊
                                if route.next_hop_peer_id != current_peer_id
                                    && route.next_hop_peer_id != 0
                                {
                                    // 鏌ユ壘涓嬩竴璺宠妭鐐?                                    return collect_hops(
                                        pairs,
                                        route.next_hop_peer_id,
                                        path,
                                        visited,
                                    );
                                }
                            }
                        }
                        path
                    }

                    // 浣跨敤璺敱琛ㄤ腑鐨刵ext_hop_peer_id鏋勫缓瀹屾暣璺緞
                    let mut hops = Vec::new();
                    if let Some(route) = &pair.route {
                        let mut visited = std::collections::HashSet::new();
                        let target_ip = route
                            .ipv4_addr
                            .as_ref()
                            .and_then(|addr| addr.address.as_ref())
                            .map(|a| {
                                format!(
                                    "{}.{}.{}.{}",
                                    (a.addr >> 24) & 0xFF,
                                    (a.addr >> 16) & 0xFF,
                                    (a.addr >> 8) & 0xFF,
                                    a.addr & 0xFF
                                )
                            })
                            .unwrap_or_default();

                        // 浠庡綋鍓嶈妭鐐瑰紑濮嬶紝鏀堕泦鍒扮洰鏍囪妭鐐圭殑瀹屾暣璺緞
                        // 鍏堟坊鍔犳湰鍦拌妭鐐逛俊鎭?                        if let Some(info) = &running_info {
                            if let Some(local_node) = &info.my_node_info {
                                // 娣诲姞鏈湴鑺傜偣浣滀负璧风偣
                                hops.push(NodeHopStats {
                                    peer_id: local_peer_id,
                                    target_ip: local_node
                                        .virtual_ipv4
                                        .as_ref()
                                        .and_then(|addr| addr.address.as_ref())
                                        .map(|a| {
                                            format!(
                                                "{}.{}.{}.{}",
                                                (a.addr >> 24) & 0xFF,
                                                (a.addr >> 16) & 0xFF,
                                                (a.addr >> 8) & 0xFF,
                                                a.addr & 0xFF
                                            )
                                        })
                                        .unwrap_or_else(|| local_node.hostname.clone()),
                                    latency_ms: 0.0,
                                    packet_loss: 0.0,
                                    node_name: local_node.hostname.clone(),
                                });

                                // 鏌ユ壘浠庢湰鍦板埌鐩爣鑺傜偣鐨勮矾鐢?                                if let Some(local_route) =
                                    info.routes.iter().find(|r| r.peer_id == route.peer_id)
                                {
                                    // 鏀堕泦涓棿鑺傜偣
                                    let mut next_hops = collect_hops(
                                        pairs.as_slice(),
                                        local_route.next_hop_peer_id,
                                        Vec::new(),
                                        &mut visited,
                                    );
                                    hops.append(&mut next_hops);

                                    // 纭繚鐩爣鑺傜偣琚坊鍔犲埌璺緞涓?                                    // 妫€鏌ユ渶鍚庝竴涓妭鐐规槸鍚︽槸鐩爣鑺傜偣
                                    let last_node_is_target = hops.last().map_or(false, |last| {
                                        // 姣旇緝鐩爣IP
                                        last.target_ip == target_ip
                                    });

                                    // 濡傛灉鏈€鍚庝竴涓妭鐐逛笉鏄洰鏍囪妭鐐癸紝鍒欐坊鍔犵洰鏍囪妭鐐?                                    if !last_node_is_target && !visited.contains(&route.peer_id) {
                                        let (latency, loss) =
                                            pair.peer.as_ref().map_or((0.0, 0.0), |p| {
                                                let min_latency = p
                                                    .conns
                                                    .iter()
                                                    .filter_map(|c| {
                                                        c.stats.as_ref().map(|s| s.latency_us)
                                                    })
                                                    .min()
                                                    .unwrap_or(0)
                                                    as f64
                                                    / 1000.0;

                                                let avg_loss = p
                                                    .conns
                                                    .iter()
                                                    .map(|c| c.loss_rate)
                                                    .sum::<f32>()
                                                    / p.conns.len().max(1) as f32;

                                                (min_latency, avg_loss as f64)
                                            });

                                        hops.push(NodeHopStats {
                                            peer_id: route.peer_id,
                                            target_ip: target_ip.clone(),
                                            latency_ms: latency,
                                            packet_loss: loss as f32,
                                            node_name: route.hostname.clone(),
                                        });
                                    }
                                }
                            }
                        }

                        // 濡傛灉娌℃湁鏀堕泦鍒颁换浣曡烦鐐癸紙鍙兘鏄洿杩炶妭鐐癸級锛屽垯鐩存帴娣诲姞鐩爣鑺傜偣
                        // 妫€鏌?hops 鏄惁鍙寘鍚湰鍦拌妭鐐?                        if hops.len() <= 1 {
                            // 纭繚鐩爣鑺傜偣涓嶅湪hops涓紙閬垮厤閲嶅娣诲姞锛?                            if !hops.iter().any(|h| h.target_ip == target_ip) {
                                let (latency, loss) = pair.peer.as_ref().map_or((0.0, 0.0), |p| {
                                    let min_latency = p
                                        .conns
                                        .iter()
                                        .filter_map(|c| c.stats.as_ref().map(|s| s.latency_us))
                                        .min()
                                        .unwrap_or(0)
                                        as f64
                                        / 1000.0;

                                    let avg_loss = p.conns.iter().map(|c| c.loss_rate).sum::<f32>()
                                        / p.conns.len().max(1) as f32;

                                    (min_latency, avg_loss as f64)
                                });

                                hops.push(NodeHopStats {
                                    peer_id: route.peer_id,
                                    target_ip: target_ip,
                                    latency_ms: latency,
                                    packet_loss: loss as f32,
                                    node_name: route.hostname.clone(),
                                });
                            }
                        }
                    }
                    hops
                },
                latency_ms: if route.cost == 1 {
                    pair.get_latency_ms().unwrap_or(0.0)
                } else {
                    route.path_latency_latency_first() as f64
                },
                ipv4: ipv4,

                loss_rate: if let Some(peer) = &pair.peer {
                    let mut total_loss_rate = 0.0;
                    for conn in &peer.conns {
                        total_loss_rate += conn.loss_rate;
                    }
                    total_loss_rate
                } else {
                    0.0 // 濡傛灉娌℃湁杩炴帴淇℃伅锛岄粯璁や负0
                },
                nat: route.stun_info.as_ref().map_or_else(
                    || "Unknown".to_string(),
                    |stun| {
                        // 浣跨敤NatType鏋氫妇鏇夸唬鐩存帴鍖归厤鏁板瓧
                        let nat_type =
                            NatType::try_from(stun.udp_nat_type).unwrap_or(NatType::Unknown);
                        // println!("udp{:?}", NatType::try_from(stun.udp_nat_type).unwrap_or(NatType::Unknown));
                        // println!("tcp{:?}", NatType::try_from(stun.tcp_nat_type).unwrap_or(NatType::Unknown));
                        format!("{:?}", nat_type)
                    },
                ),
                connections: Vec::new(),
                version: route.version.clone(),
                cost,
                conn_type: pair.get_udp_nat_type(),
                tunnel_proto: pair
                    .get_conn_protos()
                    .unwrap_or_default()
                    .join(",")
                    .to_string(),
                rx_bytes: pair.get_rx_bytes().unwrap_or_default(),
                tx_bytes: pair.get_tx_bytes().unwrap_or_default(),
                proxy_cidrs: route.proxy_cidrs.clone(),
            };

            // 鏀堕泦杩炴帴缁熻淇℃伅
            if let Some(peer) = &pair.peer {
                for conn in &peer.conns {
                    if let Some(stats) = &conn.stats {
                        let conn_type = if let Some(tunnel) = &conn.tunnel {
                            tunnel.tunnel_type.clone()
                        } else {
                            "鏈煡".to_string()
                        };

                        node_info.connections.push(KVNodeConnectionStats {
                            conn_type,
                            rx_bytes: stats.rx_bytes,
                            tx_bytes: stats.tx_bytes,
                            rx_packets: stats.rx_packets,
                            tx_packets: stats.tx_packets,
                        });
                    }
                }
            }

            nodes.push(node_info);
        }
    }

    KVNetworkStatus {
        total_nodes: nodes.len(),
        nodes,
    }
}

pub fn init_app() {
    lazy_static::initialize(&RT);
}