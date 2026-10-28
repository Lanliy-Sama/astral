<script lang="ts">
  // SubPageHost — 子页面路由栈渲染 (对应 Navigator.push(MaterialPageRoute))
  // 桌面: fade+scale; 移动: 底部滑入
  import { router, type AppRoute } from '../../lib/core/router.svelte'
  import NatTestPage from '../nat/NatTestPage.svelte'
  import MagicWallPage from '../magicwall/MagicWallPage.svelte'
  import PortWhitelistPage from '../settings/PortWhitelistPage.svelte'
  import StartupPage from '../settings/StartupPage.svelte'
  import SoftwareSettingsPage from '../settings/SoftwareSettingsPage.svelte'
  import UpdateSettingsPage from '../settings/UpdateSettingsPage.svelte'
  import LogsPage from '../settings/LogsPage.svelte'
  import HistoryVersionsPage from '../settings/HistoryVersionsPage.svelte'
  import NetworkSettingsPage from '../settings/NetworkSettingsPage.svelte'
  import VpnSegmentPage from '../settings/VpnSegmentPage.svelte'
  import ListenListPage from '../settings/ListenListPage.svelte'

  const registry: Record<string, any> = {
    natTest: NatTestPage,
    magicWall: MagicWallPage,
    portWhitelist: PortWhitelistPage,
    startup: StartupPage,
    softwareSettings: SoftwareSettingsPage,
    updateSettings: UpdateSettingsPage,
    logs: LogsPage,
    historyVersions: HistoryVersionsPage,
    networkSettings: NetworkSettingsPage,
    vpnSegment: VpnSegmentPage,
    listenList: ListenListPage,
  }
</script>

{#each router.stack as route, i (i)}
  <div class="route-layer" class:visible={i === router.stack.length - 1}>
    <svelte:component this={registry[route.name]} {...route.params} />
  </div>
{/each}

<style>
  .route-layer {
    position: fixed;
    inset: 0;
    z-index: 500;
    background: var(--md-sys-color-surface);
    animation: route-in 0.25s var(--ease-decelerate);
  }
  @keyframes route-in {
    from {
      opacity: 0;
      transform: translateY(24px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
</style>
