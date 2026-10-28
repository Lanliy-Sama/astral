/**
 * 服务层 + ServiceManager — 对应 lib/core/services/*
 * 依赖注入与生命周期与 Flutter 版 ServiceManager 保持一致。
 */
import {
  UIState,
  ThemeState,
  ConnectionState,
  RoomState,
  PlayerState,
  ServerState,
  ServerStatusState,
  VpnState,
  WindowState,
  DisplayState,
  AppSettingsState,
  NetworkConfigState,
  FirewallState,
  StartupState,
  UpdateState,
  sortOptionFromIndex,
  sortOrderFromIndex,
  displayModeFromIndex,
  listStyleFromIndex,
  listStyleToIndex,
} from '../states/index.svelte'
import { RoomStore, ServerStore, SingletonStore, nextId, isBlockedServer } from '../storage/storage'
import { bridge } from '../bridge/bridge'
import type { NetConfig, AllSettings, Room, ServerMod, ServerStatus } from '../models/types'
import { defaultNetConfig, defaultAllSettings } from '../models/types'
import { applyThemeToDocument, type ThemeMode } from '../../theme/scheme'
import { Platform } from '../../platform'

/** normalizeSocks5Port (net_config_dao.dart 全局函数) */
export function normalizeSocks5Port(port: number): number {
  return port <= 0 || port > 65535 ? 1080 : port
}

// ---------------------------------------------------------------------------
// ThemeService
// ---------------------------------------------------------------------------
export class ThemeService {
  constructor(
    private state: ThemeState,
    private repo = {
      get: () =>
        SingletonStore.get<{ colorValue: number; themeModeValue: ThemeMode }>('theme', {
          colorValue: 0xff2196f3,
          themeModeValue: 'system',
        }),
      put: (v: { colorValue: number; themeModeValue: ThemeMode }) =>
        SingletonStore.put('theme', v),
    },
  ) {}

  async init() {
    const s = this.repo.get()
    this.state.themeColor = argbToHex(s.colorValue)
    this.state.themeMode = s.themeModeValue
    this.apply()
  }

  async updateThemeColor(hex: string) {
    this.state.themeColor = hex
    this.repo.put({ colorValue: hexToArgb(hex), themeModeValue: this.state.themeMode })
    this.apply()
  }

  async updateThemeMode(mode: ThemeMode) {
    this.state.themeMode = mode
    this.repo.put({ colorValue: hexToArgb(this.state.themeColor), themeModeValue: mode })
    this.apply()
  }

  private apply() {
    applyThemeToDocument(this.state.themeColor, this.state.themeMode)
  }
}

export function argbToHex(argb: number): string {
  const r = (argb >> 16) & 0xff
  const g = (argb >> 8) & 0xff
  const b = argb & 0xff
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
}

export function hexToArgb(hex: string): number {
  const h = hex.replace('#', '')
  return (0xff << 24) | parseInt(h.slice(0, 6), 16)
}

// ---------------------------------------------------------------------------
// RoomService
// ---------------------------------------------------------------------------
export class RoomService {
  constructor(
    private state: RoomState,
    private allSettings: AllSettingsStore,
  ) {}

  async init() {
    const rooms = RoomStore.getAll().sort((a, b) => a.sortOrder - b.sortOrder)
    this.state.setRooms(rooms)
    const settings = this.allSettings.get()
    const selected = settings.room != null ? rooms.find((r) => r.id === settings.room) : null
    this.state.selectRoom(selected ?? null)
  }

  private persist(rooms: Room[]) {
    RoomStore.put(rooms)
    this.state.setRooms([...rooms].sort((a, b) => a.sortOrder - b.sortOrder))
  }

  async addRoom(room: Room) {
    const rooms = RoomStore.getAll()
    room.id = nextId(rooms)
    room.sortOrder = rooms.length
    rooms.push(room)
    this.persist(rooms)
  }

  async deleteRoom(id: number) {
    const rooms = RoomStore.getAll().filter((r) => r.id !== id)
    // 保持 sortOrder 连续
    rooms.forEach((r, i) => (r.sortOrder = i))
    this.persist(rooms)
    if (this.state.selectedRoom?.id === id) {
      this.state.selectRoom(null)
      await this.allSettings.setSelectedRoom(null)
    }
  }

