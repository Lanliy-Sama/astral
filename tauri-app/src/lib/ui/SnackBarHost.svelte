<script lang="ts">
  // SnackBar 宿主 — floating 风格, 底部居中, 圆角 4
  import { snackbar, presetOf } from './snackbar.svelte.ts'
  import Icon from './Icon.svelte'

  let req = $derived(snackbar.current)
</script>

{#if req}
  {#key req.id}
    <div class="snackbar" style="background: {req.backgroundColor || presetOf(req)?.bg || 'var(--md-sys-color-inverse-surface)'}">
      {#if req.icon || presetOf(req)?.icon}
        <Icon name={req.icon || presetOf(req)!.icon} size={22} color="#fff" />
      {:else}
        <Icon name={presetOf(req)?.icon || 'info_outline'} size={22} color="#fff" />
      {/if}
      <div class="content">
        <div class="title">{req.title}</div>
        {#if req.message}
          <div class="message">{req.message}</div>
        {/if}
      </div>
      {#if req.action}
        <button
          class="action label-large"
          style="color: {req.action.color || '#fff'}"
          onclick={() => {
            req!.action!.onclick()
            snackbar.dismiss()
          }}
        >
          {req.action.label}
        </button>
      {/if}
    </div>
  {/key}
{/if}

<style>
  .snackbar {
    position: fixed;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2000;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 14px 16px;
    border-radius: 4px;
    color: #fff;
    min-width: 288px;
    max-width: min(568px, calc(100vw - 32px));
    animation: snack-in 0.25s var(--ease-decelerate);
    box-shadow: 0 3px 5px -1px rgba(0, 0, 0, 0.2), 0 6px 10px rgba(0, 0, 0, 0.14);
  }
  @keyframes snack-in {
    from {
      transform: translateX(-50%) translateY(8px);
      opacity: 0;
    }
    to {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }
  }
  .content {
    flex: 1;
    min-width: 0;
  }
  .title {
    font-weight: 700;
    font-size: 14px;
    line-height: 20px;
  }
  .message {
    font-size: 12px;
    line-height: 16px;
    opacity: 0.92;
    white-space: pre-line;
  }
  .action {
    color: #fff;
    padding: 8px 12px;
    border-radius: 20px;
    flex-shrink: 0;
    font-weight: 500;
  }
</style>
