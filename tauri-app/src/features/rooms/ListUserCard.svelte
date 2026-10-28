<script lang="ts">
  // ListUserCard — 对应 list_user_card.dart (列表模式, 单行紧凑)
  import Icon from '../../lib/ui/Icon.svelte'
  import { ripple } from '../../lib/ui/actions'
  import { snackbar } from '../../lib/ui/snackbar.svelte.ts'
  import {
    mapConnectionType,
    connectionTypeColor,
    latencyColor,
    lossColor,
    displayName,
  } from '../../lib/utils/uiHelpers'
  import type { KVNodeInfo } from '../../core/models/types'

  let {
    node,
    localIp,
    showDivider = false,
  }: { node: KVNodeInfo; localIp: string; showDivider?: boolean } = $props()

  let connType = $derived(mapConnectionType(node.cost, node.ipv4, localIp))
  let name = $derived(displayName(node))
</script>

<div
  class="luc"
  class:divider={showDivider}
  use:ripple
  onclick={() => {
    if (node.ipv4 && node.ipv4 !== '0.0.0.0') {
      navigator.clipboard?.writeText(node.ipv4).catch(() => {})
      snackbar.show({ title: '已复制', message: `IP地址: ${node.ipv4}`, type: 'success', duration: 2000 })
    }
  }}
>
  <Icon name="person" size={18} color="var(--md-sys-color-primary)" />
  <span class="gap8"></span>
  <span class="name ellipsis">{name}</span>
  <span class="gap8"></span>
  <span class="badge" style="background: {connectionTypeColor(connType)}">{connType}</span>
  {#if connType !== '本机'}
    <span class="gap8"></span>
    <span class="stat" style="color: {latencyColor(node.latencyMs)}">{Math.round(node.latencyMs)}ms</span>
    <span class="gap6"></span>
    <span class="stat" style="color: {lossColor(node.lossRate)}">{node.lossRate.toFixed(1)}%</span>
  {/if}
  {#if node.ipv4 && node.ipv4 !== '0.0.0.0'}
    <span class="gap8"></span>
    <span class="ip ellipsis">{node.ipv4}</span>
  {/if}
</div>

<style>
  .luc {
    display: flex;
    align-items: center;
    padding: 10px 12px;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    border-bottom: none;
  }
  .luc.divider {
    border-bottom: 1px solid color-mix(in srgb, var(--md-sys-color-outline-variant) 50%, transparent);
  }
  .luc:hover {
    background: color-mix(in srgb, var(--md-sys-color-primary) 6%, transparent);
  }
  .gap8 {
    width: 8px;
    flex-shrink: 0;
  }
  .gap6 {
    width: 6px;
    flex-shrink: 0;
  }
  .name {
    flex: 1;
    min-width: 0;
    font-size: 14px;
    font-weight: 600;
  }
  .badge {
    color: #fff;
    font-size: 11px;
    padding: 2px 6px;
    border-radius: 6px;
    flex-shrink: 0;
  }
  .stat {
    font-size: 12px;
    font-weight: 700;
    flex-shrink: 0;
  }
  .ip {
    color: var(--md-sys-color-secondary);
    font-size: 12px;
    text-align: right;
    flex-shrink: 1;
    min-width: 0;
  }
</style>