  async updateRoom(room: Room) {
    const rooms = RoomStore.getAll()
    const i = rooms.findIndex((r) => r.id === room.id)
    if (i >= 0) rooms[i] = room
    this.persist(rooms)
    if (this.state.selectedRoom?.id === room.id) {
      this.state.selectRoom(room)
    }
  }

  async reorderRooms(ordered: Room[]) {
    const rooms = RoomStore.getAll()
    ordered.forEach((r, i) => {
      const t = rooms.find((x) => x.id === r.id)
      if (t) t.sortOrder = i
    })
    this.persist(rooms)
  }

  async setRoom(room: Room) {
    await this.allSettings.setSelectedRoom(room)
    this.state.selectRoom(room)
  }

  async getAllRooms(): Promise<Room[]> {
    const rooms = RoomStore.getAll().sort((a, b) => a.sortOrder - b.sortOrder)
    this.state.setRooms(rooms)
    return rooms
  }
}

/** AllSettings 单例读写 */
export class AllSettingsStore {
  get(): AllSettings {
    return { ...defaultAllSettings(), ...SingletonStore.get<Partial<AllSettings>>('allSettings', {}) }
  }
  put(v: AllSettings) {
    SingletonStore.put('allSettings', v)
  }
  async setSelectedRoom(room: Room | null) {
    const s = this.get()
    s.room = room ? room.id : null
    this.put(s)
  }
  getRoom(): number | null {
    return this.get().room
  }
  getPlayerName(): string {
    const s = this.get()
    if (s.playerName) return s.playerName
    const fallback = '用户-' + Math.random().toString(36).slice(2, 6).toUpperCase()
    s.playerName = fallback
    this.put(s)
    return fallback
  }
  getListenList(): string[] {
    const s = this.get()
    if (!s.listenList || s.listenList.length === 0) {
      s.listenList = ['tcp://0.0.0.0:0', 'udp://0.0.0.0:0']
      this.put(s)
    }
    return s.listenList
  }
  update(mutate: (s: AllSettings) => void) {
    const s = this.get()
    mutate(s)
    this.put(s)
  }
}

// ---------------------------------------------------------------------------
// ServerService
// ---------------------------------------------------------------------------
export class ServerService {
  constructor(private state: ServerState) {}

  async init() {
    const servers = ServerStore.getAll().sort((a, b) => a.sortOrder - b.sortOrder)
    this.state.setServers(servers)
  }

  private persist(servers: ServerMod[]) {
    ServerStore.put(servers)
    this.state.setServers([...servers].sort((a, b) => a.sortOrder - b.sortOrder))
  }

  async addServer(server: ServerMod) {
    const servers = ServerStore.getAll()
    server.id = nextId(servers)
    server.sortOrder = servers.length
    servers.push(server)
    this.persist(servers)
  }

  async deleteServer(server: ServerMod) {
    this.persist(ServerStore.getAll().filter((s) => s.id !== server.id))
  }

  async updateServer(server: ServerMod) {
    const servers = ServerStore.getAll()
    const i = servers.findIndex((s) => s.id === server.id)
    if (i >= 0) servers[i] = server
    this.persist(servers)
  }

  async reorderServers(ordered: ServerMod[]) {
    const servers = ServerStore.getAll()
    ordered.forEach((s, i) => {
      const t = servers.find((x) => x.id === s.id)
      if (t) t.sortOrder = i
    })
    this.persist(servers)
  }

  async setServerEnable(server: ServerMod, enable: boolean) {
    server.enable = enable
    await this.updateServer(server)
  }

  async getAllServers(): Promise<ServerMod[]> {
    const servers = ServerStore.getAll().sort((a, b) => a.sortOrder - b.sortOrder)
    this.state.setServers(servers)
    return servers
  }
}

// ---------------------------------------------------------------------------
// NetworkConfigService
// ---------------------------------------------------------------------------
export class NetworkConfigService {
  constructor(private state: NetworkConfigState, private allSettings: AllSettingsStore) {}

