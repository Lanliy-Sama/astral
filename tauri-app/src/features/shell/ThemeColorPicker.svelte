<script lang="ts">
  // ThemeColorPicker — flutter_colorpicker BlockPicker (19 Material 预设色, 5列×4行)
  // + 自定义颜色 HSV 选择器
  import Dialog from '../../lib/ui/Dialog.svelte'
  import Button from '../../lib/ui/Button.svelte'
  import Icon from '../../lib/ui/Icon.svelte'
  import Checkbox from '../../lib/ui/Checkbox.svelte'
  import { themeColorPicker, applyThemeColor } from './themeColorPicker.svelte.ts'
  import { services } from '../../lib/core/services/services.svelte'

  const s = services()

  // BlockPicker 19 个预设色 (Material 调色板主色, flutter_colorpicker 默认)
  const presets = [
    '#F44336',
    '#E91E63',
    '#9C27B0',
    '#673AB7',
    '#3F51B5',
    '#2196F3',
    '#03A9F4',
    '#00BCD4',
    '#009688',
    '#8BC34A',
    '#CDDC39',
    '#FFEB3B',
    '#FFC107',
    '#FF9800',
    '#FF5722',
    '#795548',
    '#9E9E9E',
    '#607D8B',
    '#1565C0',
  ]

  // 进入对话框时记住原色 (取消时恢复)
  let entryColor = $state('#2196F3')
  let previewColor = $state('#2196F3')

  $effect(() => {
    if (themeColorPicker.blockOpen) {
      entryColor = s.themeState.themeColor
      previewColor = s.themeState.themeColor
    }
  })

  function isLight(hex: string): boolean {
    const h = hex.replace('#', '')
    const r = parseInt(h.slice(0, 2), 16)
    const g = parseInt(h.slice(2, 4), 16)
    const b = parseInt(h.slice(4, 6), 16)
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6
  }

  function select(hex: string) {
    previewColor = hex
    applyThemeColor(hex) // 实时全应用预览 + 持久化
  }

  function cancelBlock() {
    if (previewColor !== entryColor) applyThemeColor(entryColor)
    themeColorPicker.blockOpen = false
  }

  // ---------- 自定义颜色 (HSV) ----------
  let hue = $state(210)
  let sat = $state(100)
  let val = $state(100)

  $effect(() => {
    if (themeColorPicker.advancedOpen) {
      const { h, s: ss, v } = hexToHsv(s.themeState.themeColor)
      hue = h
      sat = ss
      val = v
      advEntry = s.themeState.themeColor
    }
  })
  let advEntry = $state('#2196F3')

  let advColor = $derived(hsvToHex(hue, sat, val))
  let draggingSv = false
  let draggingHue = false

  let svEl = $state<HTMLElement | null>(null)
  let hueEl = $state<HTMLElement | null>(null)

  function hexToHsv(hex: string): { h: number; s: number; v: number } {
    const h = hex.replace('#', '')
    const r = parseInt(h.slice(0, 2), 16) / 255
    const g = parseInt(h.slice(2, 4), 16) / 255
    const b = parseInt(h.slice(4, 6), 16) / 255
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const d = max - min
    let hh = 0
    if (d !== 0) {
      if (max === r) hh = ((g - b) / d) % 6
      else if (max === g) hh = (b - r) / d + 2
      else hh = (r - g) / d + 4
      hh *= 60
      if (hh < 0) hh += 360
    }
    return { h: hh, s: max === 0 ? 0 : d / max, v: max }
  }

  function hsvToHex(h: number, s: number, v: number): string {
    const f = (n: number) => {
      const k = (n + h / 60) % 6
      const vv = v - v * s * Math.max(0, Math.min(k, 4 - k, 1))
      return Math.round(vv * 255)
        .toString(16)
        .padStart(2, '0')
    }
    return `#${f(5)}${f(3)}${f(1)}`
  }

  function applyAdv() {
    applyThemeColor(advColor)
  }

  function onSvPointer(e: PointerEvent) {
    if (!svEl) return
    const r = svEl.getBoundingClientRect()
    sat = Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100))
    val = Math.min(100, Math.max(0, 100 - ((e.clientY - r.top) / r.height) * 100))
    applyAdv()
  }

  function onHuePointer(e: PointerEvent) {
    if (!hueEl) return
    const r = hueEl.getBoundingClientRect()
    hue = Math.min(360, Math.max(0, ((e.clientY - r.top) / r.height) * 360))
    applyAdv()
  }

  function bindSv(el: HTMLElement) {
    svEl = el
    el.addEventListener('pointerdown', (e) => {
      draggingSv = true
      ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
      onSvPointer(e)
    })
    el.addEventListener('pointermove', (e) => draggingSv && onSvPointer(e))
    el.addEventListener('pointerup', () => (draggingSv = false))
  }

  function bindHue(el: HTMLElement) {
    hueEl = el
    el.addEventListener('pointerdown', (e) => {
      draggingHue = true
      ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
      onHuePointer(e)
    })
    el.addEventListener('pointermove', (e) => draggingHue && onHuePointer(e))
    el.addEventListener('pointerup', () => (draggingHue = false))
  }

  function hsvToRgb(hex: string): number[] {
    const h = hex.replace('#', '')
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ]
  }

  function cancelAdv() {
    if (advColor !== advEntry) applyThemeColor(advEntry)
    themeColorPicker.advancedOpen = false
  }
