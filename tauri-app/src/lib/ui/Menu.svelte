<script lang="ts">
  // M3 PopupMenu — 锚定菜单, surfaceContainer 底 / 圆角 4 / 项高 48
  import Icon from './Icon.svelte'

  export interface MenuItem2<V = string> {
    value: V
    label?: string
    icon?: string
    iconSize?: number
    color?: string
    disabled?: boolean
    divider?: boolean
    check?: boolean
    checkColor?: string
    snippet?: import('svelte').Snippet
  }

  let {
    open = $bindable(false),
    anchor,
    items,
    align = 'start',
    width,
    onselect,
  }: {
    open?: boolean
    anchor: HTMLElement | null
    items: MenuItem2<any>[]
    align?: 'start' | 'end' | 'center'
    width?: number
    onselect?: (value: any, item: MenuItem2<any>) => void
  } = $props()

  let menuEl = $state<HTMLElement | null>(null)
  let pos = $state({ left: 0, top: 0 })

  $effect(() => {
    if (open && anchor && menuEl) {
      const r = anchor.getBoundingClientRect()
      const mw = width || menuEl.offsetWidth
      let left = r.left
      if (align === 'center') left = r.left + r.width / 2 - mw / 2
      if (align === 'end') left = r.right - mw
      left = Math.max(8, Math.min(left, window.innerWidth - mw - 8))
      let top = r.bottom + 4
      if (top + menuEl.offsetHeight > window.innerHeight - 8) {
        top = Math.max(8, r.top - menuEl.offsetHeight - 4)
      }
      pos = { left, top }
    }
  })

  function handleSelect(item: MenuItem2<any>) {
    if (item.disabled) return
    open = false
    onselect?.(item.value, item)
  }
</script>

<svelte:window
  onkeydown={(e) => {
    if (e.key === 'Escape' && open) open = false
  }}
/>

{#if open}
  <div
    class="menu-scrim"
    onclick={() => (open = false)}
    oncontextmenu={(e) => {
      e.preventDefault()
      open = false
    }}
  ></div>
  <div
    bind:this={menuEl}
    class="m3-menu elevation-2"
    style="left: {pos.left}px; top: {pos.top}px; {width ? `width:${width}px;` : 'min-width: 112px;'}"
  >
    {#each items as item (item.value)}
      {#if item.divider}
        <div class="menu-divider"></div>
      {/if}
      <button
        class="menu-item"
        class:disabled={item.disabled}
        onclick={() => handleSelect(item)}
      >
        {#if item.icon}
          <Icon
            name={item.icon}
            size={item.iconSize ?? 20}
            color={item.color || (item.disabled ? 'var(--md-sys-color-outline)' : 'inherit')}
          />
        {/if}
        {#if item.snippet}
          {@render item.snippet()}
        {:else if item.label}
          <span class="menu-label" style={item.color ? `color:${item.color}` : ''}>
            {item.label}
          </span>
        {/if}
        {#if item.check}
          <span class="spacer"></span>
          <Icon name="check" size={18} color={item.checkColor || '#43A047'} />
        {/if}
      </button>
    {/each}
  </div>
{/if}

<style>
  .menu-scrim {
    position: fixed;
    inset: 0;
    z-index: 1499;
  }
  .m3-menu {
    position: fixed;
    z-index: 1500;
    background: var(--md-sys-color-surface-container);
    border-radius: 4px;
    padding: 8px 0;
    animation: menu-in 0.12s var(--ease-decelerate);
    transform-origin: top left;
  }
  @keyframes menu-in {
    from {
      opacity: 0;
      transform: scale(0.92) translateY(-4px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
  .menu-item {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 48px;
    padding: 0 12px;
    width: 100%;
    text-align: left;
    font-size: 14px;
    line-height: 20px;
    color: var(--md-sys-color-on-surface);
  }
  .menu-item:hover {
    background: color-mix(in srgb, var(--md-sys-color-on-surface) 6%, transparent);
  }
  .menu-item.disabled {
    opacity: 0.38;
    pointer-events: none;
  }
  .menu-label {
    white-space: nowrap;
  }
  .menu-divider {
    height: 1px;
    background: var(--md-sys-color-outline-variant);
    margin: 8px 0;
  }
  .spacer {
    flex: 1;
  }
</style>
