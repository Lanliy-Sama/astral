use easytier::common::stun::StunInfoCollector;
use easytier::proto::common::NatType as EasyNatType;
use std::collections::BTreeSet;
use std::net::SocketAddr;
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::net::{UdpSocket, lookup_host};
use tokio::sync::{Mutex, broadcast};
use tokio::task::JoinSet;
use anyhow::Context;
use bytecodec::{DecodeExt, EncodeExt};
use stun_codec::rfc5389::methods::BINDING;
use stun_codec::{Message, MessageClass, MessageDecoder, MessageEncoder};

// EasyTier 2.7.0 no longer re-exports `UdpNatTypeDetector` from
// `easytier::common::stun`; the replacement is built on runtime-generic
// APIs that cannot be constructed outside the easytier facade. The
// self-contained 2.6.4 implementation (stun_codec_ext.rs plus the UDP
// parts of common/stun.rs) is inlined below so the NAT test keeps
// working. `rand` is avoided on purpose: astral resolves rand 0.8 on
// some targets and 0.9 on windows, so the port uses first-N host
// selection and an atomic-counter/monotonic transaction id instead.

mod stun_ext {
    #![allow(dead_code)]

    use std::net::SocketAddr;

    use bytecodec::fixnum::{U32beDecoder, U32beEncoder};
    use stun_codec::net::{SocketAddrDecoder, SocketAddrEncoder, socket_addr_xor};

    use stun_codec::rfc5389::attributes::{
        MappedAddress, Software, XorMappedAddress, XorMappedAddress2,
    };
    use stun_codec::rfc5780::attributes::{OtherAddress, ResponseOrigin};
    use stun_codec::{AttributeType, Message, TransactionId, define_attribute_enums};

    use bytecodec::{ByteCount, Decode, Encode, Eos, Result, SizedEncode, TryTaggedDecode};

    use stun_codec::macros::track;

    macro_rules! impl_decode {
        ($decoder:ty, $item:ident, $and_then:expr) => {
            impl Decode for $decoder {
                type Item = $item;

                fn decode(&mut self, buf: &[u8], eos: Eos) -> Result<usize> {
                    track!(self.0.decode(buf, eos))
                }

                fn finish_decoding(&mut self) -> Result<Self::Item> {
                    track!(self.0.finish_decoding()).and_then($and_then)
                }

                fn requiring_bytes(&self) -> ByteCount {
                    self.0.requiring_bytes()
                }

                fn is_idle(&self) -> bool {
                    self.0.is_idle()
                }
            }
            impl TryTaggedDecode for $decoder {
                type Tag = AttributeType;

                fn try_start_decoding(&mut self, attr_type: Self::Tag) -> Result<bool> {
                    Ok(attr_type.as_u16() == $item::CODEPOINT)
                }
            }
        };
    }

    macro_rules! impl_encode {
        ($encoder:ty, $item:ty, $map_from:expr) => {
            impl Encode for $encoder {
                type Item = $item;

                fn encode(&mut self, buf: &mut [u8], eos: Eos) -> Result<usize> {
                    track!(self.0.encode(buf, eos))
                }

                #[allow(clippy::redundant_closure_call)]
                fn start_encoding(&mut self, item: Self::Item) -> Result<()> {
                    track!(self.0.start_encoding($map_from(item)))
                }

                fn requiring_bytes(&self) -> ByteCount {
                    self.0.requiring_bytes()
                }

                fn is_idle(&self) -> bool {
                    self.0.is_idle()
                }
            }
            impl SizedEncode for $encoder {
                fn exact_requiring_bytes(&self) -> u64 {
                    self.0.exact_requiring_bytes()
                }
            }
        };
    }

    #[derive(Debug, Clone, PartialEq, Eq, Hash)]
    pub struct ChangedAddress(SocketAddr);
    impl ChangedAddress {
        /// The codepoint of the type of the attribute.
        pub const CODEPOINT: u16 = 0x0005;

        pub fn new(addr: SocketAddr) -> Self {
            ChangedAddress(addr)
        }

        /// Returns the address of this instance.
        pub fn address(&self) -> SocketAddr {
            self.0
        }
    }
    impl stun_codec::Attribute for ChangedAddress {
        type Decoder = ChangedAddressDecoder;
        type Encoder = ChangedAddressEncoder;

