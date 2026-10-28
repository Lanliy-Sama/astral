<script lang="ts">
  // M3 AlertDialog — surfaceContainerHigh 底 / 默认圆角 28 (可覆盖) / scrim black54
  import { createEventDispatcher } from 'svelte'

  let {
    open = $bindable(false),
    radius = 28,
    width,
    minWidth = 280,
    maxWidth = 560,
    barrierDismissible = true,
    scrimClick,
    children,
    ...rest
  }: {
    open?: boolean
    radius?: number
    width?: number
    minWidth?: number
    maxWidth?: number
    barrierDismissible?: boolean
    scrimClick?: () => void
    children?: import('svelte').Snippet
  } = $props()

  const dispatch = createEventDispatcher<{ close: void }>()

  let appearing = $state(false)

  $effect(() => {
    if (open) {
      // 下一帧再加 appear class 触发过渡
      requestAnimationFrame(() => (appearing = true))
    } else {
      appearing = false
    }
  })

  function close() {
    open = false
    dispatch('close')
  }
</script>

{#if open}
  <div
    class="scrim"
    class:appearing
    onclick={() => {
      if (barrierDismissible) {
        scrimClick?.()
        close()
      }
    }}
  >
    <div
      class="dialog elevation-3"
      class:appearing
      style="border-radius: {radius}px; {width ? `width:${width}px;` : ''} min-width: {minWidth}px; max-width: {maxWidth}px;"
      onclick={(e) => e.stopPropagation()}
      {...rest}
    >
      {@render children?.()}
    </div>
  </div>
{/if}

<style>
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: rgba(0, 0, 0, 0.54);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.15s var(--ease-material);
    padding: 16px;
  }
  .dialog {
    background: var(--md-sys-color-surface-container-high);
    color: var(--md-sys-color-on-surface);
    display: flex;
    flex-direction: column;
    max-height: calc(100vh - 64px);
    transform: scale(0.9);
    opacity: 0;
    transition:
      transform 0.15s var(--ease-decelerate),
      opacity 0.15s var(--ease-decelerate);
  }
  .scrim.appearing {
    opacity: 1;
  }
  .dialog.appearing {
    transform: scale(1);
    opacity: 1;
  }
</style>
