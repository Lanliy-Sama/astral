/**
 * 共享 UI 工具 — platform_version_parser / peer_connection_style / nat 显示 / version_util
 */
import type { KVNodeInfo } from '../core/models/types'

// ---------- platform_version_parser.dart ----------
export function getVersionNumber(version: string): string {
  return version.split('|')[0]?.trim() ?? ''
}

export function parsePlatform(version: string): { name: string; icon: string } {
  const parts = version.split('|')
  if (parts.length < 2 || !parts[1]?.trim()) return { name: '', icon: 'memory' }
  const p = parts[1].trim().toLowerCase()
  if (p.includes('windows')) return { name: 'Windows', icon: 'window' }
  if (p.includes('linux')) return { name: 'Linux', icon: 'terminal' }
  if (p.includes('android')) return { name: 'Android', icon: 'android' }
  if (p.includes('macos') || p.includes('mac')) return { name: 'macOS', icon: 'phone_iphone' }
  if (p.includes('ios')) return { name: 'iOS', icon: 'phone_iphone' }
  return { name: parts[1].trim(), icon: 'devices' }
}

// ---------- peer_connection_style.dart ----------
export const M2 = {
  green: '#4CAF50',
  orange: '#FF9800',
  red: '#F44336',
  deepPurple: '#673AB7',
  grey: '#9E9E9E',
  blue: '#2196F3',
}

export function mapConnectionType(cost: number, ip: string, thisIp: string): string {
  if (ip === '0.0.0.0') return '服务器'
  if (thisIp && ip === thisIp) return '本机'
  if (cost === 1) return '直链'
  if (cost >= 2) return '中转'
  return '未知'
}

export function connectionTypeColor(type: string): string {
  switch (type) {
    case '服务器':
      return M2.deepPurple
    case '直链':
      return M2.green
    case '中转':
      return M2.orange
    case '本机':
      return 'var(--md-sys-color-primary)'
    default:
      return M2.grey
  }
}

export function connectionTypeIcon(type: string): string {
  switch (type) {
    case '服务器':
      return 'dns'
    case '直链':
      return 'link'
    case '中转':
      return 'swap_horiz'
    case '本机':
      return 'computer'
    default:
      return 'device_unknown'
  }
}

export function latencyColor(ms: number): string {
  if (ms < 50) return M2.green
  if (ms < 100) return M2.orange
  return M2.red
}

export function lossColor(rate: number): string {
  if (rate < 1.0) return M2.green
  if (rate < 5.0) return M2.orange
  return M2.red
}

export function formatTunnelProto(proto: string): string {
  return proto
    .split(',')
    .map((p) => p.trim())
    .map((p) => (p === 'tcp' ? 'tcp4' : p === 'udp' ? 'udp4' : p))
    .join(',')
}

export function isServerNode(node: KVNodeInfo): boolean {
  return node.hostname.startsWith('PublicServer_') || node.ipv4 === '0.0.0.0'
}

export function displayName(node: KVNodeInfo): string {
  return node.hostname.replace(/^PublicServer_/, '')
}

export function formatBytes(bytes: bigint): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let v = Number(bytes)
  let u = 0
  while (v >= 1024 && u < units.length - 1) {
    v /= 1024
    u++
  }
  // 整数直接输出, 否则保留两位小数并去掉尾部 .0+
  if (Number.isInteger(v)) return `${v}${units[u]}`
  return `${parseFloat(v.toFixed(2))}${units[u]}`
}

// ---------- MiniUserCard NAT 等级制 (魔兽风格品质色) ----------
export function miniNatInfo(nat: string): { label: string; icon: string; color: string } {
  const n = nat ?? ''
  if (!n || n === 'Unknown') return { label: '未知', icon: 'help_outline', color: M2.grey }
  if (n === 'OpenInternet' || n === 'NoPat')
    return { label: '传奇', icon: 'workspace_premium', color: '#FF6B00' }
  if (n === 'FullCone') return { label: '史诗', icon: 'military_tech', color: '#A335EE' }
  if (n === 'Restricted' || n === 'PortRestricted')
    return { label: '优质', icon: 'verified', color: '#0070DD' }
  if (n === 'SymUdpFirewall' || n === 'SymmetricEasyInc' || n === 'SymmetricEasyDec')
    return { label: '普通', icon: 'circle', color: '#1EFF00' }
  if (n === 'Symmetric') return { label: '困难', icon: 'block', color: '#9D9D9D' }
  return { label: '未知', icon: 'help_outline', color: M2.grey }
}

// ---------- AllUserCard NAT 技术制 ----------
export function allNatInfo(nat: string): { label: string; icon: string; color: string } {
  const n = nat ?? ''
  const c = (label: string, icon: string, color: string) => ({ label, icon, color })
  if (n.includes('开放') || n.includes('全锥形')) return c('开放网络' === n ? '开放网络' : n.includes('全锥形') ? '全锥形' : '开放网络', 'public', M2.green)
  if (n.includes('端口受限')) return c('端口受限锥形', 'security', M2.orange)
  if (n.includes('受限')) return c('受限锥形', 'shield', M2.orange)
  if (n.includes('递增')) return c('对称递增型', 'trending_up', M2.red)
  if (n.includes('递减')) return c('对称递减型', 'trending_down', M2.red)
  if (n.includes('防火墙')) return c('对称UDP防火墙', 'fireplace', M2.red)
  if (n.includes('对称')) return c('对称型', 'sync_alt', M2.red)
  if (n.includes('无PAT') || n === 'NoPat') return c('无PAT', 'router', M2.green)
  if (!n || n === 'Unknown') return c('未知', 'help_outline', M2.grey)
  return c(n, 'help_outline', M2.grey)
}

// ---------- version_util.dart ----------
export function formatVersionDisplay(current: string, latest: string | null): string {
  if (latest && isNewerVersionSafe(latest, current)) {
    return `${current.replace(/^v/, '')} -> ${latest.replace(/^v/, '')}`
  }
  return current.replace(/^v/, '')
}

export function isNewerVersionSafe(latest: string, current: string): boolean {
  const norm = (v: string) => v.replace(/^v/i, '')
  const a = norm(latest).split(/[.\-+]/).filter(Boolean)
  const b = norm(current).split(/[.\-+]/).filter(Boolean)
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = parseInt(a[i] ?? '0') || 0
    const y = parseInt(b[i] ?? '0') || 0
    if (x > y) return true
    if (x < y) return false
  }
  return false
}

// ---------- IPv4 校验 (ip_utils.dart 语义: 可选 /掩码 0-32) ----------
export function isValidIpv4WithMask(input: string): boolean {
  if (!input) return false
  const parts = input.split('/')
  if (parts.length > 2) return false
  const ip = parts[0]
  if (!isValidIpv4(ip)) return false
  if (parts.length === 2) {
    const mask = Number(parts[1])
    if (!Number.isInteger(mask) || mask < 0 || mask > 32) return false
  }
  return true
}

export function isValidIpv4(ip: string): boolean {
  const segs = ip.split('.')
  if (segs.length !== 4) return false
  return segs.every((s) => {
    if (!/^\d{1,3}$/.test(s)) return false
    const n = Number(s)
    return n >= 0 && n <= 255
  })
}
