<script lang="ts">
  // M3 Card — 默认 surfaceContainerLow 底 / elevation 1 / 圆角 12
  import { createEventDispatcher } from 'svelte'
  import { ripple } from './actions'

  let {
    radius = 12,
    color,
    border,
    borderWidth = 1,
    elevation = 1,
    margin = '4px',
    fullheight = false,
    onclick,
    children,
  }: {
    radius?: number
    color?: string
    border?: string
    borderWidth?: number
    elevation?: number
    margin?: string
    fullheight?: boolean
    onclick?: () => void
    children?: import('svelte').Snippet
  } = $props()

  const dispatch = createEventDispatcher<{ click: void }>()
</script>

<div
  class="m3-card elevation-{elevation}"
  class:clickable={!!onclick}
  style="border-radius:{radius}px;
    {color ? `background:${color};` : ''}
    {border ? `border:${borderWidth}px solid ${border};` : ''}
    {margin !== 'none' ? `margin:${margin};` : ''}
    {fullheight ? 'height:100%;' : ''}"
  use:ripple={onclick ? {} : undefined}
  onclick={() => {
    if (onclick) {
      onclick()
      dispatch('click')
    }
  }}
>
  {@render children?.()}
</div>

<style>
  .m3-card {
    background: var(--md-sys-color-surface-container-low);
    overflow: hidden;
    align-self: stretch;
    position: relative;
  }
  .clickable {
    cursor: pointer;
  }
</style>
