<script lang="ts">
  // M3 Checkbox — 18×18 / 圆角 2 / 选中 primary 底白勾
  import { createEventDispatcher } from 'svelte'

  let {
    checked = $bindable(false),
    tristate = false,
    disabled = false,
    onchange,
  }: {
    checked?: boolean | null
    tristate?: boolean
    disabled?: boolean
    onchange?: (v: boolean | null) => void
  } = $props()

  const dispatch = createEventDispatcher<{ change: boolean | null }>()

  function toggle() {
    if (disabled) return
    let next: boolean | null
    if (tristate) {
      next = checked === false ? true : checked === true ? null : false
    } else {
      next = !checked
    }
    checked = next
    onchange?.(next)
    dispatch('change', next)
  }
</script>

<button
  class="m3-check"
  class:checked={checked === true}
  class:tristate={checked === null}
  class:disabled
  role="checkbox"
  aria-checked={checked === null ? 'mixed' : checked}
  onclick={toggle}
>
  {#if checked === true}
    <svg viewBox="0 0 24 24" width="18" height="18">
      <path
        d="M9.55 17.6 4 12.05l1.4-1.4 4.15 4.15 8.65-8.65 1.4 1.4z"
        fill="var(--md-sys-color-on-primary)"
      />
    </svg>
  {:else if checked === null}
    <div class="dash"></div>
  {/if}
</button>

<style>
  .m3-check {
    width: 18px;
    height: 18px;
    border-radius: 2px;
    border: 2px solid var(--md-sys-color-on-surface-variant);
    background: transparent;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    padding: 0;
    transition: all 0.1s ease;
  }
  .m3-check.checked {
    background: var(--md-sys-color-primary);
    border-color: var(--md-sys-color-primary);
  }
  .m3-check.tristate {
    background: var(--md-sys-color-primary);
    border-color: var(--md-sys-color-primary);
  }
  .dash {
    width: 10px;
    height: 2px;
    background: var(--md-sys-color-on-primary);
  }
  .disabled {
    opacity: 0.38;
    pointer-events: none;
  }
</style>