        fn get_type(&self) -> AttributeType {
            AttributeType::new(Self::CODEPOINT)
        }

        fn before_encode<A: stun_codec::Attribute>(
            &mut self,
            message: &Message<A>,
        ) -> bytecodec::Result<()> {
            self.0 = socket_addr_xor(self.0, message.transaction_id());
            Ok(())
        }

        fn after_decode<A: stun_codec::Attribute>(
            &mut self,
            message: &Message<A>,
        ) -> bytecodec::Result<()> {
            self.0 = socket_addr_xor(self.0, message.transaction_id());
            Ok(())
        }
    }

    #[derive(Debug, Default)]
    pub struct ChangedAddressDecoder(SocketAddrDecoder);
    impl ChangedAddressDecoder {
        pub fn new() -> Self {
            Self::default()
        }
    }
    impl_decode!(ChangedAddressDecoder, ChangedAddress, |item| Ok(
        ChangedAddress(item)
    ));

    #[derive(Debug, Default)]
    pub struct ChangedAddressEncoder(SocketAddrEncoder);
    impl ChangedAddressEncoder {
        pub fn new() -> Self {
            Self::default()
        }
    }
    impl_encode!(ChangedAddressEncoder, ChangedAddress, |item: Self::Item| {
        item.0
    });

    #[derive(Debug, Clone, PartialEq, Eq, Hash)]
    pub struct SourceAddress(SocketAddr);
    impl SourceAddress {
        /// The codepoint of the type of the attribute.
        pub const CODEPOINT: u16 = 0x0004;

        pub fn new(addr: SocketAddr) -> Self {
            SourceAddress(addr)
        }

        /// Returns the address of this instance.
        pub fn address(&self) -> SocketAddr {
            self.0
        }
    }
    impl stun_codec::Attribute for SourceAddress {
        type Decoder = SourceAddressDecoder;
        type Encoder = SourceAddressEncoder;

        fn get_type(&self) -> AttributeType {
            AttributeType::new(Self::CODEPOINT)
        }

        fn before_encode<A: stun_codec::Attribute>(
            &mut self,
            message: &Message<A>,
        ) -> bytecodec::Result<()> {
            self.0 = socket_addr_xor(self.0, message.transaction_id());
            Ok(())
        }

        fn after_decode<A: stun_codec::Attribute>(
            &mut self,
            message: &Message<A>,
        ) -> bytecodec::Result<()> {
            self.0 = socket_addr_xor(self.0, message.transaction_id());
            Ok(())
        }
    }

    #[derive(Debug, Default)]
    pub struct SourceAddressDecoder(SocketAddrDecoder);
    impl SourceAddressDecoder {
        pub fn new() -> Self {
            Self::default()
        }
    }
    impl_decode!(SourceAddressDecoder, SourceAddress, |item| Ok(
        SourceAddress(item)
    ));

    #[derive(Debug, Default)]
    pub struct SourceAddressEncoder(SocketAddrEncoder);
    impl SourceAddressEncoder {
        pub fn new() -> Self {
            Self::default()
        }
    }
    impl_encode!(SourceAddressEncoder, SourceAddress, |item: Self::Item| {
        item.0
    });

    /// `CHANGE-REQUEST` attribute.
    ///
    /// See [RFC 5780 -- 7.2. CHANGE-REQUEST] about this attribute.
    ///
    /// [RFC 5780 -- 7.2. CHANGE-REQUEST]: https://tools.ietf.org/html/rfc5780#section-7.2
    #[derive(Debug, Clone, PartialEq, Eq, Hash)]
    pub struct ChangeRequest(bool, bool);

    impl ChangeRequest {
        /// The codepoint of the type of the attribute.
        pub const CODEPOINT: u16 = 0x0003;

        /// Makes a new `ChangeRequest` instance.
        pub fn new(ip: bool, port: bool) -> Self {
            ChangeRequest(ip, port)
        }

        /// Returns whether the client requested the server to send the Binding Response with a
        /// different IP address than the one the Binding Request was received on
        pub fn ip(&self) -> bool {
            self.0
        }

