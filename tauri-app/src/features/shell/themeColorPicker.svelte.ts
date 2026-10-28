/**
 * 主题颜色选择器状态 — showThemeColorPicker / 高级选择器
 */
import { services } from '../../lib/core/services/services.svelte'

class ThemeColorPickerState {
  blockOpen = $state(false)
  advancedOpen = $state(false)

  open() {
    this.blockOpen = true
  }
}

export const themeColorPicker = new ThemeColorPickerState()

export function getThemeColorPicker() {
  return themeColorPicker
}

export async function applyThemeColor(hex: string) {
  await services().theme.updateThemeColor(hex)
}
