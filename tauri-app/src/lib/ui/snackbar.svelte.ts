/**
 * SnackBar 系统 — 对应 Flutter SnackBar(behavior: floating) + AppSnackBars
 *
 * AppSnackBars: success 绿 shade700 / error 红 shade700 / info 蓝 shade700
 * 自定义(连接守卫等): inverseSurface 底
 */
export type SnackType = 'success' | 'error' | 'info' | 'custom'

export interface SnackAction {
  label: string
  onclick: () => void
  color?: string
}

export interface SnackRequest {
  title: string
  message?: string
  type?: SnackType
  backgroundColor?: string
  icon?: string
  duration?: number
  action?: SnackAction
}

class SnackBarState {
  current = $state<({ id: number } & SnackRequest) | null>(null)
  private timer: ReturnType<typeof setTimeout> | null = null

  show(req: SnackRequest) {
    if (this.timer) clearTimeout(this.timer)
    this.current = { id: Date.now() + Math.random(), ...req }
    const duration = req.duration ?? 3000
    this.timer = setTimeout(() => (this.current = null), duration)
  }

  dismiss() {
    if (this.timer) clearTimeout(this.timer)
    this.current = null
  }
}

export const snackbar = new SnackBarState()

const PRESETS: Record<
  'success' | 'error' | 'info',
  { bg: string; icon: string; duration: number }
> = {
  success: { bg: '#388E3C', icon: 'check_circle_outline', duration: 3000 },
  error: { bg: '#D32F2F', icon: 'error_outline', duration: 4000 },
  info: { bg: '#1976D2', icon: 'info_outline', duration: 3000 },
}

export function success(title: string, message?: string, duration?: number) {
  snackbar.show({ title, message, type: 'success', duration: duration ?? PRESETS.success.duration })
}
export function error(title: string, message?: string, duration?: number) {
  snackbar.show({ title, message, type: 'error', duration: duration ?? PRESETS.error.duration })
}
export function info(title: string, message?: string, duration?: number) {
  snackbar.show({ title, message, type: 'info', duration: duration ?? PRESETS.info.duration })
}
export function custom(req: SnackRequest) {
  snackbar.show(req)
}

export function presetOf(req: SnackRequest) {
  if (req.type && req.type !== 'custom' && PRESETS[req.type]) {
    return PRESETS[req.type]
  }
  return null
}
