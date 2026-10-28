<script lang="ts">
  // AllUserCard — 对应 all_user_card.dart (+body/nat/tile): 详细模式大卡
  import Icon from '../../lib/ui/Icon.svelte'
  import IconButton from '../../lib/ui/IconButton.svelte'
  import Card from '../../lib/ui/Card.svelte'
  import Divider from '../../lib/ui/Divider.svelte'
  import { ripple, tooltip } from '../../lib/ui/actions'
  import { snackbar } from '../../lib/ui/snackbar.svelte.ts'
  import {
    mapConnectionType,
    connectionTypeColor,
    connectionTypeIcon,
    latencyColor,
    lossColor,
    displayName,
    allNatInfo,
    parsePlatform,
    getVersionNumber,
    formatTunnelProto,
    formatBytes,
  } from '../../lib/utils/uiHelpers'
  import type { KVNodeInfo } from '../../core/models/types'

  let { node, localIp }: { node: KVNodeInfo; localIp: string } = $props()

  let connType = $derived(mapConnectionType(node.cost, node.ipv4, localIp))
  let name = $derived(displayName(node))
  let nat = $derived(allNatInfo(node.nat))
  let platform = $derived(parsePlatform(node.version))
  let ver = $derived(getVersionNumber(node.version))
  let conn = $derived(node.connections[0])

  function copyIp() {
    if (node.ipv4 && node.ipv4 !== '0.0.0.0') {
      navigator.clipboard?.writeText(node.ipv4).catch(() => {})
      snackbar.show({ title: '已复制', message: `IP: ${node.ipv4}`, type: 'success', duration: 2000 })
    }
  }
</script>

