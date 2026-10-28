/**
 * States — 对应 lib/core/states/*.dart (纯 Signal → Svelte 5 $state)
 */
import type {
  CoState,
  KVNetworkStatus,
  MainTab,
  Room,
  ServerMod,
  ServerStatus,
  ThemeModeT,
  UserSortOption,
  UserSortOrder,
  UserDisplayMode,
  UserListStyle,
} from '../models/types'

/** UIState — 纯临时 UI 状态 */
export class UIState {
  isDesktop = $state(false)
  selectedIndex = $state(0)
  hoveredIndex = $state<number | null>(null)
  isInBackground = $state(false)
  trayHidden = $state(false)

  updateScreenSplitWidth(width: number) {
    this.isDesktop = width > 480
  }
  goTo(tab: MainTab) {
    const order: MainTab[] = ['home', 'room', 'tools', 'servers', 'settings']
    this.selectedIndex = order.indexOf(tab)
  }
  setBackground(v: boolean) {
    this.isInBackground = v
  }
  setTrayHidden(v: boolean) {
    this.trayHidden = v
  }
}

/** ThemeState */
export class ThemeState {
  themeColor = $state('#2196F3') // Colors.blue
  themeMode = $state<ThemeModeT>('system')
}

/** ConnectionState — 连接状态机 */
export class ConnectionState {
  connectionState = $state<CoState>('idle')
  netStatus = $state<KVNetworkStatus | null>(null)
}

/** RoomState */
export class RoomState {
  rooms = $state<Room[]>([])
  selectedRoom = $state<Room | null>(null)

  setRooms(rooms: Room[]) {
    this.rooms = rooms
  }
  selectRoom(room: Room | null) {
    this.selectedRoom = room
  }
}

/** PlayerState */
export class PlayerState {
  playerName = $state('')
  listenList = $state<string[]>([])

  updatePlayerName(name: string) {
    this.playerName = name
  }
  setListenList(list: string[]) {
    this.listenList = list
  }
  addListen(listen: string) {
    this.listenList = [...this.listenList, listen]
  }
  removeListen(index: number) {
    const l = [...this.listenList]
    l.splice(index, 1)
    this.listenList = l
  }
}

/** ServerState */
export class ServerState {
  servers = $state<ServerMod[]>([])
  setServers(list: ServerMod[]) {
    this.servers = list
  }
}

/** ServerStatusState — 30s 周期 ping */
export class ServerStatusState {
  serverStatuses = $state<Record<number, ServerStatus>>({})
  activeServerIds = $state<Set<number>>(new Set())
  private timer: ReturnType<typeof setInterval> | null = null

  setActiveServers(ids: Set<number>) {
    this.activeServerIds = ids
  }

  startPeriodicCheck(
    servers: ServerMod[],
    intervalMs: number,
    checkFn: (servers: ServerMod[]) => Promise<Record<number, ServerStatus>>,
  ) {
    this.stopPeriodicCheck()
    const run = async () => {
      this.serverStatuses = await checkFn(servers)
    }
    run()
    this.timer = setInterval(run, intervalMs)
  }

  stopPeriodicCheck() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }
}

/** VpnState (Android 自定义网段) */
export class VpnState {
  customVpn = $state<string[]>([])
  setCustomVpn(list: string[]) {
    this.customVpn = list
  }
  addCustomVpn(cidr: string) {
    this.customVpn = [...this.customVpn, cidr]
  }
  removeCustomVpn(index: number) {
    const l = [...this.customVpn]
    l.splice(index, 1)
    this.customVpn = l
  }
}

/** WindowState */
export class WindowState {
  closeMinimize = $state(true)
  setCloseMinimize(v: boolean) {
    this.closeMinimize = v
  }
}

/** DisplayState — 用户列表显示配置 (持久化为 int index) */
const SORT_OPTIONS: UserSortOption[] = ['none', 'latency', 'nameLength']
const SORT_ORDERS: UserSortOrder[] = ['ascending', 'descending']
const DISPLAY_MODES: UserDisplayMode[] = ['all', 'users', 'servers']
const LIST_STYLES: UserListStyle[] = ['simple', 'detailed', 'list']

