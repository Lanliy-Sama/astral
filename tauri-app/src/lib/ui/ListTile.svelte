<script lang="ts">
  // ListTile — M3 布局: 左右 contentPadding 16, title bodyLarge(16), subtitle bodyMedium(14)
  // title/subtitle 同时接受字符串或 snippet
  import { createEventDispatcher } from 'svelte'
  import { ripple } from './actions'
  import Icon from './Icon.svelte'

  let {
    leading,
    leadingIcon,
    leadingIconColor,
    title,
    titleColor,
    subtitle,
    subtitleColor,
    trailing,
    trailingIcon,
    trailingIconColor,
    contentPadding = '16px',
    verticalPadding = 8,
    dense = false,
    threeline = false,
    disabled = false,
    onclick,
    children,
  }: {
    leading?: import('svelte').Snippet
    leadingIcon?: string
    leadingIconColor?: string
    title?: string | import('svelte').Snippet
    titleColor?: string
    subtitle?: string | import('svelte').Snippet
    subtitleColor?: string
    trailing?: import('svelte').Snippet
    trailingIcon?: string
    trailingIconColor?: string
    contentPadding?: string
    verticalPadding?: number
    dense?: boolean
    threeline?: boolean
    disabled?: boolean
    onclick?: (e: MouseEvent) => void
    children?: import('svelte').Snippet
  } = $props()

  const dispatch = createEventDispatcher<{ click: MouseEvent }>()
</script>

<div
  class="m3-list-tile"
  class:clickable={!!onclick}
  class:disabled
  class:dense
  style="padding: {dense ? 4 : verticalPadding}px {contentPadding}; {threeline
    ? 'min-height: 88px;'
    : ''}"
  use:ripple={onclick ? {} : undefined}
  onclick={(e) => {
    if (onclick) {
      onclick(e)
      dispatch('click', e)
    }
  }}
>
  {#if leading}
    <div class="tile-leading">
      {@render leading()}
    </div>
  {:else if leadingIcon}
    <div class="tile-leading">
      <Icon
        name={leadingIcon}
        size={24}
        color={leadingIconColor || 'var(--md-sys-color-primary)'}
      />
    </div>
  {/if}
  <div class="tile-body">
    {#if title}
      <div class="tile-title body-large" style={titleColor ? `color:${titleColor}` : ''}>
        {#if typeof title === 'string'}{title}{:else}{@render title()}{/if}
      </div>
    {/if}
    {#if subtitle}
      <div
        class="tile-subtitle body-medium"
        style="color: {subtitleColor || 'var(--md-sys-color-on-surface-variant)'}"
      >
        {#if typeof subtitle === 'string'}{subtitle}{:else}{@render subtitle()}{/if}
      </div>
    {/if}
    {@render children?.()}
  </div>
  {#if trailing}
    <div class="tile-trailing">
      {@render trailing()}
    </div>
  {:else if trailingIcon}
    <div class="tile-trailing">
      <Icon name={trailingIcon} size={24} color={trailingIconColor || 'inherit'} />
    </div>
  {/if}
</div>

<style>
  .m3-list-tile {
    display: flex;
    align-items: center;
    gap: 16px;
    min-height: 56px;
    position: relative;
  }
  .m3-list-tile.dense {
    min-height: 48px;
  }
  .clickable {
    cursor: pointer;
  }
  .disabled {
    opacity: 0.6;
    pointer-events: none;
  }
  .tile-leading {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    min-width: 24px;
  }
  .tile-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .tile-title {
    color: var(--md-sys-color-on-surface);
    display: flex;
    align-items: center;
    min-width: 0;
  }
  .tile-subtitle {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    min-width: 0;
  }
  .tile-trailing {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }
</style>
