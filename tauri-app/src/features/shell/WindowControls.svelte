<script lang="ts">
  // WindowControls — 对应 windows_controls.dart (最小化/最大化/关闭)
  import Icon from '../../lib/ui/Icon.svelte'
  import { Platform } from '../../lib/platform'

  let isMaximized = $state(false)

  async function tauri(action: string, args?: Record<string, unknown>) {
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke(action, args)
  }

  async function minimize() {
    try {
      if (Platform.isTauri) await tauri('minimize_window')
    } catch {
      /* ignore */
    }
  }

  async function toggleMaximize() {
    try {
      if (Platform.isTauri) await tauri('toggle_maximize')
    } catch {
      /* ignore */
    }
  }

  async function close() {
    try {
      if (Platform.isTauri) await tauri('close_window')
    } catch {
      /* ignore */
    }
  }

  onMount(async () => {
    if (Platform.isTauri) {
      try {
        isMaximized = await tauri('is_maximized')
      } catch {
        /* ignore */
      }
    }
  })

  import { onMount } from 'svelte'
</script>

{#if Platform.isDesktopPlatform}
  <div class="win-controls">
    <button class="wc-btn" title="最小化" onclick={minimize}>
      <Icon name="remove" size={20} />
    </button>
    <button class="wc-btn" title={isMaximized ? '还原' : '最大化'} onclick={toggleMaximize}>
      <Icon name={isMaximized ? 'filter_none' : 'crop_square'} size={20} />
    </button>
    <button class="wc-btn" title="关闭" onclick={close}>
      <Icon name="close" size={20} />
    </button>
  </div>
{/if}

<style>
  .win-controls {
    display: flex;
    align-items: center;
    margin-left: 8px;
  }
  .wc-btn {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    color: inherit;
  }
  .wc-btn:hover {
    background: color-mix(in srgb, currentColor 8%, transparent);
  }
</style>
