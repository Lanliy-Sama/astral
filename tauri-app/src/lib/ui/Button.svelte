<script lang="ts">
  // M3 按钮 — TextButton / ElevatedButton / FilledButton / OutlinedButton
  import { ripple } from './actions'
  import Icon from './Icon.svelte'

  let {
    variant = 'text',
    icon,
    iconSize = 18,
    disabled = false,
    fullwidth = false,
    padding,
    radius,
    fontColor,
    onclick,
    children,
    ...rest
  }: {
    variant?: 'text' | 'elevated' | 'filled' | 'outlined'
    icon?: string
    iconSize?: number
    disabled?: boolean
    fullwidth?: boolean
    padding?: string
    radius?: number
    fontColor?: string
    onclick?: (e: MouseEvent) => void
    children?: import('svelte').Snippet
    [key: string]: any
  } = $props()
</script>

{#snippet inner()}
  {#if icon}
    <Icon name={icon} size={iconSize} />
    <span class="btn-gap"></span>
  {/if}
  {@render children?.()}
{/snippet}

{#if variant === 'text'}
  <button
    class="m3-btn text label-large elevation-0"
    class:disabled
    style="{fullwidth ? 'width:100%;' : ''}{padding ? `padding:${padding};` : ''}{fontColor
      ? `color:${fontColor};`
      : ''}"
    {disabled}
    use:ripple
    {onclick}
    {...rest}
  >
    {@render inner()}
  </button>
{:else if variant === 'elevated'}
  <button
    class="m3-btn elevated label-large elevation-1"
    class:disabled
    style="{fullwidth ? 'width:100%;' : ''}{padding ? `padding:${padding};` : ''}{radius !== undefined ? `border-radius:${radius}px;` : ''}"
    {disabled}
    use:ripple
    {onclick}
    {...rest}
  >
    {@render inner()}
  </button>
{:else if variant === 'filled'}
  <button
    class="m3-btn filled label-large elevation-0"
    class:disabled
    style="{fullwidth ? 'width:100%;' : ''}{padding ? `padding:${padding};` : ''}{radius !== undefined ? `border-radius:${radius}px;` : ''}{fontColor ? `color:${fontColor};` : ''}"
    {disabled}
    use:ripple
    {onclick}
    {...rest}
  >
    {@render inner()}
  </button>
{:else}
  <button
    class="m3-btn outlined label-large"
    class:disabled
    style="{fullwidth ? 'width:100%;' : ''}{padding ? `padding:${padding};` : ''}{radius !== undefined ? `border-radius:${radius}px;` : ''}"
    {disabled}
    use:ripple
    {onclick}
    {...rest}
  >
    {@render inner()}
  </button>
{/if}

<style>
  .m3-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 40px;
    padding: 0 24px;
    border-radius: 20px;
    gap: 0;
    transition: box-shadow 0.2s ease;
    flex-shrink: 0;
  }
  .btn-gap {
    width: 8px;
    flex-shrink: 0;
  }
  .text {
    color: var(--md-sys-color-primary);
    --ripple-color: var(--md-sys-color-primary);
  }
  .elevated {
    background: var(--md-sys-color-surface-container-low);
    color: var(--md-sys-color-primary);
    --ripple-color: var(--md-sys-color-primary);
  }
  .elevated:hover {
    box-shadow:
      0 1px 3px rgba(0, 0, 0, 0.3),
      0 2px 6px 2px rgba(0, 0, 0, 0.15);
  }
  .filled {
    background: var(--md-sys-color-primary);
    color: var(--md-sys-color-on-primary);
    --ripple-color: var(--md-sys-color-on-primary);
  }
  .outlined {
    border: 1px solid var(--md-sys-color-outline);
    color: var(--md-sys-color-primary);
    background: transparent;
    --ripple-color: var(--md-sys-color-primary);
  }
  .disabled {
    opacity: 0.38;
    pointer-events: none;
    box-shadow: none;
  }
  .filled.disabled {
    background: color-mix(in srgb, var(--md-sys-color-on-surface) 12%, transparent);
    color: color-mix(in srgb, var(--md-sys-color-on-surface) 38%, transparent);
  }
  .outlined.disabled {
    border-color: color-mix(in srgb, var(--md-sys-color-on-surface) 12%, transparent);
    color: color-mix(in srgb, var(--md-sys-color-on-surface) 38%, transparent);
  }
  .elevated.disabled {
    background: color-mix(in srgb, var(--md-sys-color-on-surface) 12%, transparent);
    color: color-mix(in srgb, var(--md-sys-color-on-surface) 38%, transparent);
  }
</style>
