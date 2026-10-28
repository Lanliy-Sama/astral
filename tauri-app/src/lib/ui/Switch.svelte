<script lang="ts">
  // M3 Switch — 52×32 轨道, 选中 handle 24 / 未选 handle 16
  import { createEventDispatcher } from 'svelte'

  let {
    checked = false,
    disabled = false,
    onchange,
  }: {
    checked?: boolean
    disabled?: boolean
    onchange?: (value: boolean) => void
  } = $props()

  const dispatch = createEventDispatcher<{ change: boolean }>()

  function toggle() {
    if (disabled) return
    const v = !checked
    checked = v
    onchange?.(v)
    dispatch('change', v)
  }
</script>

<button
  class="m3-switch"
  class:checked
  class:disabled
  role="switch"
  aria-checked={checked}
  onclick={toggle}
>
  <span class="thumb"></span>
</button>

<style>
  .m3-switch {
    width: 52px;
    height: 32px;
    border-radius: 16px;
    position: relative;
    flex-shrink: 0;
    transition:
      background-color 0.2s var(--ease-material),
      border-color 0.2s var(--ease-material);
    border: 2px solid var(--md-sys-color-outline);
    background: var(--md-sys-color-surface-container-highest);
  }
  .thumb {
    position: absolute;
    left: 6px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--md-sys-color-outline);
    transition:
      width 0.2s var(--ease-material),
      height 0.2s var(--ease-material),
      left 0.2s var(--ease-material),
      background-color 0.2s var(--ease-material);
  }
  .m3-switch.checked {
    background: var(--md-sys-color-primary);
    border-color: var(--md-sys-color-primary);
  }
  .m3-switch.checked .thumb {
    width: 24px;
    height: 24px;
    left: 24px;
    background: var(--md-sys-color-on-primary);
  }
  .m3-switch.disabled {
    opacity: 0.38;
    pointer-events: none;
  }
</style>