  async init() {
    const config: NetConfig = {
      ...defaultNetConfig(),
      ...SingletonStore.get<Partial<NetConfig>>('netConfig', {}),
    }
    const autoSetMtu = this.allSettings.get().autoSetMTU
    this.applyFrom(config, autoSetMtu)
  }

  applyFrom(config: NetConfig, autoSetMtu: boolean) {
    const s = this.state
    s.netns = config.netns
    s.hostname = config.hostname
    s.instanceName = config.instanceName
    s.ipv4 = config.ipv4
    s.dhcp = config.dhcp
    s.autoSetMTU = autoSetMtu
    s.networkName = config.networkName
    s.networkSecret = config.networkSecret
    s.listeners = config.listeners
    s.peer = config.peer
    s.defaultProtocol = config.defaultProtocol
    s.devName = config.devName
    s.enableEncryption = config.enableEncryption
    s.enableIpv6 = config.enableIpv6
    s.mtu = config.mtu
    s.latencyFirst = config.latencyFirst
    s.enableExitNode = config.enableExitNode
    s.noTun = config.noTun
    s.enableSocks5 = config.enableSocks5
    s.socks5Port = normalizeSocks5Port(config.socks5Port)
    s.useSmoltcp = config.useSmoltcp
    s.dataCompressAlgo = config.dataCompressAlgo
    s.cidrproxy = config.cidrproxy
    s.relayNetworkWhitelist = config.relayNetworkWhitelist
    s.disableP2p = config.disableP2p
    s.enableUdpBroadcastRelay = config.enableUdpBroadcastRelay
    s.relayAllPeerRpc = config.relayAllPeerRpc
    s.disableUdpHolePunching = config.disableUdpHolePunching
    s.disableTcpHolePunching = config.disableTcpHolePunching
    s.disableSymHolePunching = config.disableSymHolePunching
    s.multiThread = config.multiThread
    s.bindDevice = config.bindDevice
    s.enableKcpProxy = config.enableKcpProxy
    s.disableKcpInput = config.disableKcpInput
    s.disableRelayKcp = config.disableRelayKcp
    s.proxyForwardBySystem = config.proxyForwardBySystem
    s.acceptDns = config.acceptDns
    s.privateMode = config.privateMode
    s.enableQuicProxy = config.enableQuicProxy
    s.disableQuicInput = config.disableQuicInput
    s.tcpWhitelist = config.tcpWhitelist
    s.udpWhitelist = config.udpWhitelist
  }

  private save(mutate: (c: NetConfig) => void) {
    const c: NetConfig = {
      ...defaultNetConfig(),
      ...SingletonStore.get<Partial<NetConfig>>('netConfig', {}),
    }
    mutate(c)
    SingletonStore.put('netConfig', c)
  }

