/**
 * 连接编排 — 对应 ServerConnectionManager + ConnectionStatusTracker +
 * ConnectionNetworkMonitor + ConnectionConnectGuard + ServerConfigBuilder
 */
import { services } from './services.svelte'
import { bridge } from '../bridge/bridge'
import type { CoState, FlagsC, NetworkConfigShare, Room, ServerMod } from '../models/types'
import { Platform } from '../../platform'

/** ConnectionConnectGuard — 连接前置校验 */
export type ConnectTargetIssue = 'noRoom' | 'noServers' | 'noneEnabled'

export const ConnectGuard = {
  connectTargetIssue(): ConnectTargetIssue | null {
    const s = services()
    const room = s.roomState.selectedRoom
    if (!room) return 'noRoom'
    if (room.servers.length > 0) return null
    const servers = s.serverState.servers
    if (servers.length === 0) return 'noServers'
    if (!servers.some((x) => x.enable)) return 'noneEnabled'
    return null
  },
  hasConnectTarget(): boolean {
    return this.connectTargetIssue() === null
  },
  isNpcapReady(): Promise<boolean> {
    // Npcap 检测仅 Windows + faketcp; Tauri 下走命令, 浏览器视为就绪
    if (!Platform.isWindows) return Promise.resolve(true)
    const s = services()
    const room = s.roomState.selectedRoom
    if (!room) return Promise.resolve(true)
    const enabled = s.serverState.servers.filter((x) => x.enable)
    const hasFaketcp =
      room.servers.some((u) => u.startsWith('faketcp://')) ||
      enabled.some((x) => x.faketcp || x.url.startsWith('faketcp://'))
    if (!hasFaketcp) return Promise.resolve(true)
    if (Platform.isTauri) {
      return import('@tauri-apps/api/core')
        .then(({ invoke }) => invoke<boolean>('has_npcap_driver'))
        .catch(() => true)
    }
    return Promise.resolve(true)
  },
}

/** ServerConfigBuilder — 组装 createServer 参数 */
export class ServerConfigBuilder {
  private username = ''
  private enableDhcp = true
  private specifiedIp = ''
  private roomName = ''
  private roomPassword = ''
  private severurl: string[] = []
  private onurl: string[] = []
  private cidrs: string[] = []
  private forwards: { bindAddr: string; dstAddr: string; proto: string }[] = []
  private flags: FlagsC | null = null
  private roomConfig: NetworkConfigShare | null = null

  withPlayerInfo(username: string, enableDhcp: boolean, specifiedIp: string) {
    this.username = username
    this.enableDhcp = enableDhcp
    this.specifiedIp = enableDhcp ? '' : specifiedIp // ipv4 无效时强制 DHCP
    return this
  }

  withRoom(roomName: string, roomPassword: string) {
    this.roomName = roomName
    this.roomPassword = roomPassword
    return this
  }

  withRoomConfig(rc: NetworkConfigShare | null) {
    this.roomConfig = rc
    return this
  }

  withServers(roomServers: string[], globalServers: ServerMod[]) {
    // 房间自带服务器优先, 与全局启用服务器去重合并
    const set = new Set(roomServers)
    for (const s of globalServers.filter((x) => x.enable)) {
      for (const url of expandServerUrls(s)) set.add(url)
    }
    this.severurl = [...set]
    return this
  }

  withListeners(listeners: string[]) {
    this.onurl = listeners.filter((l) => !l.includes('[::]'))
    return this
  }

  withCidrs(cidrs: string[]) {
    this.cidrs = cidrs
    return this
  }

