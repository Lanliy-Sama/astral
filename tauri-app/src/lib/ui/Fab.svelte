<script lang="ts">
  // M3 FloatingActionButton — 56×56 / 圆角16 / primaryContainer / elevation 6
  import { ripple, tooltip } from './actions'
  import Icon from './Icon.svelte'

  let {
    icon,
    iconSize = 24,
    extended = false,
    width = 56,
    height = 56,
    backgroundColor,
    foregroundColor,
    splashColor,
    radius = 16,
    tip,
    disabled = false,
    extendedPadding = '0 2px',
    onclick,
    children,
  }: {
    icon?: string
    iconSize?: number
    extended?: boolean
    width?: number
    height?: number
    backgroundColor?: string
    foregroundColor?: string
    splashColor?: string
    radius?: number
    tip?: string
    disabled?: boolean
    extendedPadding?: string
    onclick?: (e: MouseEvent) => void
    children?: import('svelte').Snippet
  } = $props()
</script>

<button
  class="m3-fab elevation-6"
  class:disabled
  class:extended
  style="width:{width}px;height:{height}px;border-radius:{radius}px;
    {backgroundColor ? `background:${backgroundColor};` : ''}
    {foregroundColor ? `color:${foregroundColor};` : ''}
    {splashColor ? `--ripple-color:${splashColor};` : ''}
    {extended ? `padding:${extendedPadding};` : ''}"
  {disabled}
  use:ripple
  use:tooltip={tip}
  {onclick}
>
  {#if icon}
    <Icon name={icon} size={iconSize} />
  {/if}
  {#if extended}
    <span class="ext-gap"></span>
    {@render children?.()}
  {/if}
</button>

<style>
  .m3-fab {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--md-sys-color-primary-container);
    color: var(--md-sys-color-on-primary-container);
    --ripple-color: currentColor;
    flex-shrink: 0;
    position: relative;
    overflow: hidden;
    transition: box-shadow 0.2s ease;
  }
  .m3-fab:hover {
    box-shadow:
      0 5px 7px -1px rgba(0, 0, 0, 0.2),
      0 8px 12px rgba(0, 0, 0, 0.14),
      0 3px 20px rgba(0, 0, 0, 0.12);
  }
  .extended {
    font-size: 16px;
    font-weight: 500;
    gap: 0;
  }
  .ext-gap {
    width: 8px;
    flex-shrink: 0;
  }
  .disabled {
    background: color-mix(in srgb, var(--md-sys-color-on-surface) 12%, transparent);
    color: color-mix(in srgb, var(--md-sys-color-on-surface) 38%, transparent);
    box-shadow: none;
    pointer-events: none;
  }
</style>
