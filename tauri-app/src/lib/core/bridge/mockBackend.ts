/**
 * Mock 后端 — 模拟 EasyTier (rust/src/api/*) 的行为
 *
 * 用于纯浏览器环境 (npm run dev) 或后端未接入的 Tauri 壳。
 * 接入真实后端时, bridge.ts 会优先调用 Tauri command (src-tauri/src/commands.rs)。
 */
import type {
  KVNetworkStatus,
  KVNodeInfo,
  NetworkTestResult,
  FlagsC,
  MagicWallRuleModel,
  MagicWallStatus,
} from '../models/types'
import { Platform } from '../../platform'

const NAT_TYPES = [
  'OpenInternet',
  'FullCone',
  'Restricted',
  'PortRestricted',
  'Symmetric',
  'SymUdpFirewall',
]

const PLAYER_NAMES = [
  '月光会议室',
  '量子反应堆',
  '像素实验室',
  '云端档案馆',
  '琥珀舰桥',
  '棱镜观测台',
  '黄昏剧场',
  '虫洞终端',
  '翡翠回廊',
  '克莱因暗房',
  '星云咖啡角',
  '磁浮图书馆',
]

const PLATFORMS = ['windows', 'linux', 'android', 'macos']

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min
}
function randInt(min: number, max: number) {
  return Math.floor(rand(min, max + 1))
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

interface MockPlayer {
  joinedAt: number
  info: KVNodeInfo
}

export class MockBackend {
  private running = false
  private localIp = ''
  private myName = '本地玩家'
  private serverUrls: string[] = []
  private players: MockPlayer[] = []
  private startAt = 0
  private joinTimers: ReturnType<typeof setTimeout>[] = []
  private firewallProfiles: Record<number, boolean> = { 1: true, 2: true, 3: true }
  private mwRules = new Map<string, MagicWallRuleModel>()
  private mwRunning = false
  private natResult: NetworkTestResult | null = null

  // ---------- simple ----------
  async easytierVersion(): Promise<string> {
    return `2.4.0|${Platform.os === 'unknown' ? 'mock' : Platform.os}`
  }

  async isEasytierRunning(): Promise<boolean> {
    return this.running
  }

  async getIps(): Promise<string[]> {
    return []
  }

  async getRunningInfo(): Promise<string> {
    const ipv4 = this.running && Date.now() - this.startAt > 2000 ? this.localIp : '0.0.0.0'
    return JSON.stringify({
      my_node_info: {
        virtual_ipv4: { address: { addr: ipToU32(ipv4) } },
      },
      ipv4,
    })
  }

  // ---------- 连接 ----------
  async createServer(opts: {
    username: string
    enableDhcp: boolean
    specifiedIp: string
    roomName: string
    roomPassword: string
    severurl: string[]
    onurl: string[]
    cidrs: string[]
    flags: FlagsC
  }): Promise<string> {
    if (this.running) throw new Error('EasyTier 已在运行')
    this.running = true
    this.startAt = Date.now()
    this.myName = opts.username || '本地玩家'
    this.serverUrls = opts.severurl
    this.players = []
    if (opts.enableDhcp) {
      this.localIp = `10.126.${randInt(10, 200)}.${randInt(2, 250)}`
    } else {
      this.localIp = (opts.specifiedIp || '10.126.0.2').split('/')[0]
    }

    // 模拟其他玩家陆续加入
    const playerCount = randInt(2, 5)
    for (let i = 0; i < playerCount; i++) {
      const delay = rand(1500, 12000)
      this.joinTimers.push(
        setTimeout(() => {
          this.players.push({
            joinedAt: Date.now(),
            info: this.makePlayer(i),
          })
        }, delay),
      )
    }
    return 'ok'
  }

  async closeServer(): Promise<void> {
    this.running = false
    this.players = []
    this.joinTimers.forEach(clearTimeout)
    this.joinTimers = []
    this.localIp = ''
  }

  private makePlayer(i: number): KVNodeInfo {
    const name = PLAYER_NAMES[(randInt(0, PLAYER_NAMES.length - 1) + i) % PLAYER_NAMES.length]
    const latency = rand(15, 180)
    const loss = Math.random() < 0.75 ? rand(0, 0.8) : rand(1, 4)
    const cost = Math.random() < 0.6 ? 1 : 2
    const platform = pick(PLATFORMS)
    const direct = cost === 1
    const now = Date.now()
    const rx = BigInt(Math.floor(rand(5e6, 9e8)))
    const tx = BigInt(Math.floor(rand(5e6, 9e8)))
    const serverUrl = this.serverUrls[0] ?? 'PublicServer_default'
    const hops = direct
      ? []
      : [
          {
            peerId: 900000,
            targetIp: '10.126.0.1',
            latencyMs: latency * 0.4,
            packetLoss: loss * 0.5,
            nodeName: `PublicServer_${serverUrl.split('//').pop()?.split(':')[0] ?? 'relay'}`,
          },
        ]
    return {
      peerId: 100000 + randInt(1, 99999),
      hostname: name,
      ipv4: `10.126.${this.localIp.split('.')[1]}.${randInt(2, 250)}`,
      latencyMs: latency,
      nat: pick(NAT_TYPES),
      hops,
      lossRate: loss,
      connections: [
        {
          connType: direct ? 'p2p' : 'relay',
          rxBytes: rx,
          txBytes: tx,
          rxPackets: rx / 1400n,
          txPackets: tx / 1400n,
        },
      ],
      tunnelProto: direct ? 'udp' : pick(['tcp', 'ws']),
      connType: direct ? 'p2p' : 'relay',
      rxBytes: rx,
      txBytes: tx,
      version: `2.4.0|${platform}`,
      cost,
      proxyCidrs: [],
      // @ts-ignore 内部字段
      _joinedAt: now,
    }
  }

  async getNetworkStatus(): Promise<KVNetworkStatus> {
    if (!this.running) {
      return { totalNodes: 0n, nodes: [] }
    }
    const now = Date.now()
    const growth = (ms: number) => BigInt(Math.floor((ms / 1000) * rand(20e3, 200e3)))

    const serverNodes: KVNodeInfo[] = this.serverUrls.map((url, i) => ({
      peerId: 900000 + i,
      hostname: `PublicServer_${url.replace(/^\w+:\/\//, '').split(':')[0]}`,
      ipv4: '0.0.0.0',
      latencyMs: rand(30, 90),
      nat: 'Unknown',
      hops: [],
      lossRate: 0,
      connections: [],
      tunnelProto: '',
      connType: 'server',
      rxBytes: 0n,
      txBytes: 0n,
      version: '2.4.0|server',
      cost: 0,
      proxyCidrs: [],
    }))

    const localNode: KVNodeInfo = {
      peerId: 1,
      hostname: this.myName,
      ipv4: this.localIp,
      latencyMs: 0,
      nat: pick(NAT_TYPES),
      hops: [],
      lossRate: 0,
      connections: [],
      tunnelProto: '',
      connType: 'local',
      rxBytes: 0n,
      txBytes: 0n,
      version: `2.4.0|${Platform.os}`,
      cost: 0,
      proxyCidrs: [],
    }

    const players = this.players.map((p) => {
      const elapsed = now - p.joinedAt
      const drift = Math.sin(now / 4000 + p.info.peerId) * 8
      return {
        ...p.info,
        latencyMs: Math.max(5, p.info.latencyMs + drift),
        rxBytes: p.info.rxBytes + growth(elapsed),
        txBytes: p.info.txBytes + growth(elapsed),
        connections: p.info.connections.map((c) => ({
          ...c,
          rxBytes: c.rxBytes + growth(elapsed),
          txBytes: c.txBytes + growth(elapsed),
          rxPackets: c.rxPackets + growth(elapsed) / 1400n,
          txPackets: c.txPackets + growth(elapsed) / 1400n,
        })),
      }
    })

    const nodes = [localNode, ...serverNodes, ...players]
    return { totalNodes: BigInt(nodes.length), nodes }
  }

  // ---------- NAT 测试 ----------
  async testNetworkConnectivity(stunServer: string): Promise<NetworkTestResult> {
    await new Promise((r) => setTimeout(r, rand(800, 2200)))
    if (!this.natResult) {
      this.natResult = {
        natTypeV4: `${pick(['完全锥形', '受限锥形', '端口受限锥形', '对称型'])} NAT`,
        natTypeV6: '开放互联网',
        ipv4Latency: randInt(12, 80),
        ipv6Latency: Math.random() < 0.3 ? -1 : randInt(12, 80),
      }
    }
    return this.natResult
  }

  async detectNatType(stunServer: string): Promise<string> {
    const r = await this.testNetworkConnectivity(stunServer)
    return r.natTypeV4
  }

  // ---------- 防火墙 ----------
  async getFirewallStatus(profileIndex: number): Promise<boolean> {
    return this.firewallProfiles[profileIndex] ?? true
  }

  async setFirewallStatus(profileIndex: number, enable: boolean): Promise<void> {
    if (!Platform.isWindows) throw new Error('此操作仅支持 Windows 平台')
    this.firewallProfiles[profileIndex] = enable
  }

  // ---------- 网卡跃点 ----------
  async getAllInterfacesMetrics(): Promise<[string, number][]> {
    return [
      ['以太网', 25],
      ['Wi-Fi', 50],
      ['Loopback Pseudo-Interface 1', 75],
      ['astral', 5000],
    ]
  }

  async setInterfaceMetric(interfaceName: string, metric: number): Promise<void> {
    /* mock: no-op */
  }

  async checkSudo(): Promise<boolean> {
    return true
  }

  // ---------- 魔法墙 ----------
  async startMagicWall(): Promise<void> {
    if (!Platform.isWindows) throw new Error('魔法墙仅支持 Windows 平台')
    if (this.mwRunning) throw new Error('魔法墙已经在运行')
    this.mwRunning = true
  }

  async stopMagicWall(): Promise<void> {
    if (!Platform.isWindows) throw new Error('魔法墙仅支持 Windows 平台')
    if (!this.mwRunning) throw new Error('魔法墙未运行')
    this.mwRunning = false
  }

  async addMagicWallRule(rule: MagicWallRuleModel): Promise<void> {
    if (!Platform.isWindows) throw new Error('魔法墙仅支持 Windows 平台')
    this.mwRules.set(rule.ruleId, rule)
  }

  async removeMagicWallRule(ruleId: string): Promise<void> {
    if (!Platform.isWindows) throw new Error('魔法墙仅支持 Windows 平台')
    if (!this.mwRules.has(ruleId)) throw new Error('规则不存在')
    this.mwRules.delete(ruleId)
  }

  async updateMagicWallRule(rule: MagicWallRuleModel): Promise<void> {
    if (!Platform.isWindows) throw new Error('魔法墙仅支持 Windows 平台')
    this.mwRules.set(rule.ruleId, rule)
  }

  async getMagicWallStatus(): Promise<MagicWallStatus> {
    const rules = [...this.mwRules.values()]
    return {
      isRunning: this.mwRunning,
      activeRules: rules.filter((r) => r.enabled).length,
      totalRules: rules.length,
    }
  }

  async getNtPath(dosPath: string): Promise<string | null> {
    return dosPath.includes('\\') ? dosPath : null
  }
}

function ipToU32(ip: string): number {
  if (ip === '0.0.0.0' || !ip) return 0
  return (
    ip
      .split('.')
      .map(Number)
      .reduce((acc, o) => (acc << 8) + o, 0) >>> 0
  )
}