  withFlags() {
    const n = services().networkConfigState
    const rc = this.roomConfig
    const flag = <T,>(room: T | null | undefined, global: T): T =>
      room === null || room === undefined ? global : room
    this.flags = {
      defaultProtocol: this.roomConfig?.proto ?? n.defaultProtocol,
      devName: n.devName,
      enableEncryption: flag(rc?.enc, n.enableEncryption),
      enableIpv6: n.enableIpv6,
      mtu: n.mtu,
      latencyFirst: flag(rc?.lat, n.latencyFirst),
      enableExitNode: n.enableExitNode,
      noTun: flag(rc?.tun, n.noTun),
      useSmoltcp: n.useSmoltcp,
      relayNetworkWhitelist: n.relayNetworkWhitelist,
      disableP2P: flag(rc?.dp2p, n.disableP2p),
      enableUdpBroadcastRelay: n.enableUdpBroadcastRelay,
      relayAllPeerRpc: n.relayAllPeerRpc,
      disableUdpHolePunching: flag(rc?.dudp, n.disableUdpHolePunching),
      disableTcpHolePunching: flag(rc?.dtcp, n.disableTcpHolePunching),
      multiThread: n.multiThread,
      dataCompressAlgo: flag(rc?.comp, n.dataCompressAlgo),
      bindDevice: flag(rc?.bind, n.bindDevice),
      enableKcpProxy: flag(rc?.kcp, n.enableKcpProxy),
      disableKcpInput: n.disableKcpInput,
      disableRelayKcp: n.disableRelayKcp,
      proxyForwardBySystem: n.proxyForwardBySystem,
      acceptDns: n.acceptDns,
      privateMode: n.privateMode,
      enableQuicProxy: n.enableQuicProxy,
      disableQuicInput: n.disableQuicInput,
      disableSymHolePunching: flag(rc?.dsym, n.disableSymHolePunching),
      tcpWhitelist: n.tcpWhitelist || '*',
      udpWhitelist: n.udpWhitelist || '*',
      socks5Port: n.enableSocks5 ? n.socks5Port : 0,
    }
    return this
  }

  build() {
    return {
      username: this.username,
      enableDhcp: this.enableDhcp,
      specifiedIp: this.specifiedIp,
      roomName: this.roomName,
      roomPassword: this.roomPassword,
      severurl: this.severurl,
      onurl: this.onurl,
      cidrs: this.cidrs,
      forwards: this.forwards,
      flags: this.flags!,
    }
  }
}

/** ServerMod 布尔位 → 协议 URL 前缀展开 */
export function expandServerUrls(s: ServerMod): string[] {
  const urls: string[] = []
  const [host, port] = s.url.split(':')
  const addr = port ? `${host}:${port}` : `${host}:11010`
  if (s.tcp) urls.push(`tcp://${addr}`)
  if (s.faketcp) urls.push(`faketcp://${addr}`)
  if (s.udp) urls.push(`udp://${addr}`)
  if (s.ws) urls.push(`ws://${addr}`)
  if (s.wss) urls.push(`wss://${addr}`)
  if (s.quic) urls.push(`quic://${addr}`)
  if (s.wg) urls.push(`wg://${addr}`)
  if (s.txt) urls.push(`txt://${addr}`)
  if (s.srv) urls.push(`srv://${addr}`)
  if (s.http) urls.push(`http://${addr}`)
  if (s.https) urls.push(`https://${addr}`)
  return urls
}

/** 解析房间 networkConfigJson → NetworkConfigShare */
export function parseRoomConfig(json: string): NetworkConfigShare | null {
  if (!json) return null
  try {
    return JSON.parse(json)
  } catch {
    return null
  }
}

const CONNECTION_TIMEOUT_SECONDS = 15

/**
 * ServerConnectionManager — 连接状态机 (单例)
 * connect() 返回: true 成功 / false 失败 / null 用户取消
 */
export class ServerConnectionManager {
  private static _i: ServerConnectionManager | null = null
  static get instance() {
    if (!this._i) this._i = new ServerConnectionManager()
    return this._i
  }

  private cancelled = false
  private retryCount = 0
  private statusTimer: ReturnType<typeof setInterval> | null = null
  private timeoutTimer: ReturnType<typeof setTimeout> | null = null
  private monitorTimer: ReturnType<typeof setInterval> | null = null
  private _onDisconnect: (() => void) | null = null

  cancelConnection() {
    this.cancelled = true
  }

  private setState(s: CoState) {
    services().connectionState.connectionState = s
  }

  /** 轮询 getRunningInfo 直到拿到有效 IPv4 (每秒, 最多30次) */
  private async checkConnectionStatus(): Promise<boolean> {
    try {
      const info = await bridge.getRunningInfo()
      const data = JSON.parse(info)
      const ipv4: string = data.ipv4 ?? '0.0.0.0'
      if (isValidRuntimeIpv4(ipv4)) {
        await services().networkConfig.updateIpv4(ipv4)
        return true
      }
    } catch {
      /* ignore */
    }
    return false
  }

  private clearTimers() {
    if (this.statusTimer) clearInterval(this.statusTimer)
    if (this.timeoutTimer) clearTimeout(this.timeoutTimer)
    this.statusTimer = null
    this.timeoutTimer = null
  }