        /// Returns whether the client requested the server to send the Binding Response with a
        /// different port than the one the Binding Request was received on
        pub fn port(&self) -> bool {
            self.1
        }
    }

    impl stun_codec::Attribute for ChangeRequest {
        type Decoder = ChangeRequestDecoder;
        type Encoder = ChangeRequestEncoder;

        fn get_type(&self) -> AttributeType {
            AttributeType::new(Self::CODEPOINT)
        }
    }

    /// [`ChangeRequest`] decoder.
    #[derive(Debug, Default)]
    pub struct ChangeRequestDecoder(U32beDecoder);

    impl ChangeRequestDecoder {
        /// Makes a new `ChangeRequestDecoder` instance.
        pub fn new() -> Self {
            Self::default()
        }
    }
    impl_decode!(ChangeRequestDecoder, ChangeRequest, |item| {
        Ok(ChangeRequest((item & 0x4) != 0, (item & 0x2) != 0))
    });

    /// [`ChangeRequest`] encoder.
    #[derive(Debug, Default)]
    pub struct ChangeRequestEncoder(U32beEncoder);

    impl ChangeRequestEncoder {
        /// Makes a new `ChangeRequestEncoder` instance.
        pub fn new() -> Self {
            Self::default()
        }
    }
    impl_encode!(ChangeRequestEncoder, ChangeRequest, |item: Self::Item| {
        let ip = item.0 as u8;
        let port = item.1 as u8;
        ((ip << 1 | port) << 1) as u32
    });

    pub fn tid_to_u32(tid: &TransactionId) -> u32 {
        let mut tid_buf = [0u8; 4];
        // copy bytes from msg_tid to tid_buf
        tid_buf[..].copy_from_slice(&tid.as_bytes()[8..12]);
        u32::from_le_bytes(tid_buf)
    }

    pub fn u32_to_tid(tid: u32) -> TransactionId {
        let tid_buf = tid.to_le_bytes();
        let mut tid_arr = [0u8; 12];
        tid_arr[..4].copy_from_slice(&0xdeadbeefu32.to_be_bytes());
        tid_arr[8..12].copy_from_slice(&tid_buf);
        TransactionId::new(tid_arr)
    }

    define_attribute_enums!(
        Attribute,
        AttributeDecoder,
        AttributeEncoder,
        [
            Software,
            MappedAddress,
            XorMappedAddress,
            XorMappedAddress2,
            OtherAddress,
            ChangeRequest,
            ChangedAddress,
            SourceAddress,
            ResponseOrigin
        ]
    );
}
use stun_ext::{Attribute, ChangeRequest, tid_to_u32, u32_to_tid};

static TID_SEQ: AtomicU32 = AtomicU32::new(0);

fn next_stun_tid() -> u32 {
    let seq = TID_SEQ.fetch_add(1, Ordering::Relaxed);
    let now_nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.subsec_nanos())
        .unwrap_or(0);
    now_nanos ^ seq.wrapping_mul(0x9E37_79B9)
}

struct HostResolverIter {
    hostnames: Vec<String>,
    ips: Vec<SocketAddr>,
    max_ip_per_domain: u32,
    use_ipv6: bool,
}

impl HostResolverIter {
    fn new(hostnames: Vec<String>, max_ip_per_domain: u32, use_ipv6: bool) -> Self {
        Self {
            hostnames,
            ips: vec![],
            max_ip_per_domain,
            use_ipv6,
        }
    }

    async fn next(&mut self) -> Option<SocketAddr> {
        loop {
            if !self.ips.is_empty() {
                return Some(self.ips.remove(0));
            }
            if self.hostnames.is_empty() {
                return None;
            }
            let host = self.hostnames.remove(0);
            // "txt:" entries need a DNS TXT resolver that is not available
            // here; skip them and rely on the plain host[:port] servers.
            if host.starts_with("txt:") {
                continue;
            }
            let host = if host.contains(':') {
                host
            } else {
                format!("{}:3478", host)
            };
            let resolved = lookup_host(&host).await;
            if let Ok(ips) = resolved {
                self.ips = ips
                    .filter(|x| if self.use_ipv6 { x.is_ipv6() } else { x.is_ipv4() })
                    .take(self.max_ip_per_domain as usize)
                    .collect();
            }
        }
    }
}

