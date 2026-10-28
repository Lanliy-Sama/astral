<script lang="ts">
  // 进度指示器 — M3 CircularProgressIndicator / LinearProgressIndicator
  let {
    circular = true,
    size = 36,
    strokeWidth = 4,
    value,
    trackColor,
    indicatorColor,
    height = 4,
    rounded = true,
  }: {
    circular?: boolean
    size?: number
    strokeWidth?: number
    value?: number
    trackColor?: string
    indicatorColor?: string
    height?: number
    rounded?: boolean
  } = $props()

  let C = $derived(2 * Math.PI * (size / 2 - strokeWidth / 2))
</script>

{#if circular}
  <div
    class="cp"
    style="width:{size}px;height:{size}px; --ind: {indicatorColor ||
      'var(--md-sys-color-primary)'}; --track: {trackColor ||
      'color-mix(in srgb, var(--md-sys-color-primary) 8%, transparent)'}"
  >
    <svg viewBox="0 0 {size} {size}" width={size} height={size}>
      {#if value !== undefined}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - strokeWidth / 2}
          fill="none"
          stroke="var(--track)"
          stroke-width={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - strokeWidth / 2}
          fill="none"
          stroke="var(--ind)"
          stroke-width={strokeWidth}
          stroke-linecap={rounded ? 'round' : 'butt'}
          stroke-dasharray="{C * value} {C}"
          transform="rotate(-90 {size / 2} {size / 2})"
        />
      {:else}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - strokeWidth / 2}
          fill="none"
          stroke="var(--track)"
          stroke-width={strokeWidth}
        />
        <g class="rot">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - strokeWidth / 2}
            fill="none"
            stroke="var(--ind)"
            stroke-width={strokeWidth}
            stroke-linecap={rounded ? 'round' : 'butt'}
            stroke-dasharray="{C * 0.75} {C}"
          />
        </g>
      {/if}
    </svg>
  </div>
{:else}
  <div
    class="lp"
    style="height:{height}px; --ind: {indicatorColor ||
      'var(--md-sys-color-primary)'}; --track: {trackColor ||
      'color-mix(in srgb, var(--md-sys-color-primary) 8%, transparent)'}"
  >
    {#if value !== undefined}
      <div class="fill" style="width: {Math.min(100, Math.max(0, value * 100))}%"></div>
    {:else}
      <div class="indeterminate"></div>
    {/if}
  </div>
{/if}

<style>
  .cp {
    display: inline-flex;
    flex-shrink: 0;
  }
  .rot {
    transform-origin: center;
    animation: spin 1.4s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  .lp {
    width: 100%;
    border-radius: 4px;
    overflow: hidden;
    background: var(--track);
    position: relative;
  }
  .fill {
    height: 100%;
    background: var(--ind);
    border-radius: 4px;
    transition: width 0.2s var(--ease-material);
  }
  .indeterminate {
    position: absolute;
    inset: 0;
    border-radius: 4px;
    background: var(--ind);
    animation: indet 1.8s var(--ease-material) infinite;
  }
  @keyframes indet {
    0% {
      left: -40%;
      right: 100%;
    }
    55% {
      left: 35%;
      right: 0%;
    }
    100% {
      left: 100%;
      right: -20%;
    }
  }
</style>
