<script lang="ts">
  // M3 IconButton — 默认 40×40, 标准 icon 24 (可指定 iconSize/padding)
  import { ripple, tooltip } from './actions'
  import Icon from './Icon.svelte'

  let {
    icon,
    iconSize = 24,
    outlined = false,
    disabled = false,
    color,
    size = 40,
    padding = 8,
    tip,
    onclick,
  }: {
    icon: string
    iconSize?: number
    outlined?: boolean
    disabled?: boolean
    color?: string
    size?: number
    padding?: number
    tip?: string
    onclick?: (e: MouseEvent) => void
  } = $props()
</script>

<button
  class="m3-icon-btn"
  class:disabled
  style="width:{size}px;height:{size}px;padding:{padding}px;{color ? `color:${color};` : ''}"
  {disabled}
  use:ripple
  use:tooltip={tip}
  onclick={onclick}
>
  <Icon {icon} size={iconSize} {outlined} />
</button>

<style>
  .m3-icon-btn {
    position: relative;
    overflow: hidden;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    color: var(--ripple-target, inherit);
    flex-shrink: 0;
    --ripple-color: currentColor;
  }
  .m3-icon-btn:hover {
    background: color-mix(in srgb, currentColor 8%, transparent);
  }
  .disabled {
    opacity: 0.38;
    pointer-events: none;
  }
</style>