</script>

<!-- BlockPicker: 预设色 -->
<Dialog bind:open={themeColorPicker.blockOpen} radius={28}>
  <div class="dlg-title headline-small">选择主题颜色</div>
  <div class="dlg-content">
    <div class="block-grid">
      {#each presets as hex (hex)}
        <button
          class="swatch"
          class:selected={previewColor.toLowerCase() === hex.toLowerCase()}
          style="--c: {hex}"
          onclick={() => select(hex)}
        >
          {#if previewColor.toLowerCase() === hex.toLowerCase()}
            <Icon name="check" size={20} color={isLight(hex) ? '#000000DE' : '#fff'} />
          {/if}
        </button>
      {/each}
    </div>
    <div style="height:10px"></div>
    <Button
      variant="elevated"
      icon="color_lens"
      fullwidth
      onclick={() => {
        themeColorPicker.blockOpen = false
        themeColorPicker.advancedOpen = true
      }}
    >
      自定义颜色
    </Button>
  </div>
  <div class="dlg-actions">
    <Button variant="text" onclick={cancelBlock}>取消</Button>
    <Button variant="text" onclick={() => (themeColorPicker.blockOpen = false)}>确定</Button>
  </div>
</Dialog>

<!-- 自定义颜色: HSV -->
<Dialog bind:open={themeColorPicker.advancedOpen} radius={28}>
  <div class="dlg-title headline-small">自定义颜色</div>
  <div class="dlg-content">
    <div class="hsv-layout">
      <!-- SV 区域 (pickerAreaHeightPercent 0.8) -->
      <div class="sv-area" use:bindSv style="background:
          linear-gradient(to top, #000, transparent),
          linear-gradient(to right, #fff, {hsvToHex(hue, 100, 100)});">
        <div class="sv-thumb" style="left: {sat}%; top: {100 - val}%"></div>
      </div>
      <!-- 色相竖条 -->
      <div class="hue-area" use:bindHue>
        <div class="hue-thumb" style="top: {hue / 3.6}%; background: {hsvToHex(hue, 100, 100)}"></div>
      </div>
    </div>
    <!-- RGB / HEX 标签 -->
    <div class="color-labels">
      {#each hsvToRgb(advColor) as c}
        <span class="c-label">{c}</span>
      {/each}
      <span class="c-label hex">{advColor.toUpperCase()}</span>
    </div>
  </div>
  <div class="dlg-actions">
    <Button variant="text" onclick={cancelAdv}>取消</Button>
    <Button variant="text" onclick={() => (themeColorPicker.advancedOpen = false)}
      >确定</Button
    >
  </div>
</Dialog>

<style>
  .dlg-title {
    padding: 24px 24px 16px;
  }
  .dlg-content {
    padding: 0 24px;
    display: flex;
    flex-direction: column;
  }
  .dlg-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 24px;
  }
  .block-grid {
    width: 300px;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
  }
  .swatch {
    width: 46px;
    height: 46px;
    margin: 7px;
    border-radius: 50%;
    background: var(--c);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: box-shadow 0.15s ease;
  }
  .swatch:hover {
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--c) 40%, transparent);
  }
  .swatch.selected {
    box-shadow:
      0 0 10px 1.5px color-mix(in srgb, var(--c) 80%, transparent),
      0 0 0 1px var(--c);
  }
  .hsv-layout {
    display: flex;
    gap: 16px;
    width: 320px;
  }
  .sv-area {
    flex: 1;
    height: 256px;
    border-radius: 10px;
    position: relative;
    cursor: crosshair;
    touch-action: none;
  }
  .sv-thumb {
    position: absolute;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 3px solid #fff;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
    transform: translate(-50%, -50%);
    pointer-events: none;
  }
  .hue-area {
    width: 24px;
    height: 256px;
    border-radius: 12px;
    background: linear-gradient(
      to bottom,
      #ff0000,
      #ffff00,
      #00ff00,
      #00ffff,
      #0000ff,
      #ff00ff,
      #ff0000
    );
    position: relative;
    cursor: crosshair;
    touch-action: none;
  }
  .hue-thumb {
    position: absolute;
    left: 50%;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 4px solid #fff;
    background: var(--h, #f00);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
    transform: translate(-50%, -50%);
    pointer-events: none;
  }
  .color-labels {
    display: flex;
    gap: 12px;
    margin-top: 16px;
    flex-wrap: wrap;
  }
  .c-label {
    font-size: 13px;
    color: var(--md-sys-color-on-surface-variant);
    background: var(--md-sys-color-surface-container-highest);
    padding: 4px 10px;
    border-radius: 8px;
  }
</style>