  async updateIpv4(ip: string) {
    this.state.ipv4 = ip
    this.save((c) => (c.ipv4 = ip))
  }
  async updateDhcp(v: boolean) {
    this.state.dhcp = v
    this.save((c) => (c.dhcp = v))
  }
  async setAutoSetMTU(v: boolean) {
    this.state.autoSetMTU = v
    this.allSettings.update((s) => (s.autoSetMTU = v))
  }
  async updateDefaultProtocol(v: string) {
    this.state.defaultProtocol = v
    this.save((c) => (c.defaultProtocol = v))
  }
  async updateEnableEncryption(v: boolean) {
    this.state.enableEncryption = v
    this.save((c) => {
      c.enableEncryption = v
      // 联动 MTU: 开启→1360, 关闭→1380
      c.mtu = v ? 1360 : 1380
    })
    this.state.mtu = v ? 1360 : 1380
  }
  async updateMtu(v: number) {
    this.state.mtu = v
    this.save((c) => (c.mtu = v))
  }
  async updateLatencyFirst(v: boolean) {
    this.state.latencyFirst = v
    this.save((c) => (c.latencyFirst = v))
  }
  async updateNoTun(v: boolean) {
    this.state.noTun = v
    this.save((c) => (c.noTun = v))
  }
  async updateEnableSocks5(v: boolean) {
    this.state.enableSocks5 = v
    this.save((c) => (c.enableSocks5 = v))
  }
  async updateSocks5Port(v: number) {
    const p = normalizeSocks5Port(v)
    this.state.socks5Port = p
    this.save((c) => (c.socks5Port = p))
  }
  async updateDataCompressAlgo(v: number) {
    this.state.dataCompressAlgo = v
    this.save((c) => (c.dataCompressAlgo = v))
  }
  async updateDisableP2p(v: boolean) {
    this.state.disableP2p = v
    this.save((c) => (c.disableP2p = v))
  }
  async updateEnableUdpBroadcastRelay(v: boolean) {
    this.state.enableUdpBroadcastRelay = v
    this.save((c) => (c.enableUdpBroadcastRelay = v))
  }
  async updateDisableUdpHolePunching(v: boolean) {
    this.state.disableUdpHolePunching = v
    this.save((c) => (c.disableUdpHolePunching = v))
  }
  async updateDisableTcpHolePunching(v: boolean) {
    this.state.disableTcpHolePunching = v
    this.save((c) => (c.disableTcpHolePunching = v))
  }
  async updateDisableSymHolePunching(v: boolean) {
    this.state.disableSymHolePunching = v
    this.save((c) => (c.disableSymHolePunching = v))
  }
  async updateBindDevice(v: boolean) {
    this.state.bindDevice = v
    this.save((c) => (c.bindDevice = v))
  }
  async updateEnableKcpProxy(v: boolean) {
    this.state.enableKcpProxy = v
    this.save((c) => (c.enableKcpProxy = v))
  }
  async updateTcpWhitelist(v: string) {
    this.state.tcpWhitelist = v
    this.save((c) => (c.tcpWhitelist = v))
  }
  async updateUdpWhitelist(v: string) {
    this.state.udpWhitelist = v
    this.save((c) => (c.udpWhitelist = v))
  }
}

// ---------------------------------------------------------------------------
// FirewallService
// ---------------------------------------------------------------------------
export class FirewallService {
  constructor(private state: FirewallState) {}

  async init() {
    try {
      await this.updateFirewallStatus()
    } catch {
      this.state.setFirewallStatus(false)
    }
  }

  async setFirewall(enable: boolean) {
    this.state.setFirewallStatus(enable)
    try {
      for (const p of [1, 2, 3]) {
        await bridge.setFirewallStatus(p, enable)
      }
    } catch (e) {
      this.state.setFirewallStatus(!enable)
      throw e
    }
  }

  async updateFirewallStatus() {
    const s =
      (await bridge.getFirewallStatus(1)) &&
      (await bridge.getFirewallStatus(2)) &&
      (await bridge.getFirewallStatus(3))
    this.state.setFirewallStatus(s)
  }
}

// ---------------------------------------------------------------------------
// AppSettingsService
// ---------------------------------------------------------------------------
export class AppSettingsService {
  constructor(
    private playerState: PlayerState,
    private displayState: DisplayState,
    private startupState: StartupState,
    private updateState: UpdateState,
    private windowState: WindowState,
    private vpnState: VpnState,
    private appSettingsState: AppSettingsState,
    private repo: AllSettingsStore,
  ) {}

