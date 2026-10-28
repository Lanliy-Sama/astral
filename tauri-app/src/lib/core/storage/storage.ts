/**
 * 存储层 — 复刻 Isar (app_data.dart + DAO 默认种子逻辑)
 *
 * Tauri WebView 与浏览器中均使用 localStorage 持久化;
 * 集合语义(自增 id / 按 sortOrder 查询 / 单例 id=1)与 Isar 对齐。
 */

const PREFIX = 'astral.'

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}

/** 生成下一个自增 id (Isar.autoIncrement 语义: max+1) */
export function nextId(items: { id: number }[]): number {
  return items.reduce((m, i) => Math.max(m, i.id), 0) + 1
}

/** 6 位随机数字 — 默认房间的 roomName/password (RoomDao.init) */
export function randomSixDigits(): string {
  let s = ''
  for (let i = 0; i < 6; i++) s += Math.floor(Math.random() * 10)
  return s
}

/**
 * 房间集合 — RoomDao
 * 空表时创建"默认房间": encrypted=true, roomName/password=6位随机数字, messageKey=''
 */
export const RoomStore = {
  getAll(): import('./models/types').Room[] {
    const rooms = readJson<import('./models/types').Room[]>('rooms', [])
    if (rooms.length === 0) {
      const seed: import('./models/types').Room = {
        id: 1,
        name: '默认房间',
        encrypted: true,
        roomName: randomSixDigits(),
        password: randomSixDigits(),
        messageKey: '',
        tags: [],
        sortOrder: 0,
        servers: [],
        customParam: '',
        networkConfigJson: '',
      }
      writeJson('rooms', [seed])
      return [seed]
    }
    return rooms
  },
  put(rooms: import('./models/types').Room[]) {
    writeJson('rooms', rooms)
  },
}

/**
 * 服务器集合 — ServerDao
 * 废弃域名清理 + 空表默认种子: [小探][可中转A] js.629957.xyz:11012 (tcp, enable=false)
 */
const DEPRECATED_DOMAINS = [
  // 对应 ServerDao.init 中的废弃域名清理列表 (此处保留种子服务器之外的清理语义)
]

export const ServerStore = {
  getAll(): import('./models/types').ServerMod[] {
    let servers = readJson<import('./models/types').ServerMod[]>('servers', [])
    servers = servers.filter((s) => !DEPRECATED_DOMAINS.includes(s.url))
    if (servers.length === 0) {
      const seed: import('./models/types').ServerMod = {
        id: 1,
        name: '[小探][可中转A]',
        url: 'js.629957.xyz:11012',
        enable: false,
        tcp: true,
        faketcp: false,
        udp: false,
        ws: false,
        wss: false,
        quic: false,
        wg: false,
        txt: false,
        srv: false,
        http: false,
        https: false,
        sortOrder: 0,
      }
      writeJson('servers', [seed])
      return [seed]
    }
    return servers
  },
  put(servers: import('./models/types').ServerMod[]) {
    writeJson('servers', servers)
  },
}

/** 单例 (id=1) 通用读写: ThemeSettings / NetConfig / AllSettings */
export const SingletonStore = {
  get<T>(key: string, fallback: T): T {
    return readJson<T>(key, fallback)
  },
  put(key: string, value: unknown) {
    writeJson(key, value)
  },
}

/** MagicWall 集合 */
export const MagicWallStore = {
  getGroups(): import('./models/types').MagicWallGroupModel[] {
    return readJson<import('./models/types').MagicWallGroupModel[]>('mw.groups', [])
  },
  putGroups(groups: import('./models/types').MagicWallGroupModel[]) {
    writeJson('mw.groups', groups)
  },
  getRules(): import('./models/types').MagicWallRuleModel[] {
    return readJson<import('./models/types').MagicWallRuleModel[]>('mw.rules', [])
  },
  putRules(rules: import('./models/types').MagicWallRuleModel[]) {
    writeJson('mw.rules', rules)
  },
}

/** 屏蔽服务器列表 (blocked_servers.dart) — 地址显示 *** 且禁编辑 */
export const BLOCKED_SERVERS: string[] = ['js.629957.xyz:11012', 'nmg.629957.xyz:11010', 'nmg.629957.xyz:11010']

export function isBlockedServer(url: string): boolean {
  return BLOCKED_SERVERS.includes(url)
}
