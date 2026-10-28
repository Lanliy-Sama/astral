<script lang="ts">
  // BaseSettingsPage — 对应 base_settings_page.dart: 居中标题 AppBar + 返回键 + 滚动内容
  import Icon from '../../lib/ui/Icon.svelte'
  import { router } from '../../lib/core/router.svelte'
  import { ripple } from '../../lib/ui/actions'

  let {
    title = '',
    actions,
    showBackButton = true,
    showAppBar = true,
    children,
  }: {
    title?: string
    actions?: import('svelte').Snippet
    showBackButton?: boolean
    showAppBar?: boolean
    children?: import('svelte').Snippet
  } = $props()
</script>

<div class="settings-page">
  {#if showAppBar}
    <div class="app-bar">
      {#if showBackButton}
        <button class="back-btn" use:ripple onclick={() => router.pop()}>
          <Icon name="arrow_back" size={24} />
        </button>
      {/if}
      <div class="bar-title title-large">{title}</div>
      <div class="bar-actions">
        {#if actions}{@render actions()}{/if}
      </div>
    </div>
  {/if}
  <div class="page-body">
    {@render children?.()}
  </div>
</div>

<style>
  .settings-page {
    height: 100%;
    display: flex;
    flex-direction: column;
    background: var(--md-sys-color-surface);
  }
  .app-bar {
    height: 56px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    background: var(--md-sys-color-surface);
    padding: 0 8px 0 4px;
    gap: 4px;
  }
  .back-btn {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--md-sys-color-on-surface);
    position: relative;
    overflow: hidden;
    flex-shrink: 0;
  }
  .back-btn:hover {
    background: color-mix(in srgb, currentColor 8%, transparent);
  }
  .bar-title {
    flex: 1;
    text-align: center;
    font-size: 22px;
    line-height: 28px;
  }
  .bar-actions {
    display: flex;
    align-items: center;
    min-width: 48px;
    justify-content: flex-end;
  }
  .page-body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }
</style>