  async init() {
    const s = this.repo.get()
    this.playerState.playerName = this.repo.getPlayerName()
    this.playerState.setListenList(this.repo.getListenList())

    // userListStyle: 兼容旧 userListSimple 字段 (-1 未迁移时回退)
    if (s.userListStyle >= 0) {
      this.displayState.setUserListStyle(listStyleFromIndex(s.userListStyle))
    } else {
      this.displayState.setUserListStyle(s.userListSimple ? 'simple' : 'detailed')
      this.repo.update((x) => {
        x.userListStyle = listStyleToIndex(this.displayState.userListStyle)
      })
    }
    this.displayState.setSortOption(sortOptionFromIndex(s.sortOption))
    this.displayState.setSortOrder(sortOrderFromIndex(s.sortOrder))
    this.displayState.setDisplayMode(displayModeFromIndex(s.displayMode))

    this.startupState.startup = s.startup
    this.startupState.startupMinimize = s.startupMinimize
    this.startupState.startupAutoConnect = s.startupAutoConnect

    this.updateState.beta = s.beta
    this.updateState.autoCheckUpdate = s.autoCheckUpdate
    this.updateState.downloadAccelerate = s.downloadAccelerate
    this.updateState.latestVersion = s.latestVersion

    this.appSettingsState.enableConnectionNotification = s.enableConnectionNotification
    this.appSettingsState.reduceAnimationUpdates = s.reduceAnimationUpdates
    this.appSettingsState.autoRetryOnFailure = s.autoRetryOnFailure
    this.appSettingsState.maxRetryCount = s.maxRetryCount

    this.windowState.closeMinimize = s.closeMinimize
    this.vpnState.customVpn = s.customVpn
  }

  private save(mutate: (s: AllSettings) => void) {
    this.repo.update(mutate)
  }

  async updatePlayerName(name: string) {
    this.playerState.updatePlayerName(name)
    this.save((s) => (s.playerName = name))
  }

  async setListenList(list: string[]) {
    this.playerState.setListenList(list)
    this.save((s) => (s.listenList = list))
  }
  async addListen(listen: string) {
    this.playerState.addListen(listen)
    this.save((s) => (s.listenList = [...this.playerState.listenList]))
  }
  async deleteListen(index: number) {
    this.playerState.removeListen(index)
    this.save((s) => (s.listenList = [...this.playerState.listenList]))
  }
  async updateListen(index: number, listen: string) {
    const l = [...this.playerState.listenList]
    l[index] = listen
    this.playerState.setListenList(l)
    this.save((s) => (s.listenList = l))
  }

  async setUserListStyle(style: 'simple' | 'detailed' | 'list') {
    this.displayState.setUserListStyle(style)
    this.save((s) => {
      s.userListStyle = listStyleToIndex(style)
      s.userListSimple = style === 'simple'
    })
  }
  async setSortOption(v: 'none' | 'latency' | 'nameLength') {
    this.displayState.setSortOption(v)
    this.save((s) => (s.sortOption = ['none', 'latency', 'nameLength'].indexOf(v)))
  }
  async setSortOrder(v: 'ascending' | 'descending') {
    this.displayState.setSortOrder(v)
    this.save((s) => (s.sortOrder = ['ascending', 'descending'].indexOf(v)))
  }
  async setDisplayMode(v: 'all' | 'users' | 'servers') {
    this.displayState.setDisplayMode(v)
    this.save((s) => (s.displayMode = ['all', 'users', 'servers'].indexOf(v)))
  }

  async setStartup(v: boolean) {
    this.startupState.startup = v
    this.save((s) => (s.startup = v))
  }
  async setStartupMinimize(v: boolean) {
    this.startupState.startupMinimize = v
    this.save((s) => (s.startupMinimize = v))
  }
  async setStartupAutoConnect(v: boolean) {
    this.startupState.startupAutoConnect = v
    this.save((s) => (s.startupAutoConnect = v))
  }

  async setBeta(v: boolean) {
    this.updateState.beta = v
    this.save((s) => (s.beta = v))
  }
  async setAutoCheckUpdate(v: boolean) {
    this.updateState.autoCheckUpdate = v
    this.save((s) => (s.autoCheckUpdate = v))
  }
  async setDownloadAccelerate(v: string) {
    this.updateState.downloadAccelerate = v
    if (v !== 'auto') this.updateState.resolvedDownloadAccelerate = null
    this.save((s) => (s.downloadAccelerate = v))
  }
  async updateLatestVersion(v: string) {
    this.updateState.latestVersion = v
    this.save((s) => (s.latestVersion = v))
  }

