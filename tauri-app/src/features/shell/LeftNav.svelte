<script lang="ts">
  // LeftNav — 对应 left_nav.dart: 宽80, 右边框, 64高导航项, 动画指示器
  import Icon from '../../lib/ui/Icon.svelte'
  import { services } from '../../lib/core/services/services.svelte'
  import { t } from '../../lib/i18n/index.svelte'
  import type { MainTab } from '../../lib/core/models/types'

  const s = services()

  interface NavItem {
    tab: MainTab
    icon: string
    activeIcon: string
    label: () => string
  }

  let items: NavItem[] = [
    {
      tab: 'home',
      icon: 'home_outlined',
      activeIcon: 'home',
      label: () => t('nav_home'),
    },
    {
      tab: 'room',
      icon: 'room_preferences_outlined',
      activeIcon: 'room_preferences',
      label: () => t('nav_room'),
    },
    {
      tab: 'tools',
      icon: 'build_outlined',
      activeIcon: 'build',
      label: () => '工具',
    },
    {
      tab: 'servers',
      icon: 'dns_outlined',
      activeIcon: 'dns',
      label: () => t('nav_server'),
    },
    {
      tab: 'settings',
      icon: 'settings_outlined',
      activeIcon: 'settings',
      label: () => t('nav_settings'),
    },
  ]

  // 指示器动画 (200ms easeInOutCubic)
  let animFrom = $state(0)
  let animTo = $state(0)
  let first = $state(true)

  $effect(() => {
    const idx = s.uiState.selectedIndex
    if (first) {
      animFrom = idx
      animTo = idx
      first = false
    } else if (idx !== animTo) {
      animFrom = animTo
      animTo = idx
    }
  })

  let indicatorTop = $derived(4 + animFrom * 72 + (animTo - animFrom) * progress)
  let progress = $state(1)

  // 直接用 CSS transition 实现滑动
  $effect(() => {
    void s.uiState.selectedIndex
    // animFrom→animTo 由 CSS transition 完成
  })
</script>

<div class="left-nav">
  <div class="nav-stack">
    <!-- 选中指示器 -->
    <div
      class="indicator"
      style="top: {4 + animTo * 72}px"
    ></div>
    <!-- hover 高亮 -->
    {#if s.uiState.hoveredIndex !== null && s.uiState.hoveredIndex !== s.uiState.selectedIndex}
      <div class="hover-pill" style="top: {4 + s.uiState.hoveredIndex * 72}px"></div>
    {/if}
    <!-- 导航项 -->
    {#each items as item, index (item.tab)}
      <div
        class="nav-item"
        class:selected={s.uiState.selectedIndex === index}
        onmouseenter={() => (s.uiState.hoveredIndex = index)}
        onmouseleave={() => (s.uiState.hoveredIndex = null)}
        onclick={() => {
          if (s.uiState.selectedIndex !== index) s.uiState.selectedIndex = index
        }}
      >
        <div class="nav-content">
          <Icon
            name={s.uiState.selectedIndex === index ? item.activeIcon : item.icon}
            size={24}
          />
          <div class="nav-label">{item.label()}</div>
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .left-nav {
    width: 80px;
    flex-shrink: 0;
    background: var(--md-sys-color-surface);
    border-right: 1px solid var(--md-sys-color-outline);
    padding-top: 14px;
    position: relative;
    overflow: hidden;
  }
  .nav-stack {
    position: relative;
    height: 100%;
  }
  .indicator {
    position: absolute;
    left: 8px;
    right: 8px;
    height: 64px;
    background: var(--md-sys-color-primary-container);
    border-radius: 12px;
    transition: top 0.2s var(--ease-in-out-cubic);
    z-index: 0;
  }
  .hover-pill {
    position: absolute;
    left: 8px;
    right: 8px;
    height: 64px;
    background: color-mix(
      in srgb,
      var(--md-sys-color-surface-container-highest) 50%,
      transparent
    );
    border-radius: 12px;
    z-index: 0;
  }
  .nav-item {
    height: 64px;
    margin: 4px 8px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    position: relative;
    z-index: 1;
  }
  .nav-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    color: var(--md-sys-color-on-surface-variant);
    /* 原版 AnimatedDefaultTextStyle 对所有项恒为 bold */
    font-weight: 700;
    transition: color 0.1s ease;
  }
  .nav-item.selected .nav-content {
    color: var(--md-sys-color-primary);
  }
  .nav-label {
    font-size: 14px;
    line-height: 20px;
    white-space: nowrap;
  }
</style>