<Card radius={8} margin="none">
  <div class="all-card" use:ripple onclick={copyIp}>
    <div class="content">
      <!-- 头部 -->
      <div class="head">
        <div class="name-area">
          <Icon name="person" size={22} color="var(--md-sys-color-primary)" />
          <span class="gap8"></span>
          <span class="name ellipsis" title={name}>{name}</span>
        </div>
        <span class="gap16"></span>
        <div class="badges">
          <span class="badge" style="background: {connectionTypeColor(connType)}">
            <Icon name={connectionTypeIcon(connType)} size={14} color="#fff" />
            <span class="gap4"></span>
            {connType}
          </span>
          {#if connType !== '本机'}
            <span class="metric" title="延迟">
              <Icon name="timer_outlined" size={18} color={latencyColor(node.latencyMs)} />
              <span class="gap4"></span>
              <span class="metric-val" style="color: {latencyColor(node.latencyMs)}"
                >{Math.round(node.latencyMs)} ms</span
              >
            </span>
            <span class="metric" title="丢包率">
              <Icon name="error_outline" size={18} color={lossColor(node.lossRate)} />
              <span class="gap4"></span>
              <span class="metric-val" style="color: {lossColor(node.lossRate)}"
                >{node.lossRate.toFixed(1)}%</span
              >
            </span>
          {/if}
        </div>
      </div>

      <div class="gap8"></div>
      <Divider />
      <div class="gap12"></div>

      <!-- 网络统计 -->
      {#if !conn}
        <div class="no-conn">无连接数据</div>
      {:else}
        <div class="net-head">
          <Icon name="wifi" size={20} color="var(--md-sys-color-primary)" />
          <span class="gap8"></span>
          <span class="net-title">网络数据:</span>
        </div>
        <div class="gap12"></div>
        <div class="stats-area">
          <div class="stats-col">
            <div class="stat-item">
              <Icon name="upload_rounded" size={18} color="var(--md-sys-color-primary)" />
              <span class="gap6"></span>
              <div class="stat-text">
                <div class="stat-label">累计上传</div>
                <div class="stat-value" style="color: var(--md-sys-color-primary)"
                  >{formatBytes(conn.txBytes)}</div
                >
              </div>
            </div>
            <div class="gap10"></div>
            <div class="stat-item">
              <Icon name="arrow_upward_rounded" size={18} color="var(--md-sys-color-primary)" />
              <span class="gap6"></span>
              <div class="stat-text">
                <div class="stat-label">累计发送包</div>
                <div class="stat-value" style="color: var(--md-sys-color-primary)"
                  >{conn.txPackets.toString()}</div
                >
              </div>
            </div>
          </div>
          <div class="stats-gap"></div>
          <div class="stats-col">
            <div class="stat-item">
              <Icon name="download_rounded" size={18} color="var(--md-sys-color-secondary)" />
              <span class="gap6"></span>
              <div class="stat-text">
                <div class="stat-label">累计下载</div>
                <div class="stat-value" style="color: var(--md-sys-color-secondary)"
                  >{formatBytes(conn.rxBytes)}</div
                >
              </div>
            </div>
            <div class="gap10"></div>
            <div class="stat-item">
              <Icon name="arrow_downward_rounded" size={18} color="var(--md-sys-color-secondary)" />
              <span class="gap6"></span>
              <div class="stat-text">
                <div class="stat-label">累计接收包</div>
                <div class="stat-value" style="color: var(--md-sys-color-secondary)"
                  >{conn.rxPackets.toString()}</div
                >
              </div>
            </div>
          </div>
        </div>
      {/if}

      <div class="gap8"></div>
      <Divider />
      <div class="gap8"></div>

      <!-- 详情 -->
      <div class="details">
        {#if node.ipv4 && node.ipv4 !== '0.0.0.0'}
          <div class="info-row">
            <Icon name="lan_outlined" size={20} color="var(--md-sys-color-primary)" />
            <span class="gap12"></span>
            <span class="info-label">IP地址:</span>
            <span class="gap8"></span>
            <IconButton
              icon="content_copy"
              iconSize={18}
              size={40}
              padding={11}
              tip="复制IP地址"
              onclick={() => {
                navigator.clipboard?.writeText(node.ipv4).catch(() => {})
                snackbar.show({
                  title: '已复制',
                  message: `IP地址: ${node.ipv4}`,
                  type: 'success',
                  duration: 2000,
                })
              }}
            />
            <span class="gap8"></span>
            <span class="info-value ellipsis">{node.ipv4}</span>
          </div>
        {/if}
        <div class="info-row">
          <Icon name={platform.icon} size={20} color="var(--md-sys-color-primary)" />
          <span class="gap12"></span>
          <span class="info-label">ET版本:</span>
          <span class="gap8"></span>
          <span class="info-value ellipsis">{ver}</span>
        </div>
        <div class="info-row">
          <Icon name={nat.icon} size={20} color={nat.color} />
          <span class="gap12"></span>
          <span class="info-label">NAT类型:</span>
          <span class="gap8"></span>
          <span class="info-value ellipsis" style="color: {nat.color}">{nat.label}</span>
        </div>
        {#if node.tunnelProto}
          <div class="info-row">
            <Icon name="router" size={20} color="var(--md-sys-color-primary)" />
            <span class="gap12"></span>
            <span class="info-label">隧道类型:</span>
            <span class="gap8"></span>
            <span class="info-value ellipsis">{formatTunnelProto(node.tunnelProto)}</span>
          </div>
        {/if}
        {#if node.hops.length > 0}
          <div class="hops-row">
            <Icon name="route" size={20} color="var(--md-sys-color-primary)" />
            <span class="gap12"></span>
            <div class="hops-body">
              <div class="info-label">连接路径:</div>
              <div class="gap4"></div>
              {#each node.hops as hop (hop.peerId + hop.targetIp)}
                <div class="hop-chip">
                  {hop.nodeName} ({Math.round(hop.latencyMs)}ms, {hop.packetLoss.toFixed(1)}%)
                </div>
                <div class="gap4"></div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
</Card>

<style>
  .all-card {
    padding: 12px;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    border: 1px solid transparent;
    border-radius: 8px;
    height: 100%;
  }
  .all-card:hover {
    border-color: var(--md-sys-color-primary);
  }
  .content {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }
  .head {
    display: flex;
    align-items: flex-start;
    width: 100%;
  }
  .name-area {
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;
  }
  .name {
    font-size: 18px;
    font-weight: 700;
  }
  .badges {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    align-items: center;
    gap: 12px 12px;
    flex-shrink: 0;
  }
  .badge {
    display: inline-flex;
    align-items: center;
    color: #fff;
    font-size: 12px;
    font-weight: 700;
    padding: 4px 8px;
    border-radius: 12px;
  }
  .metric {
    display: inline-flex;
    align-items: center;
  }
  .metric-val {
    font-size: 13px;
    font-weight: 700;
  }
  .no-conn {
    color: color-mix(in srgb, var(--md-sys-color-on-surface) 60%, transparent);
    align-self: center;
  }
  .net-head {
    display: flex;
    align-items: center;
    align-self: stretch;
  }
  .net-title {
    font-weight: 700;
  }
  .stats-area {
    display: flex;
    gap: 16px;
    align-self: stretch;
  }
  .stats-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
  }
  .stats-gap {
    width: 16px;
    flex-shrink: 0;
  }
  .stat-item {
    display: flex;
    align-items: center;
  }
  .stat-label {
    font-size: 12px;
    color: color-mix(in srgb, var(--md-sys-color-on-surface) 70%, transparent);
  }
  .stat-value {
    font-size: 14px;
    font-weight: 700;
  }
  .details {
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-self: stretch;
  }
  .info-row {
    display: flex;
    align-items: center;
  }
  .info-label {
    font-weight: 700;
    flex-shrink: 0;
  }
  .info-value {
    color: var(--md-sys-color-secondary);
    font-weight: 500;
    flex: 1;
    min-width: 0;
  }
  .hops-row {
    display: flex;
    align-items: flex-start;
  }
  .hops-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }
  .hop-chip {
    background: var(--md-sys-color-primary-container);
    color: var(--md-sys-color-on-primary-container);
    font-size: 12px;
    padding: 2px 6px;
    border-radius: 4px;
  }
  .gap4 {
    height: 4px;
    width: 4px;
    flex-shrink: 0;
  }
  .gap6 {
    width: 6px;
    flex-shrink: 0;
  }
  .gap8 {
    width: 8px;
    height: 8px;
    flex-shrink: 0;
  }
  .gap10 {
    height: 10px;
    flex-shrink: 0;
  }
  .gap12 {
    width: 12px;
    height: 12px;
    flex-shrink: 0;
  }
  .gap16 {
    width: 16px;
    flex-shrink: 0;
  }
</style>
