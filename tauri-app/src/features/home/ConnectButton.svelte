<script lang="ts">
  // ConnectButton — 对应 connect_button.dart + connect_button_style.dart
  // 三态 FAB: idle(100×60 primary"连接") / connecting(180×60 error"点击取消"旋转图标)
  // / connected(180×60 tertiary"已连接") + 15s 进度条
  import Fab from '../../lib/ui/Fab.svelte'
  import { services } from '../../lib/core/services/services.svelte'
  import { connection, ConnectGuard } from '../../lib/core/services/connection.svelte'
  import { snackbar } from '../../lib/ui/snackbar.svelte.ts'
  import Icon from '../../lib/ui/Icon.svelte'
  import { t } from '../../lib/i18n/index.svelte'
  import { withAlpha } from '../../lib/theme/scheme'
  import { npcapDialog } from './npcapDialog.svelte.ts'
  import type { CoState } from '../../lib/core/models/types'

  const s = services()

  let state = $derived<CoState>(s.connectionState.connectionState)
  let connecting = $derived(state === 'connecting')

  // 图标旋转 (800ms 往复)
  let rotateAngle = $state(0)
  let raf: number | null = null
  let rotateStart = 0

  $effect(() => {
    if (connecting) {
      rotateStart = performance.now()
      const step = (now: number) => {
        const elapsed = now - rotateStart
        // 1600ms 一个周期: 前800ms 顺时针 0→2π, 后800ms 逆时针 2π→0
        const cycle = elapsed % 1600
        const half = cycle < 800 ? cycle / 800 : 2 - cycle / 800
        rotateAngle = half * Math.PI * 2
        raf = requestAnimationFrame(step)
      }
      raf = requestAnimationFrame(step)
    } else {
      if (raf) cancelAnimationFrame(raf)
      raf = null
      rotateAngle = 0
    }
    return () => {
      if (raf) cancelAnimationFrame(raf)
    }
  })

  // 进度条: 15s easeInOut, 状态切换时重置
  let progress = $state(0)
  let progressRaf: number | null = null
  let progressStart = 0

  function easeInOut(x: number): number {
    return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2
  }

  $effect(() => {
    if (connecting) {
      progress = 0
      progressStart = performance.now()
      const step = (now: number) => {
        const v = Math.min(1, (now - progressStart) / 15000)
        progress = easeInOut(v)
        if (v < 1 && s.connectionState.connectionState === 'connecting') {
          progressRaf = requestAnimationFrame(step)
        }
      }
      progressRaf = requestAnimationFrame(step)
    } else {
      if (progressRaf) cancelAnimationFrame(progressRaf)
    }
    return () => {
      if (progressRaf) cancelAnimationFrame(progressRaf)
    }
  })

  // 按钮宽度动画 (200ms easeOutCubic)
  let width = $state(100)
  $effect(() => {
    width = state !== 'idle' ? 180 : 100
  })

  async function toggleConnection() {
    if (state === 'connecting') {
      connection().cancelConnection()
      return
    }
    if (state === 'connected') {
      connection().disconnect()
      return
    }
    await handleConnect()
  }

  async function handleConnect() {
    // 连接目标检查 (ConnectionConnectGuard)
    const issue = ConnectGuard.connectTargetIssue()
    if (issue === 'noRoom') {
      snackbar.show({
        title: t('select_room_first'),
        backgroundColor: 'var(--md-sys-color-inverse-surface)',
        duration: 3000,
        action: { label: t('go_select_room'), onclick: () => s.uiState.goTo('room') },
      })
      return
    }
    if (issue === 'noneEnabled') {
      snackbar.show({
        title: t('enable_server_first'),
        backgroundColor: 'var(--md-sys-color-inverse-surface)',
        duration: 3000,
        action: { label: t('go_enable'), onclick: () => s.uiState.goTo('servers') },
      })
      return
    }
    if (issue === 'noServers') {
      snackbar.show({
        title: t('add_server_first'),
        backgroundColor: 'var(--md-sys-color-inverse-surface)',
        duration: 3000,
        action: { label: t('go_add'), onclick: () => s.uiState.goTo('servers') },
      })
      return
    }
    // Npcap 检查 (Windows)
    const ready = await ConnectGuard.isNpcapReady()
    if (!ready) {
      npcapDialog.show(handleConnect)
      return
    }
    const success = await connection().connect(true)
    if (success === false) {
      snackbar.show({
        title: '连接失败',
        message: '请检查网络后重试，并确认房间与服务器配置无误',
        type: 'error',
      })
    }
  }

  const label = $derived(
    state === 'idle' ? '连接' : state === 'connecting' ? '点击取消' : '已连接',
  )
</script>

<div class="connect-fab-area">
  <!-- 进度条槽 180×14 -->
  <div class="progress-slot" class:visible={connecting}>
    <div class="progress-track">
      <div class="progress-fill" style="width: {progress * 100}%"></div>
    </div>
  </div>
  <!-- FAB -->
  <div class="fab-wrapper" style="width: {width}px">
    {#key state}
      <div class="fab-anim">
        <Fab
          extended
          width={width}
          height={60}
          radius={16}
          backgroundColor={state === 'idle'
            ? 'var(--md-sys-color-primary)'
            : state === 'connecting'
              ? 'var(--md-sys-color-error)'
              : 'var(--md-sys-color-tertiary)'}
          foregroundColor={state === 'idle'
            ? 'var(--md-sys-color-on-primary)'
            : state === 'connecting'
              ? 'var(--md-sys-color-on-error)'
              : 'var(--md-sys-color-on-tertiary)'}
          onclick={toggleConnection}
        >
          {#if state === 'idle'}
            <span class="fab-icon"><Icon name="power_settings_new_rounded" size={24} /></span>
          {:else if state === 'connecting'}
            <span class="fab-icon" style="transform: rotate({rotateAngle}rad)">
              <Icon name="close_rounded" size={24} />
            </span>
          {:else}
            <span class="fab-icon"><Icon name="link_rounded" size={24} /></span>
          {/if}
          <span class="fab-label">{label}</span>
        </Fab>
      </div>
    {/key}
  </div>
</div>

<style>
  .connect-fab-area {
    position: absolute;
    right: 16px;
    bottom: 16px;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    padding: 16px; /* ConnectButton 根部 Padding(16) */
    z-index: 10;
  }
  .progress-slot {
    width: 180px;
    height: 14px;
    overflow: hidden;
    opacity: 0;
    transform: translateY(14px);
    transition:
      opacity 0.3s ease,
      transform 0.3s ease;
    display: flex;
    align-items: flex-start;
  }
  .progress-slot.visible {
    opacity: 1;
    transform: translateY(0);
  }
  .progress-track {
    width: 180px;
    height: 6px;
    background: var(--md-sys-color-surface-container-highest);
    border-radius: 3px;
    margin-bottom: 8px;
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    background: linear-gradient(
      to right,
      var(--md-sys-color-tertiary),
      var(--md-sys-color-primary)
    );
    border-radius: 3px;
  }
  .fab-wrapper {
    height: 60px;
    transition: width 0.2s var(--ease-out-cubic);
    display: flex;
    justify-content: flex-end;
  }
  .fab-anim {
    animation: fab-crossfade 0.2s var(--ease-out-quad);
  }
  @keyframes fab-crossfade {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  .fab-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    animation: icon-crossfade 0.15s ease;
  }
  @keyframes icon-crossfade {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  .fab-label {
    font-size: 16px;
    font-weight: 500;
    white-space: nowrap;
  }
</style>
