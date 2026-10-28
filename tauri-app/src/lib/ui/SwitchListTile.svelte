<script lang="ts">
  // SwitchListTile — M3: 整行可点切换, Switch 靠右
  import Switch from './Switch.svelte'
  import Icon from './Icon.svelte'

  let {
    title,
    subtitle,
    checked = false,
    disabled = false,
    leadingIcon,
    onchange,
  }: {
    title?: string
    subtitle?: string
    checked?: boolean
    disabled?: boolean
    leadingIcon?: string
    onchange?: (value: boolean) => void
  } = $props()

  function handleToggle() {
    if (disabled) return
    const v = !checked
    checked = v
    onchange?.(v)
  }
</script>

<div
  class="switch-tile"
  class:disabled
  role="switch"
  aria-checked={checked}
  tabindex="0"
  onclick={handleToggle}
  onkeydown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleToggle()
    }
  }}
>
  {#if leadingIcon}
    <div class="leading">
      <Icon name={leadingIcon} />
    </div>
  {/if}
  <div class="body">
    {#if title}<div class="t">{title}</div>{/if}
    {#if subtitle}
      <div class="s">{subtitle}</div>
    {/if}
  </div>
  <Switch bind:checked {disabled} />
</div>

<style>
  .switch-tile {
    display: flex;
    align-items: center;
    gap: 16px;
    min-height: 56px;
    padding: 8px 16px;
    cursor: pointer;
  }
  .switch-tile:hover {
    background: color-mix(in srgb, var(--md-sys-color-on-surface) 4%, transparent);
  }
  .disabled {
    opacity: 0.38;
    pointer-events: none;
  }
  .leading {
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }
  .body {
    flex: 1;
    min-width: 0;
  }
  .t {
    font-size: 16px;
    line-height: 24px;
  }
  .s {
    font-size: 14px;
    line-height: 20px;
    color: var(--md-sys-color-on-surface-variant);
  }
</style>