  async updateEnableConnectionNotification(v: boolean) {
    this.appSettingsState.enableConnectionNotification = v
    this.save((s) => (s.enableConnectionNotification = v))
  }
  async updateReduceAnimationUpdates(v: boolean) {
    this.appSettingsState.reduceAnimationUpdates = v
    this.save((s) => (s.reduceAnimationUpdates = v))
  }
  async updateAutoRetryOnFailure(v: boolean) {
    this.appSettingsState.autoRetryOnFailure = v
    this.save((s) => (s.autoRetryOnFailure = v))
  }
  async updateMaxRetryCount(v: number) {
    this.appSettingsState.maxRetryCount = v
    this.save((s) => (s.maxRetryCount = v))
  }
  async updateCloseMinimize(v: boolean) {
    this.windowState.setCloseMinimize(v)
    this.save((s) => (s.closeMinimize = v))
  }
  async addCustomVpn(cidr: string) {
    this.vpnState.addCustomVpn(cidr)
    this.save((s) => (s.customVpn = [...this.vpnState.customVpn]))
  }
  async deleteCustomVpn(index: number) {
    this.vpnState.removeCustomVpn(index)
    this.save((s) => (s.customVpn = [...this.vpnState.customVpn]))
  }
  async updateCustomVpn(index: number, cidr: string) {
    const l = [...this.vpnState.customVpn]
    l[index] = cidr
    this.vpnState.setCustomVpn(l)
    this.save((s) => (s.customVpn = l))
  }
}

// ---------------------------------------------------------------------------
// PingUtil — TCP ping (浏览器模拟 / Tauri 走后端)
// ---------------------------------------------------------------------------
export async function pingServer(url: string): Promise<number | null> {
  if (Platform.isTauri) {
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      return await invoke<number | null>('ping_server', { url })
    } catch {
      /* fallthrough to simulated */
    }
  }
  // 模拟: 90% 在线, 12-260ms
  await new Promise((r) => setTimeout(r, 80 + Math.random() * 300))
  if (Math.random() < 0.1) return null
  return Math.floor(80 + Math.random() * 720)
}

/** 服务器状态周期检查回调 (ServerStatusState.startPeriodicCheck 用) */
export async function checkServers(servers: ServerMod[], activeIds: Set<number>): Promise<Record<number, ServerStatus>> {
  const out: Record<number, ServerStatus> = {}
  for (const s of servers) {
    if (activeIds.has(s.id)) {
      out[s.id] = 'inUse'
      continue
    }
    const latency = await pingServer(s.url)
    out[s.id] = latency === null || latency > 800 ? 'offline' : 'online'
  }
  return out
}

// ---------------------------------------------------------------------------
// ServiceManager — 组合根 (单例)
// ---------------------------------------------------------------------------
export class ServiceManager {
  private static _instance: ServiceManager | null = null
  static get instance() {
    if (!this._instance) this._instance = new ServiceManager()
    return this._instance
  }

  // states
  uiState = new UIState()
  themeState = new ThemeState()
  connectionState = new ConnectionState()
  roomState = new RoomState()
  playerState = new PlayerState()
  serverState = new ServerState()
  serverStatusState = new ServerStatusState()
  vpnState = new VpnState()
  windowState = new WindowState()
  displayState = new DisplayState()
  appSettingsState = new AppSettingsState()
  networkConfigState = new NetworkConfigState()
  firewallState = new FirewallState()
  startupState = new StartupState()
  updateState = new UpdateState()

  // repositories
  allSettingsRepo = new AllSettingsStore()

  // services
  theme = new ThemeService(this.themeState)
  room = new RoomService(this.roomState, this.allSettingsRepo)
  server = new ServerService(this.serverState)
  networkConfig = new NetworkConfigService(this.networkConfigState, this.allSettingsRepo)
  firewall = new FirewallService(this.firewallState)
  appSettings = new AppSettingsService(
    this.playerState,
    this.displayState,
    this.startupState,
    this.updateState,
    this.windowState,
    this.vpnState,
    this.appSettingsState,
    this.allSettingsRepo,
  )

  private _initialized = false

  async init() {
    if (this._initialized) return
    await Promise.all([
      this.theme.init(),
      this.room.init(),
      this.server.init(),
      this.networkConfig.init(),
      this.firewall.init(),
      this.appSettings.init(),
    ])
    this._initialized = true
  }
}

export function services(): ServiceManager {
  return ServiceManager.instance
}
