/**
 * Material 3 色彩方案生成
 *
 * 对应 Flutter `ThemeData(useMaterial3: true, colorSchemeSeed: themeColor, brightness: ...)`。
 * Flutter 的 `ColorScheme.fromSeed` 使用 TonalSpot 方案（contrastLevel 0），
 * 这里通过 @material/material-color-utilities 的 SchemeTonalSpot 生成完全一致的色板，
 * 并输出为 CSS 自定义属性挂到 :root，全局组件通过 var(--md-sys-color-xxx) 消费。
 */
import {
  argbFromHex,
  hexFromArgb,
  Hct,
  MaterialDynamicColors,
  SchemeTonalSpot,
} from '@material/material-color-utilities'

export type ThemeMode = 'system' | 'light' | 'dark'

/** Flutter Colors.blue (#2196F3) — themeState 默认种子色 */
export const DEFAULT_SEED = '#2196F3'

/** 需要导出的 M3 色彩角色（驼峰 → CSS 变量名） */
const ROLES = [
  'primary',
  'onPrimary',
  'primaryContainer',
  'onPrimaryContainer',
  'secondary',
  'onSecondary',
  'secondaryContainer',
  'onSecondaryContainer',
  'tertiary',
  'onTertiary',
  'tertiaryContainer',
  'onTertiaryContainer',
  'error',
  'onError',
  'errorContainer',
  'onErrorContainer',
  'surface',
  'surfaceDim',
  'surfaceBright',
  'surfaceContainerLowest',
  'surfaceContainerLow',
  'surfaceContainer',
  'surfaceContainerHigh',
  'surfaceContainerHighest',
  'onSurface',
  'onSurfaceVariant',
  'outline',
  'outlineVariant',
  'inverseSurface',
  'inverseOnSurface',
  'inversePrimary',
  'shadow',
  'scrim',
] as const

type SchemeMap = Record<(typeof ROLES)[number], string>

function buildScheme(seedHex: string, dark: boolean): SchemeMap {
  const hct = Hct.fromInt(argbFromHex(seedHex))
  const scheme = new SchemeTonalSpot(hct, dark, 0.0)
  const out: Record<string, string> = {}
  for (const role of ROLES) {
    const dc = (MaterialDynamicColors as any)[
      role === 'scrim' ? 'scrim' : role
    ]
    out[role] = hexFromArgb(dc.getArgb(scheme))
  }
  return out as SchemeMap
}

function kebab(name: string): string {
  return name.replace(/([A-Z])/g, '-$1').toLowerCase()
}

/** 系统是否偏好暗色 */
export function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/**
 * 将指定种子色 + 明暗模式渲染为 :root 的 CSS 变量，
 * 并记录 data-theme 与原色值（供 JS 侧直接读取）。
 */
export function applyThemeToDocument(seedHex: string, mode: ThemeMode) {
  const dark = mode === 'dark' || (mode === 'system' && systemPrefersDark())
  const scheme = buildScheme(seedHex, dark)
  const root = document.documentElement
  for (const [role, hex] of Object.entries(scheme)) {
    root.style.setProperty(`--md-sys-color-${kebab(role)}`, hex)
  }
  // Flutter M3 中 scrim/遮罩实际为黑色半透明；CanvasJump 等对话框遮罩 = Colors.black54
  root.setAttribute('data-theme', dark ? 'dark' : 'light')
  root.setAttribute('data-seed', seedHex)
}

/** 读取当前生效的 M3 色彩角色（JS 侧使用，如拓扑图 Canvas 绘制） */
export function readColorRole(role: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(
    `--md-sys-color-${kebab(role)}`,
  )
  return v.trim() || '#000000'
}

/** 16进制颜色 → rgba(.. , alpha) — 对应 Flutter `Color.withValues(alpha: x)` */
export function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
