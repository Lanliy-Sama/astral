/**
 * 核心数据模型 — 对应 lib/core/models/*.dart
 */

/** 连接状态机 CoState { idle, connecting, connected } */
export type CoState = 'idle' | 'connecting' | 'connected'

/** 主导航 MainTab { home, room, tools, servers, settings } */
export type MainTab = 'home' | 'room' | 'tools' | 'servers' | 'settings'

/** 服务器状态 ServerStatus { online(绿), offline(红), inUse(蓝), unknown(灰) } */
export type ServerStatus = 'online' | 'offline' | 'inUse' | 'unknown'

/** 用户列表排序 UserSortOption { none=0, latency=1, nameLength=2 } */
export type UserSortOption = 'none' | 'latency' | 'nameLength'
/** 排序方向 UserSortOrder { ascending=0, descending=1 } */
export type UserSortOrder = 'ascending' | 'descending'
/** 用户显示过滤 UserDisplayMode { all=0, users=1, servers=2 } */
export type UserDisplayMode = 'all' | 'users' | 'servers'
/** 用户列表样式 UserListStyle { simple=0, detailed=1, list=2 } */
export type UserListStyle = 'simple' | 'detailed' | 'list'

/** ThemeMode { system=0, light=1, dark=2 } */
export type ThemeModeT = 'system' | 'light' | 'dark'

/** Room — Isar Room collection */
export interface Room {
  id: number
  name: string
  encrypted: boolean
  roomName: string
  password: string
  messageKey: string
  tags: string[]
  sortOrder: number
  servers: string[]
  customParam: string
  networkConfigJson: string
}

/** ServerMod — Isar ServerMod collection */
export interface ServerMod {
  id: number
  name: string
  url: string
  enable: boolean
  tcp: boolean
  faketcp: boolean
  udp: boolean
  ws: boolean
  wss: boolean
  quic: boolean
  wg: boolean
  txt: boolean
  srv: boolean
  http: boolean
  https: boolean
  sortOrder: number
}

/** 连接统计 (每条连接) */
export interface KVNodeConnectionStats {
  connType: string
  rxBytes: bigint
  txBytes: bigint
  rxPackets: bigint
  txPackets: bigint
}

/** 逐跳统计 */
export interface NodeHopStats {
  peerId: number
  targetIp: string
  latencyMs: number
  packetLoss: number
  nodeName: string
}

/** 网络节点信息 (玩家卡片数据源) */
export interface KVNodeInfo {
  peerId: number
  hostname: string
  ipv4: string
  latencyMs: number
  nat: string
  hops: NodeHopStats[]
  lossRate: number
  connections: KVNodeConnectionStats[]
  tunnelProto: string
  connType: string
  rxBytes: bigint
  txBytes: bigint
  version: string
  cost: number
  proxyCidrs: string[]
}

/** KVNetworkStatus */
export interface KVNetworkStatus {
  totalNodes: bigint
  nodes: KVNodeInfo[]
}

/** NAT 测试结果 */
export interface NetworkTestResult {
  natTypeV4: string
  natTypeV6: string
  ipv4Latency: number
  ipv6Latency: number
}

/** NetConfig — Isar 单例(id=1) 网络配置 */
export interface NetConfig {
  netns: string
  hostname: string
  instanceName: string
  ipv4: string
  dhcp: boolean
  networkName: string
  networkSecret: string
  listeners: string[]
  peer: string[]
  cidrproxy: string[]
  connectionManagers: { name: string; connections: { bindAddr: string; dstAddr: string; proto: string }[]; enabled: boolean }[]
  defaultProtocol: string
  devName: string
  enableEncryption: boolean
  enableIpv6: boolean
  mtu: number
  latencyFirst: boolean
  enableExitNode: boolean
  noTun: boolean
  enableSocks5: boolean
  socks5Port: number
  useSmoltcp: boolean
  relayNetworkWhitelist: string
  disableP2p: boolean
  enableUdpBroadcastRelay: boolean
  relayAllPeerRpc: boolean
  disableUdpHolePunching: boolean
  disableTcpHolePunching: boolean
  disableSymHolePunching: boolean
  multiThread: boolean
  dataCompressAlgo: number
  bindDevice: boolean
  enableKcpProxy: boolean
  disableKcpInput: boolean
  disableRelayKcp: boolean
  proxyForwardBySystem: boolean
  acceptDns: boolean
  privateMode: boolean
  enableQuicProxy: boolean
  disableQuicInput: boolean
  tcpWhitelist: string
  udpWhitelist: string
}

export function defaultNetConfig(): NetConfig {
  return {
    netns: '',
    hostname: '',
    instanceName: 'default',
    ipv4: '',
    dhcp: true,
    networkName: '',
    networkSecret: '',
    listeners: [],
    peer: [],
    cidrproxy: [],
    connectionManagers: [],
    defaultProtocol: 'tcp',
    devName: '',
    enableEncryption: true,
    enableIpv6: true,
    mtu: 1360,
    latencyFirst: false,
    enableExitNode: false,
    noTun: false,
    enableSocks5: false,
    socks5Port: 1080,
    useSmoltcp: false,
    relayNetworkWhitelist: '*',
    disableP2p: false,
    enableUdpBroadcastRelay: false,
    relayAllPeerRpc: false,
    disableUdpHolePunching: false,
    disableTcpHolePunching: false,
    disableSymHolePunching: false,
    multiThread: true,
    dataCompressAlgo: 1,
    bindDevice: true,
    enableKcpProxy: true,
    disableKcpInput: false,
    disableRelayKcp: true,
    proxyForwardBySystem: false,
    acceptDns: false,
    privateMode: false,
    enableQuicProxy: false,
    disableQuicInput: false,
    tcpWhitelist: '',
    udpWhitelist: '',
  }
}