#[derive(Debug, Clone)]
struct StunPacket {
    data: Vec<u8>,
    addr: SocketAddr,
}

type StunPacketReceiver = broadcast::Receiver<StunPacket>;

#[derive(Debug, Clone, Copy)]
#[allow(dead_code)]
struct BindRequestResponse {
    local_addr: SocketAddr,
    stun_server_addr: SocketAddr,

    recv_from_addr: SocketAddr,
    mapped_socket_addr: Option<SocketAddr>,

    change_ip: bool,
    change_port: bool,

    real_ip_changed: bool,
    real_port_changed: bool,
}

#[derive(Debug, Clone)]
struct StunClient {
    stun_server: SocketAddr,
    resp_timeout: Duration,
    req_repeat: u32,
    socket: Arc<UdpSocket>,
    stun_packet_receiver: Arc<Mutex<StunPacketReceiver>>,
}

impl StunClient {
    fn new(
        stun_server: SocketAddr,
        socket: Arc<UdpSocket>,
        stun_packet_receiver: StunPacketReceiver,
    ) -> Self {
        Self {
            stun_server,
            resp_timeout: Duration::from_millis(3000),
            req_repeat: 2,
            socket,
            stun_packet_receiver: Arc::new(Mutex::new(stun_packet_receiver)),
        }
    }

    async fn wait_stun_response(
        &self,
        tids: &Vec<u32>,
    ) -> Result<(Message<Attribute>, SocketAddr), anyhow::Error> {
        let mut now = tokio::time::Instant::now();
        let deadline = now + self.resp_timeout;

        while now < deadline {
            let mut locked_receiver = self.stun_packet_receiver.lock().await;
            let stun_packet_raw = tokio::time::timeout(deadline - now, locked_receiver.recv())
                .await?
                .with_context(|| "recv stun packet from broadcast channel error")?;
            now = tokio::time::Instant::now();

            let (data, remote_addr) = (stun_packet_raw.data, stun_packet_raw.addr);

            if data.len() < 20 {
                continue;
            }

            let mut decoder = MessageDecoder::<Attribute>::new();
            let msg = match decoder.decode_from_bytes(&data) {
                Ok(Ok(msg)) => msg,
                _ => continue,
            };

            if msg.class() != MessageClass::SuccessResponse
                || msg.method() != BINDING
                || !tids.contains(&tid_to_u32(&msg.transaction_id()))
            {
                continue;
            }

            return Ok((msg, remote_addr));
        }

        Err(anyhow::anyhow!("timed out waiting for stun response"))
    }

    fn extract_mapped_addr(msg: &Message<Attribute>) -> Option<SocketAddr> {
        let mut mapped_addr = None;
        for x in msg.attributes() {
            match x {
                Attribute::MappedAddress(addr) if mapped_addr.is_none() => {
                    let _ = mapped_addr.insert(addr.address());
                }
                Attribute::XorMappedAddress(addr) if mapped_addr.is_none() => {
                    let _ = mapped_addr.insert(addr.address());
                }
                _ => {}
            }
        }
        mapped_addr
    }

    async fn bind_request(
        self,
        change_ip: bool,
        change_port: bool,
    ) -> Result<BindRequestResponse, anyhow::Error> {
        let stun_host = self.stun_server;
        // repeat req in case of packet loss
        let mut tids = vec![];
        for _ in 0..self.req_repeat {
            let tid = next_stun_tid();
            let mut message =
                Message::<Attribute>::new(MessageClass::Request, BINDING, u32_to_tid(tid));
            message.add_attribute(ChangeRequest::new(change_ip, change_port));

            // Encodes the message
            let mut encoder = MessageEncoder::new();
            let msg = encoder
                .encode_into_bytes(message)
                .with_context(|| "encode stun message")?;
            tids.push(tid);
            self.socket.send_to(msg.as_slice(), &stun_host).await?;
        }

        let (msg, recv_addr) = self.wait_stun_response(&tids).await?;

        let real_ip_changed = stun_host.ip() != recv_addr.ip();
        let real_port_changed = stun_host.port() != recv_addr.port();

        Ok(BindRequestResponse {
            local_addr: self.socket.local_addr()?,
            stun_server_addr: stun_host,
            recv_from_addr: recv_addr,
            mapped_socket_addr: Self::extract_mapped_addr(&msg),
            change_ip,
            change_port,

            real_ip_changed,
            real_port_changed,
        })
    }
}

