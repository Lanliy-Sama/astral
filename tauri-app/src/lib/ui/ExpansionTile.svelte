<script lang="ts">
  // M3 ExpansionTile — 可折叠块 (分享对话框"高级选项")
  import Icon from './Icon.svelte'

  let {
    initiallyExpanded = false,
    titleSnippet,
    subtitleSnippet,
    children,
    trailing,
    radius = 12,
    backgroundColor,
    collapsedBackgroundColor,
    borderColor,
  }: {
    initiallyExpanded?: boolean
    titleSnippet?: import('svelte').Snippet
    subtitleSnippet?: import('svelte').Snippet
    children?: import('svelte').Snippet
    trailing?: import('svelte').Snippet
    radius?: number
    backgroundColor?: string
    collapsedBackgroundColor?: string
    borderColor?: string
  } = $props()

  let expanded = $state(initiallyExpanded)
</script>

<div
  class="expansion"
  class:expanded
  style="border-radius: {radius}px; border: 1px solid {borderColor ||
    'var(--md-sys-color-outline-variant)'}; background: {expanded
    ? backgroundColor || 'var(--md-sys-color-surface)'
    : collapsedBackgroundColor ||
      'color-mix(in srgb, var(--md-sys-color-surface-container-highest) 20%, transparent)'}"
>
  <button class="exp-head" onclick={() => (expanded = !expanded)}>
    <div class="exp-title">
      {#if titleSnippet}{@render titleSnippet()}{/if}
      {#if subtitleSnippet}{@render subtitleSnippet()}{/if}
    </div>
    {#if trailing}
      {@render trailing()}
    {/if}
    <Icon name={expanded ? 'expand_less' : 'expand_more'} size={24} />
  </button>
  {#if expanded}
    <div class="exp-body">
      {@render children?.()}
    </div>
  {/if}
</div>

<style>
  .expansion {
    overflow: hidden;
    transition: background 0.15s ease;
  }
  .exp-head {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 16px 0 16px;
    min-height: 56px;
    width: 100%;
    text-align: left;
  }
  .exp-head:hover {
    background: color-mix(in srgb, var(--md-sys-color-on-surface) 4%, transparent);
  }
  .exp-title {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .exp-body {
    animation: expand-in 0.2s var(--ease-material);
  }
  @keyframes expand-in {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
