/**
 * RoomShareCodec — 对应 core/room/room_share_codec.dart
 * 分享码 = base64url(gzip(utf8(json))) 去除 '=' 填充
 * 链接 = astral://room?code={分享码}
 */
import { gzipSync, gunzipSync } from 'fflate'
import type { NetworkConfigShare, Room } from '../core/models/types'

const APP_SCHEME = 'astral'
const ROOM_PATH = 'room'

interface ShareJson {
  n: string
  r: string
  p: string
  m: string
  e: 0 | 1
  s?: string[]
  c?: string
  net?: Record<string, any>
}

/** NetworkConfigShare 的短键映射 */
const NET_KEYS: [keyof NetworkConfigShare, string][] = [
  ['dhcp', 'dhcp'],
  ['proto', 'proto'],
  ['enc', 'enc'],
  ['lat', 'lat'],
  ['dp2p', 'dp2p'],
  ['dudp', 'dudp'],
  ['dtcp', 'dtcp'],
  ['dsym', 'dsym'],
  ['comp', 'comp'],
  ['kcp', 'kcp'],
  ['bind', 'bind'],
  ['tun', 'tun'],
]

export function encodeShareCode(room: Room): string {
  const json: ShareJson = {
    n: room.name,
    r: room.roomName,
    p: room.password,
    m: room.messageKey,
    e: room.encrypted ? 1 : 0,
  }
  if (room.servers.length > 0) json.s = room.servers
  if (room.customParam) json.c = room.customParam
  if (room.networkConfigJson) {
    try {
      json.net = JSON.parse(room.networkConfigJson)
    } catch {
      /* ignore */
    }
  }
  const text = JSON.stringify(json)
  const compressed = gzipSync(new TextEncoder().encode(text))
  let b64 = bytesToBase64Url(compressed)
  b64 = b64.replace(/=+$/, '')
  return b64
}

export function decodeShareCode(code: string): Room | null {
  try {
    let c = code.replace(/\s+/g, '')
    // 按 %4 补 '='
    const pad = (4 - (c.length % 4)) % 4
    if (pad > 0) c += '='.repeat(pad)
    const bytes = base64UrlToBytes(c)
    const text = new TextDecoder().decode(gunzipSync(bytes))
    const json = JSON.parse(text) as ShareJson
    const room: Room = {
      id: 0,
      name: json.n ?? '',
      encrypted: json.e === 1,
      roomName: json.r ?? '',
      password: json.p ?? '',
      messageKey: json.m ?? '',
      tags: [],
      sortOrder: 0,
      servers: json.s ?? [],
      customParam: json.c ?? '',
      networkConfigJson: json.net ? JSON.stringify(json.net) : '',
    }
    return room
  } catch {
    return null
  }
}

export function generateShareLink(room: Room): string {
  return `${APP_SCHEME}://${ROOM_PATH}?code=${encodeShareCode(room)}`
}

export function generateShareText(room: Room): string {
  const link = generateShareLink(room)
  const lines = [
    '🎮 Astral 房间分享',
    '',
    `🏠 房间：${room.name}`,
    room.encrypted ? '🔒 加密房间' : '🔓 公开房间',
  ]
  if (room.tags.length > 0) lines.push(`🏷️ ${room.tags.join(', ')}`)
  const opts: string[] = []
  if (room.servers.length > 0) opts.push('✓ 携带服务器列表')
  if (room.networkConfigJson) opts.push('✓ 携带网络配置')
  if (opts.length > 0) lines.push(`📦 分享选项：${opts.join(' / ')}`)
  lines.push(`🔗 分享链接：${link}`)
  lines.push('')
  lines.push('📖 使用说明：')
  lines.push('1. 确保已安装 Astral 应用')
  lines.push('2. 点击上方链接自动导入房间')
  lines.push('3. 或复制分享码在应用内手动导入')
  lines.push('')
  lines.push('⏰ 分享链接有效期：30天')
  return lines.join('\n')
}

