<script lang="ts">
  // App.svelte — 对应 KevinApp (MaterialApp): 主题响应 + i18n + 服务初始化 + 主屏
  import { onMount } from 'svelte'
  import { services } from './lib/core/services/services.svelte'
  import MainScreen from './features/shell/MainScreen.svelte'
  import SnackBarHost from './lib/ui/SnackBarHost.svelte'
  import { applyThemeToDocument } from './lib/theme/scheme'
  import { ConnectGuard, connection } from './lib/core/services/connection.svelte'

  const s = services()

  let ready = $state(false)
  let systemDark = $state(window.matchMedia('(prefers-color-scheme: dark)').matches)

  // 主题色/模式/系统明暗 变化时重新渲染 CSS 变量 (对应 Watch(themeColor, themeMode))
  $effect(() => {
    void systemDark
    applyThemeToDocument(s.themeState.themeColor, s.themeState.themeMode)
  })

  onMount(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => (systemDark = mq.matches)
    mq.addEventListener('change', onChange)

    const init = async () => {
      await s.init()
      // 启动自动连接 (startupAutoConnect)
      if (s.startupState.startupAutoConnect && ConnectGuard.hasConnectTarget()) {
        const ok = await ConnectGuard.isNpcapReady()
        if (ok) connection().connect(false)
      }
      ready = true
    }
    init()

    // 窗口尺寸 → isDesktop (didChangeMetrics)
    const onResize = () => s.uiState.updateScreenSplitWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    onResize()

    return () => {
      mq.removeEventListener('change', onChange)
      window.removeEventListener('resize', onResize)
    }
  })
</script>

{#if ready}
  <MainScreen />
  <SnackBarHost />
{:else}
  <div class="boot"></div>
{/if}

<style>
  .boot {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: var(--md-sys-color-surface, #f8f9ff);
  }
</style>
