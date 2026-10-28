<script lang="ts">
  // SettingsCard — 对应 buildSettingsCard: header + Card + 分隔线列表
  import Card from '../../lib/ui/Card.svelte'
  import Divider from '../../lib/ui/Divider.svelte'

  let {
    header,
    divider = false,
    children,
    ...rest
  }: {
    header?: string
    divider?: boolean
    children?: import('svelte').Snippet
  } = $props()
</script>

<div class="settings-card-wrap">
  {#if header}
    <div class="card-header">{header}</div>
  {/if}
  <Card radius={12} margin="4px" {...rest}>
    <div class="card-content">
      {#if divider}
        <Divider height={1} />
      {/if}
      {@render children?.()}
    </div>
  </Card>
</div>

<style>
  .settings-card-wrap {
    display: flex;
    flex-direction: column;
  }
  .card-header {
    padding: 8px 16px;
    font-size: 14px;
    font-weight: 700;
    color: var(--md-sys-color-primary);
  }
</style>
