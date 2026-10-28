<script lang="ts">
  // MainScreen — 对应 main_screen.dart: StatusBar + LeftNav/BottomNav + IndexedStack
  import { onMount } from 'svelte'
  import { services } from '../../lib/core/services/services.svelte'
  import { router } from '../../lib/core/router.svelte'
  import { Platform } from '../../lib/platform'
  import StatusBar from './StatusBar.svelte'
  import LeftNav from './LeftNav.svelte'
  import BottomNav from './BottomNav.svelte'
  import ThemeColorPicker from './ThemeColorPicker.svelte'
  import HomePage from '../home/HomePage.svelte'
  import RoomPage from '../rooms/RoomPage.svelte'
  import ToolsPage from '../tools/ToolsPage.svelte'
  import ServersPage from '../servers/ServersPage.svelte'
  import SettingsMainPage from '../settings/SettingsMainPage.svelte'
  import SubPageHost from './SubPageHost.svelte'
  import { connection } from '../../lib/core/services/connection.svelte'

  const s = services()

  const pages = [
    { key: 'home', component: HomePage },
    { key: 'room', component: RoomPage },
    { key: 'tools', component: ToolsPage },
    { key: 'servers', component: ServersPage },
    { key: 'settings', component: SettingsMainPage },
  ]

  let safeIndex = $derived(
    s.uiState.selectedIndex >= 0 && s.uiState.selectedIndex < pages.length
      ? s.uiState.selectedIndex
      : 0,
  )

  // 关闭时最小化到托盘逻辑 (onWindowClose) 由 Tauri 壳处理; 浏览器中直接卸载
  onMount(() => {
    const onResize = () => s.uiState.updateScreenSplitWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    onResize()
    window.addEventListener('beforeunload', () => {
      connection().disconnect()
    })
    return () => window.removeEventListener('resize', onResize)
  })

  // IndexedStack: 全部页面保持挂载, 通过 display 切换 (保持状态)
</script>

<div class="main-screen">
  <StatusBar />
  <div class="body">
    {#if s.uiState.isDesktop}
      <LeftNav />
    {/if}
    <div class="page-area">
      {#each pages as page, i (page.key)}
        <div class="page" class:active={i === safeIndex}>
          <svelte:component this={page.component} />
        </div>
      {/each}
    </div>
  </div>
  {#if !s.uiState.isDesktop}
    <BottomNav />
  {/if}
</div>

<!-- 子页面路由栈 (设置子页/NAT/魔法墙/端口白名单) -->
<SubPageHost />

<ThemeColorPicker />

<style>
  .main-screen {
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--md-sys-color-surface);
  }
  .body {
    flex: 1;
    display: flex;
    min-height: 0;
  }
  .page-area {
    flex: 1;
    position: relative;
    min-width: 0;
    min-height: 0;
  }
  .page {
    position: absolute;
    inset: 0;
    overflow: hidden;
    display: none;
  }
  .page.active {
    display: block;
  }
</style>
