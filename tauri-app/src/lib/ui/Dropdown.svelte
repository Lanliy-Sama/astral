<script lang="ts">
  // Dropdown — 两种模式:
  //  mode='field'  : DropdownButtonFormField (OutlineInputBorder, 56高, 浮动label)
  //  mode='plain'  : DropdownButton 无下划线 (设置页风格: 水平padding 8 + 圆角 8 容器)
  import Icon from './Icon.svelte'
  import { createEventDispatcher } from 'svelte'

  export interface DropItem<V = string> {
    value: V
    label: string
    fontSize?: number
  }

  let {
    value = $bindable(),
    items,
    mode = 'field',
    label,
    disabled = false,
    itemFontSize = 14,
    onselect,
    onmenuopen,
  }: {
    value?: any
    items: DropItem<any>[]
    mode?: 'field' | 'plain'
    label?: string
    disabled?: boolean
    itemFontSize?: number
    onselect?: (v: any) => void
    onmenuopen?: () => void
  } = $props()

  const dispatch = createEventDispatcher<{ select: any }>()

  let open = $state(false)
  let anchorEl = $state<HTMLElement | null>(null)
  let menuEl = $state<HTMLElement | null>(null)
  let pos = $state({ left: 0, top: 0, width: 0, up: false })

  let selected = $derived(items.find((i) => i.value === value))

  $effect(() => {
    if (open && anchorEl && menuEl) {
      const r = anchorEl.getBoundingClientRect()
      const mh = menuEl.offsetHeight
      let top = r.bottom + 4
      let up = false
      if (top + mh > window.innerHeight - 8 && r.top - mh - 4 > 8) {
        top = r.top - mh - 4
        up = true
      }
      const left = Math.max(8, Math.min(r.left, window.innerWidth - menuEl.offsetWidth - 8))
      pos = { left, top, width: r.width, up }
    }
  })

  function toggle() {
    if (disabled) return
    open = !open
    if (open) onmenuopen?.()
  }
</script>

<div
  bind:this={anchorEl}
  class="dd {mode}"
  class:disabled
  class:open
  onclick={toggle}
>
  {#if mode === 'field'}
    {#if label}
      <label class:active={selected || open}>{label}</label>
    {/if}
    <div class="value" class:placeholder={!selected}>{selected?.label ?? ''}</div>
  {:else}
    <div class="value">{selected?.label ?? ''}</div>
  {/if}
  <Icon name="arrow_drop_down" size={24} color="var(--md-sys-color-on-surface-variant)" />
</div>

{#if open}
  <div class="scrim" onclick={() => (open = false)}></div>
  <div
    bind:this={menuEl}
    class="dd-menu elevation-2"
    style="left:{pos.left}px; top:{pos.top}px; min-width: {Math.max(pos.width, 48)}px;"
  >
    {#each items as item (String(item.value))}
      <button
        class="dd-item"
        class:selected={item.value === value}
        style="font-size:{item.fontSize ?? itemFontSize}px"
        onclick={() => {
          value = item.value
          open = false
          onselect?.(item.value)
          dispatch('select', item.value)
        }}
      >
        {item.label}
      </button>
    {/each}
  </div>
{/if}

<style>
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 1499;
  }
  .dd {
    display: flex;
    align-items: center;
    cursor: pointer;
    position: relative;
    gap: 0;
  }
  .dd.disabled {
    opacity: 0.38;
    pointer-events: none;
  }
  .dd.field {
    min-height: 56px;
    border: 1px solid var(--md-sys-color-outline);
    border-radius: 4px;
    padding: 0 12px;
    position: relative;
    background: transparent;
  }
  .dd.field.open {
    border: 2px solid var(--md-sys-color-primary);
    padding: 0 11px;
  }
  .dd.field label {
    position: absolute;
    left: 12px;
    top: 8px;
    font-size: 12px;
    line-height: 16px;
    color: var(--md-sys-color-on-surface-variant);
    pointer-events: none;
  }
  .dd.field.open label {
    color: var(--md-sys-color-primary);
  }
  .dd.field .value {
    flex: 1;
    padding: 24px 0 4px;
    font-size: 16px;
    line-height: 24px;
  }
  .dd.plain {
    padding: 8px 8px;
    border-radius: 8px;
    gap: 4px;
  }
  .dd.plain .value {
    font-size: 14px;
    line-height: 20px;
    padding: 4px 0 4px 8px;
    white-space: nowrap;
  }
  .value.placeholder {
    color: color-mix(in srgb, var(--md-sys-color-on-surface) 60%, transparent);
  }
  .dd-menu {
    position: fixed;
    z-index: 1500;
    background: var(--md-sys-color-surface-container);
    border-radius: 4px;
    padding: 8px 0;
    max-height: 320px;
    overflow-y: auto;
    animation: menu-in 0.12s var(--ease-decelerate);
  }
  @keyframes menu-in {
    from {
      opacity: 0;
      transform: scaleY(0.92);
    }
    to {
      opacity: 1;
      transform: scaleY(1);
    }
  }
  .dd-item {
    display: block;
    width: 100%;
    text-align: left;
    padding: 14px 16px;
    min-height: 48px;
    color: var(--md-sys-color-on-surface);
    line-height: 20px;
    font-weight: 400;
    white-space: nowrap;
  }
  .dd-item:hover {
    background: color-mix(in srgb, var(--md-sys-color-on-surface) 6%, transparent);
  }
</style>
