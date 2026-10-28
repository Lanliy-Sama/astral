/**
 * 房间导入逻辑 — 对应 room_share_import_dialog.dart
 */
import { services } from '../../lib/core/services/services.svelte'
import { parseImportCode, validateRoom, cleanRoom, netConfigSummary } from '../../lib/utils/shareCodec'
import { snackbar } from '../../lib/ui/snackbar.svelte.ts'
import type { NetworkConfigShare, Room } from '../../lib/core/models/types'
import { roomDialogs } from './roomDialogs.svelte.ts'

/** 从分享码/链接导入 (importRoom) */
export async function importRoom(code: string): Promise<boolean> {
  const s = services()
  const trimmed = code.replace(/\s+/g, '')
  if (!trimmed) {
    snackbar.show({ title: '分享码为空', message: '请提供有效的房间分享码', type: 'error' })
    return false
  }
  if (trimmed.length < 10) {
    snackbar.show({
      title: '分享码格式错误',
      message: '分享码过短或不完整，请检查是否复制完整',
      type: 'error',
    })
    return false
  }
  const room = parseImportCode(trimmed)
  if (!room) {
    snackbar.show({
      title: '分享码解析失败',
      message: '无法解析房间信息，可能是分享码已过期或损坏',
      type: 'error',
    })
    return false
  }
  const invalid = validateRoom(room)
  if (invalid) {
    snackbar.show({ title: '房间数据无效', message: invalid, type: 'error' })
    return false
  }
  const cleaned = cleanRoom(room)

  // 检测网络配置 → 弹确认对话框
  if (cleaned.networkConfigJson) {
    let net: NetworkConfigShare | null = null
    try {
      net = JSON.parse(cleaned.networkConfigJson)
    } catch {
      net = null
    }
    if (net) {
      const lines = netConfigSummary(net)
      roomDialogs.netConfigConfirm = { room: cleaned, lines }
      roomDialogs.netConfirmOpen = true
      return false
    }
  }

  return await finishImport(cleaned, false)
}

/** 确认对话框后的最终导入 */
export async function finishImport(room: Room, applyConfig: boolean): Promise<boolean> {
  const s = services()
  await s.room.addRoom(room)
  await s.room.setRoom(room)

  const msgs: string[] = [`已成功添加并选中房间"${room.name}"`]
  if (room.servers.length > 0) msgs.push(`(已内置 ${room.servers.length} 个服务器)`)
  if (applyConfig && room.networkConfigJson) {
    applyNetworkConfig(room.networkConfigJson)
    msgs.push('✓ 已应用网络配置')
  }
  snackbar.show({ title: '导入成功', message: msgs.join(' '), type: 'success' })
  // 跳转房间 tab + 选中
  s.uiState.goTo('room')
  return true
}

/** 应用网络配置到本机 */
export function applyNetworkConfig(json: string) {
  const s = services()
  try {
    const net = JSON.parse(json) as NetworkConfigShare
    const n = s.networkConfigState
    if (net.dhcp !== null && net.dhcp !== undefined) s.networkConfig.updateDhcp(net.dhcp)
    if (net.proto) s.networkConfig.updateDefaultProtocol(net.proto)
    if (net.enc !== null && net.enc !== undefined) s.networkConfig.updateEnableEncryption(net.enc)
    if (net.lat !== null && net.lat !== undefined) s.networkConfig.updateLatencyFirst(net.lat)
    if (net.dp2p !== null && net.dp2p !== undefined) s.networkConfig.updateDisableP2p(net.dp2p)
    if (net.dudp !== null && net.dudp !== undefined)
      s.networkConfig.updateDisableUdpHolePunching(net.dudp)
    if (net.dtcp !== null && net.dtcp !== undefined)
      s.networkConfig.updateDisableTcpHolePunching(net.dtcp)
    if (net.dsym !== null && net.dsym !== undefined)
      s.networkConfig.updateDisableSymHolePunching(net.dsym)
    if (net.comp !== null && net.comp !== undefined) s.networkConfig.updateDataCompressAlgo(net.comp)
    if (net.kcp !== null && net.kcp !== undefined) s.networkConfig.updateEnableKcpProxy(net.kcp)
    if (net.bind !== null && net.bind !== undefined) s.networkConfig.updateBindDevice(net.bind)
    if (net.tun !== null && net.tun !== undefined) s.networkConfig.updateNoTun(net.tun)
  } catch {
    /* ignore */
  }
}

/** 从剪贴板导入 */
export async function importFromClipboard() {
  try {
    const text = await navigator.clipboard.readText()
    if (!text || !text.trim()) {
      snackbar.show({ title: '剪贴板为空', message: '请先复制房间分享码或链接', type: 'error' })
      return
    }
    importRoom(text)
  } catch {
    snackbar.show({ title: '剪贴板为空', message: '请先复制房间分享码或链接', type: 'error' })
  }
}