struct StunClientBuilder {
    udp: Arc<UdpSocket>,
    _task_set: JoinSet<()>,
    stun_packet_sender: broadcast::Sender<StunPacket>,
}

impl StunClientBuilder {
    fn new(udp: Arc<UdpSocket>) -> Self {
        let (stun_packet_sender, _) = broadcast::channel(1024);
        let mut task_set = JoinSet::new();

        let udp_clone = udp.clone();
        let stun_packet_sender_clone = stun_packet_sender.clone();
        task_set.spawn(async move {
            let mut buf = [0; 1620];
            loop {
                let Ok((len, addr)) = udp_clone.recv_from(&mut buf).await else {
                    break;
                };
                let data = buf[..len].to_vec();
                let _ = stun_packet_sender_clone.send(StunPacket { data, addr });
            }
        });

        Self {
            udp,
            _task_set: task_set,
            stun_packet_sender,
        }
    }

    fn new_stun_client(&self, stun_server: SocketAddr) -> StunClient {
        StunClient::new(
            stun_server,
            self.udp.clone(),
            self.stun_packet_sender.subscribe(),
        )
    }
}

#[derive(Debug, Clone)]
struct StunNatTypeDetectResult {
    source_addr: SocketAddr,
    stun_resps: Vec<BindRequestResponse>,
}

impl StunNatTypeDetectResult {
    fn new(source_addr: SocketAddr, stun_resps: Vec<BindRequestResponse>) -> Self {
        Self {
            source_addr,
            stun_resps,
        }
    }

    fn has_ip_changed_resp(&self) -> bool {
        for resp in self.stun_resps.iter() {
            if resp.real_ip_changed {
                return true;
            }
        }
        false
    }

    fn has_port_changed_resp(&self) -> bool {
        for resp in self.stun_resps.iter() {
            if resp.real_port_changed {
                return true;
            }
        }
        false
    }

    fn is_open_internet(&self) -> bool {
        for resp in self.stun_resps.iter() {
            if resp.mapped_socket_addr == Some(self.source_addr) {
                return true;
            }
        }
        false
    }

    fn is_no_pat(&self) -> bool {
        for resp in self.stun_resps.iter() {
            if resp.mapped_socket_addr.map(|x| x.port()) == Some(self.source_addr.port()) {
                return true;
            }
        }
        false
    }

    fn stun_server_count(&self) -> usize {
        // find resp with distinct stun server
        self.stun_resps
            .iter()
            .map(|x| x.recv_from_addr)
            .collect::<BTreeSet<_>>()
            .len()
    }

    fn is_cone(&self) -> bool {
        // if unique mapped addr count is less than stun server count, it is cone
        let mapped_addr_count = self
            .stun_resps
            .iter()
            .filter_map(|x| x.mapped_socket_addr)
            .collect::<BTreeSet<_>>()
            .len();
        mapped_addr_count == 1
    }

    fn nat_type(&self) -> EasyNatType {
        if self.stun_server_count() < 2 {
            return EasyNatType::Unknown;
        }

        if self.is_cone() {
            if self.has_ip_changed_resp() {
                if self.is_open_internet() {
                    EasyNatType::OpenInternet
                } else if self.is_no_pat() {
                    EasyNatType::NoPat
                } else {
                    EasyNatType::FullCone
                }
            } else if self.has_port_changed_resp() {
                EasyNatType::Restricted
            } else {
                EasyNatType::PortRestricted
            }
        } else if !self.stun_resps.is_empty() {
            EasyNatType::Symmetric
        } else {
            EasyNatType::Unknown
        }
    }
}

struct UdpNatTypeDetector {
    stun_server_hosts: Vec<String>,
    max_ip_per_domain: u32,
}

impl UdpNatTypeDetector {
    fn new(stun_server_hosts: Vec<String>, max_ip_per_domain: u32) -> Self {
        Self {
            stun_server_hosts,
            max_ip_per_domain,
        }
    }