  async connect(isManual = true): Promise<boolean | null> {
    const s = services()
    if (s.connectionState.connectionState !== 'idle') return false
    const room: Room | null = s.roomState.selectedRoom
    if (!room) return false
    if (isManual) this.retryCount = 0

    this.cancelled = false
    const autoRetry = s.appSettingsState.autoRetryOnFailure
    const maxRetries = s.appSettingsState.maxRetryCount

    do {
      this.retryCount++
      if (this.cancelled) {
        this.setState('idle')
        return null
      }

      try {
        await bridge.closeServer()
      } catch {
        /* ignore */
      }

      const enabledServers = s.serverState.servers.filter((x) => x.enable)
      if (enabledServers.length === 0 && room.servers.length === 0) {
        this.setState('idle')
        return false
      }

      // 组装配置并启动
      const rc = parseRoomConfig(room.networkConfigJson)
      const opts = new ServerConfigBuilder()
        .withPlayerInfo(
          s.playerState.playerName || 'player',
          s.networkConfigState.dhcp,
          s.networkConfigState.ipv4,
        )
        .withRoom(room.encrypted ? room.roomName : room.roomName, room.password)
        .withRoomConfig(rc)
        .withServers(room.servers, s.serverState.servers)
        .withListeners(s.playerState.listenList)
        .withCidrs(s.vpnState.customVpn)
        .withFlags()
        .build()

      try {
        await bridge.createServer(opts)
      } catch (e) {
        if (!autoRetry || this.retryCount >= maxRetries) {
          this.setState('idle')
          return false
        }
        await this.disconnect()
        await new Promise((r) => setTimeout(r, 2000))
        continue
      }

      // connecting 状态
      this.setState('connecting')
      this.clearTimers()

      // 15s 超时
      this.timeoutTimer = setTimeout(() => {
        if (services().connectionState.connectionState === 'connecting') {
          this.disconnect()
        }
      }, CONNECTION_TIMEOUT_SECONDS * 1000)

      // 每秒轮询连接结果, 最长 30 次
      let success = false
      for (let i = 0; i < 30; i++) {
        if (this.cancelled) {
          await this.disconnect()
          return null
        }
        if (await this.checkConnectionStatus()) {
          success = true
          break
        }
        await new Promise((r) => setTimeout(r, 1000))
      }

      this.clearTimers()

      if (success) {
        await this.handleSuccessfulConnection()
        return true
      }

      if (!autoRetry || this.retryCount >= maxRetries) {
        this.setState('idle')
        return false
      }
      await this.disconnect()
      await new Promise((r) => setTimeout(r, 2000))
    } while (autoRetry && this.retryCount < maxRetries && !this.cancelled)

    this.setState('idle')
    return false
  }

  private async handleSuccessfulConnection() {
    const s = services()
    this.setState('connected')
    // 标记使用中的服务器
    const active = new Set(
      s.serverState.servers.filter((x) => x.enable).map((x) => x.id),
    )
    s.serverStatusState.setActiveServers(active)
    // Windows: astral 网卡跃点设为 0
    if (Platform.isWindows) {
      bridge.setInterfaceMetric('astral', 0).catch(() => {})
    }
    // 启动 1s 网络监视
    this.startMonitor()
  }

  private startMonitor() {
    this.stopMonitor()
    let busy = false
    this.monitorTimer = setInterval(async () => {
      if (busy) return
      busy = true
      try {
        await this.tick()
      } finally {
        busy = false
      }
    }, 1000)
  }

  private stopMonitor() {
    if (this.monitorTimer) {
      clearInterval(this.monitorTimer)
      this.monitorTimer = null
    }
  }

  private async tick() {
    const s = services()
    try {
      const status = await bridge.getNetworkStatus()
      s.connectionState.netStatus = status
    } catch {
      /* ignore */
    }
  }

  async disconnect() {
    this.cancelled = true
    this.retryCount = 0
    this.clearTimers()
    this.stopMonitor()
    try {
      await bridge.closeServer()
    } catch {
      /* ignore */
    }
    const s = services()
    s.connectionState.connectionState = 'idle'
    s.connectionState.netStatus = null
    s.serverStatusState.setActiveServers(new Set())
    this.cancelled = false
    this._onDisconnect?.()
  }
}

export function isValidRuntimeIpv4(ip: string): boolean {
  return !!ip && ip !== '0.0.0.0'
}

export function connection(): ServerConnectionManager {
  return ServerConnectionManager.instance
}
