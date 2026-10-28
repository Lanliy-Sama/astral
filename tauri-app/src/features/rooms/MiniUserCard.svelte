<script lang="ts">
  // MiniUserCard — 对应 mini_user_card.dart (+nat 等级制)
  import Icon from '../../lib/ui/Icon.svelte'
  import Card from '../../lib/ui/Card.svelte'
  import { ripple, tooltip } from '../../lib/ui/actions'
  import { snackbar } from '../../lib/ui/snackbar.svelte.ts'
  import {
    mapConnectionType,
    connectionTypeColor,
    latencyColor,
    lossColor,
    displayName,
    miniNatInfo,
    parsePlatform,
    getVersionNumber,
    formatTunnelProto,
  } from '../../lib/utils/uiHelpers'
  import type { KVNodeInfo } from '../../core/models/types'

  let { node, localIp }: { node: KVNodeInfo; localIp: string } = $props()

  let connType = $derived(mapConnectionType(node.cost, node.ipv4, localIp))
  let name = $derived(displayName(node))
  let nat = $derived(miniNatInfo(node.nat))
  let platform = $derived(parsePlatform(node.version))
  let ver = $derived(getVersionNumber(node.version))
</script>

<Card radius={8} margin="none">
  <div
    class="mini-card hoverable"
    use:ripple
    onclick={() => {
      if (node.ipv4 && node.ipv4 !== '0.0.0.0') {
        navigator.clipboard?.writeText(node.ipv4).catch(() => {})
        snackbar.show({ title: '已复制', message: `IP地址: ${node.ipv4}`, type: 'success', duration: 2000 })
      }
    }}
  >
    <!-- 第一行 -->
    <div class="row1">
      <Icon name="person" size={18} color="var(--md-sys-color-primary)" />
      <span class="gap6"></span>
      <span class="name ellipsis" title={name}>{name}</span>
      <span class="gap10"></span>
      <span class="badge" style="background: {connectionTypeColor(connType)}">{connType}</span>
      {#if connType !== '本机'}
        <span class="gap10"></span>
        <Icon name="timer_outlined" size={16} color={latencyColor(node.latencyMs)} />
        <span class="stat" style="color: {latencyColor(node.latencyMs)}">{Math.round(node.latencyMs)}ms</span>
        <span class="gap10"></span>
        <Icon name="error_outline" size={16} color={lossColor(node.lossRate)} />
        <span class="stat" style="color: {lossColor(node.lossRate)}">{node.lossRate.toFixed(1)}%</span>
      {/if}
    </div>
    <div class="gap4"></div>
    <!-- 第二行 -->
    <div class="row2">
      {#if node.ipv4 && node.ipv4 !== '0.0.0.0'}
        <Icon name="lan_outlined" size={16} color="var(--md-sys-color-primary)" />
        <span class="gap4"></span>
        <span class="ip ellipsis" title={node.ipv4}>{node.ipv4}</span>
      {:else}
        <span class="ip"></span>
      {/if}
      <span class="gap10"></span>
      <Icon name={platform.icon} size={16} color="var(--md-sys-color-primary)" />
      <span class="ver">{ver}</span>
      {#if connType !== '本机' && node.nat}
        <span class="gap10"></span>
        <Icon name={nat.icon} size={16} color={nat.color} />
        <span class="stat" style="color: {nat.color}">{nat.label}</span>
      {/if}
      {#if node.tunnelProto}
        <span class="gap10"></span>
        <Icon name="router" size={16} color="var(--md-sys-color-primary)" />
        <span class="ver">{formatTunnelProto(node.tunnelProto)}</span>
      {/if}
    </div>
  </div>
</Card>

<style>
  .mini-card {
    padding: 8px 12px;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    border: 1px solid transparent;
    border-radius: 8px;
    height: 100%;
  }
  .mini-card:hover {
    border-color: var(--md-sys-color-primary);
  }
  .row1 {
    display: flex;
    align-items: center;
    width: 100%;
  }
  .row2 {
    display: flex;
    align-items: center;
    width: 100%;
  }
  .name {
    flex: 1;
    min-width: 0;
    font-size: 15px;
    font-weight: 700;
  }
  .badge {
    color: #fff;
    font-size: 12px;
    padding: 2px 6px;
    border-radius: 8px;
    flex-shrink: 0;
  }
  .stat {
    font-size: 13px;
    font-weight: 700;
    flex-shrink: 0;
  }
  .ip {
    color: var(--md-sys-color-secondary);
    font-size: 13px;
    flex: 1;
    min-width: 0;
  }
  .ver {
    color: var(--md-sys-color-secondary);
    font-size: 13px;
    flex-shrink: 0;
    white-space: nowrap;
  }
  .gap4 {
    width: 4px;
    flex-shrink: 0;
  }
  .gap6 {
    width: 6px;
    flex-shrink: 0;
  }
  .gap10 {
    width: 10px;
    flex-shrink: 0;
  }
</style>