export class DisplayState {
  sortOption = $state<UserSortOption>('none')
  sortOrder = $state<UserSortOrder>('ascending')
  displayMode = $state<UserDisplayMode>('all')
  userListStyle = $state<UserListStyle>('simple')

  setSortOption(v: UserSortOption) {
    this.sortOption = v
  }
  setSortOrder(v: UserSortOrder) {
    this.sortOrder = v
  }
  setDisplayMode(v: UserDisplayMode) {
    this.displayMode = v
  }
  setUserListStyle(v: UserListStyle) {
    this.userListStyle = v
  }
}

export function sortOptionFromIndex(i: number): UserSortOption {
  return SORT_OPTIONS[i] ?? 'none'
}
export function sortOrderFromIndex(i: number): UserSortOrder {
  return SORT_ORDERS[i] ?? 'ascending'
}
export function displayModeFromIndex(i: number): UserDisplayMode {
  return DISPLAY_MODES[i] ?? 'all'
}
export function listStyleFromIndex(i: number): UserListStyle {
  return LIST_STYLES[i] ?? 'simple'
}
export function sortOptionToIndex(v: UserSortOption): number {
  return SORT_OPTIONS.indexOf(v)
}
export function sortOrderToIndex(v: UserSortOrder): number {
  return SORT_ORDERS.indexOf(v)
}
export function displayModeToIndex(v: UserDisplayMode): number {
  return DISPLAY_MODES.indexOf(v)
}
export function listStyleToIndex(v: UserListStyle): number {
  return LIST_STYLES.indexOf(v)
}

/** AppSettingsState — 应用级配置 (内存态) */
export class AppSettingsState {
  appName = $state('Astral')
  enableConnectionNotification = $state(true)
  autoRetryOnFailure = $state(true)
  maxRetryCount = $state(3)
  reduceAnimationUpdates = $state(false)
  logs = $state<string[]>([])
}

/** NetworkConfigState — 网络配置运行时镜像 */
export class NetworkConfigState {
  netns = $state('')
  hostname = $state('')
  instanceName = $state('default')
  ipv4 = $state('')
  dhcp = $state(true)
  autoSetMTU = $state(true)
  networkName = $state('')
  networkSecret = $state('')
  listeners = $state<string[]>([])
  peer = $state<string[]>([])
  defaultProtocol = $state('')
  devName = $state('')
  enableEncryption = $state(true)
  enableIpv6 = $state(true)
  mtu = $state(1360)
  latencyFirst = $state(false)
  enableExitNode = $state(false)
  noTun = $state(false)
  enableSocks5 = $state(false)
  socks5Port = $state(1080)
  useSmoltcp = $state(false)
  dataCompressAlgo = $state(1)
  cidrproxy = $state<string[]>([])
  relayNetworkWhitelist = $state('')
  disableP2p = $state(false)
  enableUdpBroadcastRelay = $state(false)
  privateMode = $state(false)
  enableQuicProxy = $state(false)
  disableQuicInput = $state(false)
  relayAllPeerRpc = $state(false)
  disableUdpHolePunching = $state(false)
  disableTcpHolePunching = $state(false)
  disableSymHolePunching = $state(false)
  multiThread = $state(true)
  bindDevice = $state(false)
  enableKcpProxy = $state(false)
  disableKcpInput = $state(false)
  disableRelayKcp = $state(false)
  proxyForwardBySystem = $state(false)
  acceptDns = $state(false)
  tcpWhitelist = $state('')
  udpWhitelist = $state('')
}

/** FirewallState */
export class FirewallState {
  firewallStatus = $state(false)
  setFirewallStatus(v: boolean) {
    this.firewallStatus = v
  }
}

/** StartupState */
export class StartupState {
  startup = $state(false)
  startupMinimize = $state(false)
  startupAutoConnect = $state(false)
}

/** UpdateState */
export class UpdateState {
  beta = $state(false)
  autoCheckUpdate = $state(true)
  downloadAccelerate = $state('auto')
  resolvedDownloadAccelerate = $state<string | null>(null)
  latestVersion = $state<string | null>(null)

  get hasNewVersion() {
    return this.latestVersion !== null
  }
}