    async fn detect_nat_type(
        &self,
        source_port: u16,
    ) -> Result<StunNatTypeDetectResult, anyhow::Error> {
        let udp = Arc::new(UdpSocket::bind(format!("0.0.0.0:{}", source_port)).await?);
        self.detect_nat_type_with_socket(udp).await
    }

    async fn detect_nat_type_with_socket(
        &self,
        udp: Arc<UdpSocket>,
    ) -> Result<StunNatTypeDetectResult, anyhow::Error> {
        let mut stun_servers = vec![];
        let mut host_resolver = HostResolverIter::new(
            self.stun_server_hosts.clone(),
            self.max_ip_per_domain,
            false,
        );
        while let Some(addr) = host_resolver.next().await {
            stun_servers.push(addr);
        }

        let client_builder = StunClientBuilder::new(udp.clone());
        let mut stun_task_set = JoinSet::new();

        for stun_server in stun_servers.iter() {
            stun_task_set.spawn(
                client_builder
                    .new_stun_client(*stun_server)
                    .bind_request(false, false),
            );
            stun_task_set.spawn(
                client_builder
                    .new_stun_client(*stun_server)
                    .bind_request(false, true),
            );
            stun_task_set.spawn(
                client_builder
                    .new_stun_client(*stun_server)
                    .bind_request(true, true),
            );
        }

        let mut bind_resps = vec![];
        while let Some(resp) = stun_task_set.join_next().await {
            if let Ok(Ok(resp)) = resp {
                bind_resps.push(resp);
            }
        }

        Ok(StunNatTypeDetectResult::new(udp.local_addr()?, bind_resps))
    }
}

#[derive(Debug, Clone, PartialEq)]
pub enum NatType {
    OpenInternet,
    FullCone,
    RestrictedCone,
    PortRestrictedCone,
    Symmetric,
    SymmetricUdpFirewall,
    Blocked,
    Unknown,
}

impl NatType {
    pub fn get_description(&self) -> String {
        match self {
            NatType::OpenInternet => "Open Internet".to_string(),
            NatType::FullCone => "Full Cone NAT".to_string(),
            NatType::RestrictedCone => "Restricted Cone NAT".to_string(),
            NatType::PortRestrictedCone => "Port Restricted Cone NAT".to_string(),
            NatType::Symmetric => "Symmetric NAT".to_string(),
            NatType::SymmetricUdpFirewall => "Symmetric UDP Firewall".to_string(),
            NatType::Blocked => "UDP Blocked".to_string(),
            NatType::Unknown => "Unknown".to_string(),
        }
    }
}

#[derive(Debug, Clone)]
pub struct NetworkTestResult {
    pub nat_type_v4: String,
    pub nat_type_v6: String,
    pub ipv4_latency: i64,
    pub ipv6_latency: i64,
}

fn normalize_stun_server(input: &str) -> String {
    let mut server = input.trim().to_string();
    if server.starts_with("stun://") {
        server = server.trim_start_matches("stun://").to_string();
    }

    let has_explicit_port = if server.starts_with('[') {
        server.contains("]:")
    } else {
        server.matches(':').count() == 1
    };

    if has_explicit_port {
        server
    } else {
        format!("{}:3478", server)
    }
}

fn build_udp_stun_server_list(preferred_server: &str) -> Vec<String> {
    let mut servers = Vec::<String>::new();

    let preferred = normalize_stun_server(preferred_server);
    if !preferred.is_empty() {
        servers.push(preferred);
    }

    for default_server in StunInfoCollector::get_default_servers() {
        if !servers.contains(&default_server) {
            servers.push(default_server);
        }
    }

    servers
}

fn map_easy_nat_type(nat: EasyNatType) -> NatType {
    match nat {
        EasyNatType::OpenInternet => NatType::OpenInternet,
        EasyNatType::NoPat => NatType::OpenInternet,
        EasyNatType::FullCone => NatType::FullCone,
        EasyNatType::Restricted => NatType::RestrictedCone,
        EasyNatType::PortRestricted => NatType::PortRestrictedCone,
        EasyNatType::SymUdpFirewall => NatType::SymmetricUdpFirewall,
        EasyNatType::Symmetric | EasyNatType::SymmetricEasyInc | EasyNatType::SymmetricEasyDec => {
            NatType::Symmetric
        }
        EasyNatType::Unknown => NatType::Unknown,
    }
}