/** validateRoom — 校验规则照抄 */
export function validateRoom(room: Room): string | null {
  if (!room.name || room.name.length > 50 || /[<>:"/\\|?*]/.test(room.name)) {
    return '房间名称无效'
  }
  if (!room.encrypted) {
    if (!room.roomName || room.roomName.length > 100) return '房间号无效'
  }
  if (room.password.length > 100) return '房间密码无效'
  if (room.tags.length > 10) return '标签数量过多'
  for (const tag of room.tags) {
    if (!tag || tag.length > 20 || /[<>:"/\\|?*]/.test(tag)) return '标签无效'
  }
  return null
}

/** cleanRoom — trim 字段、过滤空 tag */
export function cleanRoom(room: Room): Room {
  return {
    ...room,
    name: room.name.trim(),
    roomName: room.roomName.trim(),
    password: room.password.trim(),
    messageKey: room.messageKey.trim(),
    tags: room.tags.map((t) => t.trim()).filter(Boolean),
  }
}

/** 从链接或分享码导入 */
export function parseImportCode(input: string): Room | null {
  let code = input.trim()
  if (code.startsWith('astral://')) {
    try {
      const url = new URL(code)
      if (url.host !== ROOM_PATH && url.pathname.replace('/', '') !== ROOM_PATH) return null
      code = url.searchParams.get('code') ?? ''
    } catch {
      return null
    }
  }
  return decodeShareCode(code)
}

/** NetworkConfigShare ↔ 可读摘要 */
export function netConfigSummary(net: NetworkConfigShare): string[] {
  const lines: string[] = []
  const map: [boolean | null | number | string | undefined, string][] = [
    [net.dhcp, 'DHCP'],
    [net.proto, `默认协议: ${net.proto}`],
    [net.enc, '加密'],
    [net.lat, '延迟优先'],
    [net.dp2p, '禁用P2P'],
    [net.dudp, '禁用UDP打洞'],
    [net.dtcp, '禁用TCP打洞'],
    [net.dsym, '禁用对称打洞'],
    [net.comp === 2 ? 2 : null, '数据压缩(Zstd)'],
    [net.kcp, 'KCP代理'],
    [net.bind, '绑定设备'],
    [net.tun, '禁用TUN'],
  ]
  for (const [v, label] of map) {
    if (v === true || v === 2) lines.push(label)
    else if (typeof v === 'string' && v) lines.push(label)
  }
  return lines
}

/** 从当前 NetworkConfigState 生成 NetworkConfigShare (勾选项) */
export function netConfigFromCurrent(
  selected: Record<string, boolean>,
  state: {
    dhcp: boolean
    defaultProtocol: string
    enableEncryption: boolean
    latencyFirst: boolean
    disableP2p: boolean
    disableUdpHolePunching: boolean
    disableTcpHolePunching: boolean
    disableSymHolePunching: boolean
    dataCompressAlgo: number
    enableKcpProxy: boolean
    bindDevice: boolean
    noTun: boolean
  },
): NetworkConfigShare {
  const pick = <T,>(key: string, v: T): T | null => (selected[key] ? v : null)
  return {
    dhcp: pick('dhcp', state.dhcp),
    proto: pick('defaultProtocol', state.defaultProtocol),
    enc: pick('enableEncryption', state.enableEncryption),
    lat: pick('latencyFirst', state.latencyFirst),
    dp2p: pick('disableP2p', state.disableP2p),
    dudp: pick('disableUdpHolePunching', state.disableUdpHolePunching),
    dtcp: pick('disableTcpHolePunching', state.disableTcpHolePunching),
    dsym: pick('disableSymHolePunching', state.disableSymHolePunching),
    comp: pick('dataCompressAlgo', state.dataCompressAlgo),
    kcp: pick('enableKcpProxy', state.enableKcpProxy),
    bind: pick('bindDevice', state.bindDevice),
    tun: pick('noTun', state.noTun),
  }
}

// ---------- base64url ----------
function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_')
}

function base64UrlToBytes(str: string): Uint8Array {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}
