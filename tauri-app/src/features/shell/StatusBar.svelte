<script lang="ts">
  // StatusBar — 对应 status_bar.dart: 高36, primaryContainer底, 渐变标题, 主题/语言/颜色/窗口控制
  import Icon from '../../lib/ui/Icon.svelte'
  import IconButton from '../../lib/ui/IconButton.svelte'
  import Menu from '../../lib/ui/Menu.svelte'
  import WindowControls from './WindowControls.svelte'
  import { services } from '../../lib/core/services/services.svelte'
  import { i18n, t } from '../../lib/i18n/index.svelte'
  import { withAlpha } from '../../lib/theme/scheme'
  import { getThemeColorPicker } from './themeColorPicker.svelte.ts'
  import type { ThemeMode } from '../../lib/theme/scheme'
  import { Platform } from '../../lib/platform'

  const s = services()

  const isChristmasSeason = (() => {
    const now = new Date()
    return now.getMonth() === 11 && now.getDate() >= 22 && now.getDate() <= 28
  })()

  // 主题模式菜单
  let themeMenuOpen = $state(false)
  let themeMenuAnchor = $state<HTMLElement | null>(null)

  function themeModeIcon(mode: ThemeMode): string {
    switch (mode) {
      case 'light':
        return 'wb_sunny'
      case 'dark':
        return 'nightlight_round'
      default:
        return 'auto_mode'
    }
  }
  function themeModeText(mode: ThemeMode): string {
    switch (mode) {
      case 'light':
        return '亮色模式'
      case 'dark':
        return '暗色模式'
      default:
        return '跟随系统'
    }
  }

  // 语言菜单
  let langMenuOpen = $state(false)
  let langMenuAnchor = $state<HTMLElement | null>(null)

  function themeModeItems(): any[] {
    const modes: ThemeMode[] = ['system', 'light', 'dark']
    return modes.map((m) => ({
      value: m,
      label: themeModeText(m),
      icon: themeModeIcon(m),
      iconSize: 18,
      check: s.themeState.themeMode === m,
    }))
  }

  let dragging = false
  async function startDrag() {
    if (!Platform.isTauri) return
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window')
      await getCurrentWindow().startDragging()
    } catch {
      /* ignore */
    }
  }
</script>

<div class="status-bar" onpointerdown={startDrag}>
  <div class="title">{s.appSettingsState.appName}</div>
  <div class="spacer"></div>
  {#if isChristmasSeason}
    <div class="christmas">
      <span>爱你们的Kevin</span>
      <span class="tree">🎄</span>
      <span>圣诞快乐</span>
      <span class="santa">🎅</span>
    </div>
  {/if}
  <button
    bind:this={themeMenuAnchor}
    class="bar-icon"
    title={themeModeText(s.themeState.themeMode)}
    onclick={() => (themeMenuOpen = !themeMenuOpen)}
  >
    <Icon name={themeModeIcon(s.themeState.themeMode)} size={20} />
  </button>
  <Menu
    bind:open={themeMenuOpen}
    anchor={themeMenuAnchor}
    items={themeModeItems()}
    onselect={(v) => s.theme.updateThemeMode(v)}
  />
  <button
    class="bar-icon"
    title="选择主题颜色"
    onclick={() => getThemeColorPicker().open()}
  >
    <Icon name="color_lens" size={20} />
  </button>
  <button
    bind:this={langMenuAnchor}
    class="bar-icon"
    title={t('language')}
    onclick={() => (langMenuOpen = !langMenuOpen)}
  >
    <Icon name="language" size={20} />
  </button>
  <Menu
    bind:open={langMenuOpen}
    anchor={langMenuAnchor}
    items={[
      { value: 'zh', snippet: null as any, label: '🇨🇳  简体中文' },
      { value: 'en', label: '🇺🇸  English' },
    ]}
    onselect={(v) => i18n.setLocale(v)}
  />
  {#if Platform.isDesktopPlatform}
    <WindowControls />
  {/if}
</div>

<style>
  .status-bar {
    height: 36px;
    flex-shrink: 0;
    background: var(--md-sys-color-primary-container);
    color: var(--md-sys-color-on-primary-container);
    display: flex;
    align-items: center;
    padding: 0 4px 0 16px;
    user-select: none;
  }
  .title {
    font-size: 18px;
    font-weight: 700;
    letter-spacing: 1.5px;
    /* ShaderMask: primary → tertiary 渐变 */
    background: linear-gradient(
      to right,
      var(--md-sys-color-primary),
      var(--md-sys-color-tertiary)
    );
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    color: transparent;
  }
  .spacer {
    flex: 1;
  }
  .christmas {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-right: 8px;
    font-size: 14px;
    font-weight: 600;
  }
  .tree {
    font-size: 18px;
  }
  .santa {
    font-size: 16px;
  }
  .bar-icon {
    width: 40px;
    height: 40px;
    margin: 0 2px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: inherit;
  }
  .bar-icon:hover {
    background: color-mix(in srgb, currentColor 8%, transparent);
  }
</style>
