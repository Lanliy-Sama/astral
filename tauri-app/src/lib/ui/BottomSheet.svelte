<script lang="ts">
  // M3 BottomSheet — 顶部圆角 28, scrim, 底部滑入; 桌面端调用方一般改用 Dialog
  let {
    open = $bindable(false),
    maxHeight = '90vh',
    scrimDismiss = true,
    children,
  }: {
    open?: boolean
    maxHeight?: string
    scrimDismiss?: boolean
    children?: import('svelte').Snippet
  } = $props()
</script>

{#if open}
  <div
    class="sheet-scrim"
    onclick={() => {
      if (scrimDismiss) open = false
    }}
  ></div>
  <div class="sheet" style="max-height: {maxHeight}">
    <div class="drag-area">
      <div class="drag-handle"></div>
    </div>
    {@render children?.()}
  </div>
{/if}

<style>
  .sheet-scrim {
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: rgba(0, 0, 0, 0.54);
    animation: fade-in 0.15s ease;
  }
  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  .sheet {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1001;
    background: var(--md-sys-color-surface);
    border-radius: 28px 28px 0 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: slide-up 0.25s var(--ease-decelerate);
    box-shadow: 0 4px 8px 3px rgba(0, 0, 0, 0.15);
  }
  @keyframes slide-up {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  }
  .drag-area {
    display: flex;
    justify-content: center;
    padding: 8px 0 4px;
    flex-shrink: 0;
  }
  .drag-handle {
    width: 32px;
    height: 4px;
    border-radius: 2px;
    background: var(--md-sys-color-outline);
  }
</style>
