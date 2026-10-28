<script lang="ts">
  // M3 SegmentedButton — 高40 / 圆角20全圆 / 选中段 primaryContainer
  import { createEventDispatcher } from 'svelte'

  let {
    segments,
    value = $bindable(),
    fullwidth = false,
  }: {
    segments: { value: string; label: string }[]
    value?: string
    fullwidth?: boolean
  } = $props()

  const dispatch = createEventDispatcher<{ select: string }>()
</script>

<div class="m3-seg" class:fullwidth>
  {#each segments as seg, i (seg.value)}
    {#if i > 0}<div class="seg-divider"></div>{/if}
    <button
      class="seg-btn"
      class:selected={value === seg.value}
      onclick={() => {
        value = seg.value
        dispatch('select', seg.value)
      }}
    >
      {seg.label}
    </button>
  {/each}
</div>

<style>
  .m3-seg {
    display: inline-flex;
    height: 40px;
    border-radius: 20px;
    border: 1px solid var(--md-sys-color-outline);
    overflow: hidden;
    background: transparent;
  }
  .fullwidth {
    display: flex;
    width: 100%;
  }
  .seg-btn {
    flex: 1;
    min-width: 0;
    padding: 0 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 500;
    color: var(--md-sys-color-on-surface);
    white-space: nowrap;
    transition: background 0.15s ease;
  }
  .seg-btn:hover {
    background: color-mix(in srgb, var(--md-sys-color-on-surface) 4%, transparent);
  }
  .seg-btn.selected {
    background: var(--md-sys-color-primary-container);
    color: var(--md-sys-color-on-primary-container);
  }
  .seg-divider {
    width: 1px;
    background: var(--md-sys-color-outline);
    flex-shrink: 0;
  }
</style>