/** AllSettings — Isar 单例(id=1) 应用设置 */
export interface AllSettings {
  room: number | null
  playerName: string | null
  listenList: string[]
  customVpn: string[]
  userListSimple: boolean
  userListStyle: number // -1 未迁移
  closeMinimize: boolean
  startup: boolean
  startupMinimize: boolean
  startupAutoConnect: boolean
  autoSetMTU: boolean
  beta: boolean
  autoCheckUpdate: boolean
  downloadAccelerate: string
  serverSortField: string
  sortOption: number
  sortOrder: number
  displayMode: number
  userId: string | null
  latestVersion: string | null
  enableBannerCarousel: boolean
  enableConnectionNotification: boolean
  reduceAnimationUpdates: boolean
  hasShownBannerTip: boolean
  autoRetryOnFailure: boolean
  maxRetryCount: number
  settingsSchemaVersion: number
}

export function defaultAllSettings(): AllSettings {
  return {
    room: null,
    playerName: null,
    listenList: ['tcp://0.0.0.0:0', 'udp://0.0.0.0:0'],
    customVpn: [],
    userListSimple: true,
    userListStyle: -1,
    closeMinimize: true,
    startup: false,
    startupMinimize: false,
    startupAutoConnect: false,
    autoSetMTU: true,
    beta: false,
    autoCheckUpdate: true,
    downloadAccelerate: 'auto',
    serverSortField: 'id',
    sortOption: 0,
    sortOrder: 0,
    displayMode: 0,
    userId: null,
    latestVersion: null,
    enableBannerCarousel: true,
    enableConnectionNotification: true,
    reduceAnimationUpdates: false,
    hasShownBannerTip: false,
    autoRetryOnFailure: true,
    maxRetryCount: 3,
    settingsSchemaVersion: 0,
  }
}

/** ThemeSettings — Isar 单例(id=1) */
export interface ThemeSettings {
  colorValue: number // ARGB int
  themeModeValue: ThemeModeT
}

/** NetworkConfigShare — 房间分享的可覆盖网络配置 (null=不覆盖) */
export interface NetworkConfigShare {
  dhcp: boolean | null
  proto: string | null
  enc: boolean | null
  lat: boolean | null
  dp2p: boolean | null
  dudp: boolean | null
  dtcp: boolean | null
  dsym: boolean | null
  comp: number | null
  kcp: boolean | null
  bind: boolean | null
  tun: boolean | null
}

/** MagicWall 规则组 */
export interface MagicWallGroupModel {
  id: number
  groupId: string
  name: string
  processName: string
  enabled: boolean
  autoManage: boolean
  createdAt: number | null
  updatedAt: number | null
}

/** MagicWall 规则 */
export interface MagicWallRuleModel {
  id: number
  ruleId: string
  groupId: string
  name: string
  enabled: boolean
  action: 'allow' | 'block'
  protocol: 'tcp' | 'udp' | 'both' | 'any'
  direction: 'inbound' | 'outbound' | 'both'
  appPath: string | null
  remoteIp: string | null
  localIp: string | null
  remotePort: string | null
  localPort: string | null
  description: string | null
  createdAt: number | null
  updatedAt: number | null
  priority: number
}

export interface MagicWallGroupBundle {
  group: MagicWallGroupModel
  rules: MagicWallRuleModel[]
}

export interface MagicWallStatus {
  isRunning: boolean
  activeRules: number
  totalRules: number
}

/** FlagsC — createServer 的运行时标志 (28 字段) */
export interface FlagsC {
  defaultProtocol: string
  devName: string
  enableEncryption: boolean
  enableIpv6: boolean
  mtu: number
  latencyFirst: boolean
  enableExitNode: boolean
  noTun: boolean
  useSmoltcp: boolean
  relayNetworkWhitelist: string
  disableP2P: boolean
  enableUdpBroadcastRelay: boolean
  relayAllPeerRpc: boolean
  disableUdpHolePunching: boolean
  disableTcpHolePunching: boolean
  multiThread: boolean
  dataCompressAlgo: number
  bindDevice: boolean
  enableKcpProxy: boolean
  disableKcpInput: boolean
  disableRelayKcp: boolean
  proxyForwardBySystem: boolean
  acceptDns: boolean
  privateMode: boolean
  enableQuicProxy: boolean
  disableQuicInput: boolean
  disableSymHolePunching: boolean
  tcpWhitelist: string
  udpWhitelist: string
  socks5Port: number
}

/** GitHub Release (更新检查) */
export interface ReleaseInfo {
  tag_name: string
  name: string | null
  body: string | null
  html_url: string
  prerelease: boolean
  draft: boolean
  assets: { name: string; browser_download_url: string; size: number }[]
}

/** 历史版本条目 */
export interface HistoryVersion {
  version: string
  url: string
  date: string
}
