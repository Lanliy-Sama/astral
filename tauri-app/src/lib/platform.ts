/**
 * 平台检测 — 对应 Flutter 的 `Platform.isWindows / isAndroid / ...`
 *
 * Tauri 环境下使用 UA + Tauri OS 信息判断；纯浏览器环境下按 UA 推断。
 * `Platform.isWindows` 在原项目中控制大量条件渲染（广播转发/防火墙/魔法墙/Npcap 等）。
 */

function detectOs(): 'windows' | 'macos' | 'linux' | 'android' | 'ios' | 'unknown' {
  const ua = navigator.userAgent.toLowerCase()
  const tauri = (window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__
  const tauriPlatform: string | undefined = tauri?.plugin?.os?.platform ?? (window as any).__TAURI_OS_PLUGIN__?.platform

  if (tauriPlatform) {
    const p = tauriPlatform.toLowerCase()
    if (p.includes('win')) return 'windows'
    if (p.includes('mac')) return 'macos'
    if (p.includes('linux')) return 'linux'
    if (p.includes('android')) return 'android'
    if (p.includes('ios')) return 'ios'
  }
  if (ua.includes('win')) return 'windows'
  if (ua.includes('mac') && !ua.includes('iphone') && !ua.includes('ipad')) return 'macos'
  if (ua.includes('android')) return 'android'
  if (ua.includes('iphone') || ua.includes('ipad')) return 'ios'
  if (ua.includes('linux') || ua.includes('cros')) return 'linux'
  return 'unknown'
}

const os = detectOs()

export const Platform = {
  get isWindows() {
    return os === 'windows'
  },
  get isLinux() {
    return os === 'linux'
  },
  get isMacOS() {
    return os === 'macos'
  },
  get isAndroid() {
    return os === 'android'
  },
  get isIOS() {
    return os === 'ios'
  },
  /** 桌面三平台（窗口控制、托盘等） */
  get isDesktopPlatform() {
    return os === 'windows' || os === 'macos' || os === 'linux'
  },
  os,
  /** 是否运行在 Tauri 壳中（决定 IPC 走 Tauri command 还是 mock 后端） */
  get isTauri() {
    return !!(window as any).__TAURI_INTERNALS__
  },
}

/** 运行时 OS 名称（用于 UI 展示，如"内核版本"的平台徽章） */
export const localHostname = 'desktop'