async fn detect_nat_type_ipv4(stun_server: &str) -> Result<NatType, String> {
    let stun_servers = build_udp_stun_server_list(stun_server);
    if stun_servers.is_empty() {
        return Err("No STUN servers available".to_string());
    }

    let detector = UdpNatTypeDetector::new(stun_servers, 2);
    let detect_result = tokio::time::timeout(Duration::from_secs(8), detector.detect_nat_type(0))
        .await
        .map_err(|_| "NAT detection timeout".to_string())
        .and_then(|ret| ret.map_err(|e| format!("NAT detection failed: {e}")))?;

    Ok(map_easy_nat_type(detect_result.nat_type()))
}

fn create_binding_request() -> [u8; 20] {
    let mut request = [0u8; 20];
    request[0] = 0x00;
    request[1] = 0x01; // Binding Request
    request[2] = 0x00;
    request[3] = 0x00; // Message Length
    request[4] = 0x21;
    request[5] = 0x12;
    request[6] = 0xA4;
    request[7] = 0x42; // Magic Cookie

    let now_nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    let tid_seed = now_nanos.to_be_bytes();
    request[8..20].copy_from_slice(&tid_seed[4..16]);
    request
}

fn is_success_stun_response(data: &[u8]) -> bool {
    if data.len() < 20 {
        return false;
    }

    let is_binding_success = data[0] == 0x01 && data[1] == 0x01;
    let has_magic_cookie = data[4] == 0x21 && data[5] == 0x12 && data[6] == 0xA4 && data[7] == 0x42;

    is_binding_success && has_magic_cookie
}

async fn test_udp_ipv4(stun_server: &str) -> (bool, i64, NatType) {
    let start = Instant::now();

    match detect_nat_type_ipv4(stun_server).await {
        Ok(nat_type) => (true, start.elapsed().as_millis() as i64, nat_type),
        Err(_) => (false, -1, NatType::Blocked),
    }
}

async fn test_udp_ipv6(stun_server: &str) -> (bool, i64, NatType) {
    let start = Instant::now();
    let server = normalize_stun_server(stun_server);

    let mut addrs = match tokio::net::lookup_host(&server).await {
        Ok(addrs) => addrs,
        Err(_) => return (false, -1, NatType::Unknown),
    };

    let Some(server_v6) = addrs.find(|addr| addr.is_ipv6()) else {
        return (false, -1, NatType::Unknown);
    };

    let socket = match UdpSocket::bind("[::]:0").await {
        Ok(s) => s,
        Err(_) => return (false, -1, NatType::Unknown),
    };

    let request = create_binding_request();
    if socket.send_to(&request, server_v6).await.is_err() {
        return (false, -1, NatType::Unknown);
    }

    let mut buf = [0u8; 1500];
    let recv = tokio::time::timeout(Duration::from_secs(3), socket.recv_from(&mut buf)).await;

    match recv {
        Ok(Ok((len, _))) if is_success_stun_response(&buf[..len]) => (
            true,
            start.elapsed().as_millis() as i64,
            NatType::OpenInternet,
        ),
        _ => (false, -1, NatType::Unknown),
    }
}

/// NAT test entry for Flutter.
pub fn test_network_connectivity(stun_server: String) -> Result<NetworkTestResult, String> {
    let rt =
        tokio::runtime::Runtime::new().map_err(|e| format!("Failed to create runtime: {e}"))?;

    let result = rt.block_on(async {
        let (v4, v6) = tokio::join!(test_udp_ipv4(&stun_server), test_udp_ipv6(&stun_server));

        NetworkTestResult {
            nat_type_v4: v4.2.get_description(),
            nat_type_v6: v6.2.get_description(),
            ipv4_latency: v4.1,
            ipv6_latency: v6.1,
        }
    });

    Ok(result)
}

/// Backward-compatible API: detect IPv4 NAT type.
pub fn detect_nat_type(stun_server: String) -> Result<String, String> {
    let rt =
        tokio::runtime::Runtime::new().map_err(|e| format!("Failed to create runtime: {e}"))?;

    let nat_type = rt.block_on(async { detect_nat_type_ipv4(&stun_server).await })?;
    Ok(nat_type.get_description())
}
