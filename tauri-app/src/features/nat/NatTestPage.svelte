<script lang="ts">
  // NatTestPage — 对应 nat_test_page.dart: NAT 类型检测 (进页自动测试)
  import { onMount } from 'svelte'
  import BaseSettingsPage from '../settings/BaseSettingsPage.svelte'
  import Card from '../../lib/ui/Card.svelte'
  import Icon from '../../lib/ui/Icon.svelte'
  import Progress from '../../lib/ui/Progress.svelte'
  import Button from '../../lib/ui/Button.svelte'
  import Dropdown from '../../lib/ui/Dropdown.svelte'
  import { bridge } from '../../lib/core/bridge/bridge'
  import { snackbar } from '../../lib/ui/snackbar.svelte.ts'
  import { M2 } from '../../lib/utils/uiHelpers'
  import type { NetworkTestResult } from '../../lib/core/models/types'

  const STUN_SERVERS = ['stun.hot-chilli.net', 'stun.miwifi.com', 'stun.l.google.com']

  let stunServer = $state(STUN_SERVERS[0])
  let result = $state<NetworkTestResult | null>(null)
  let testing = $state(false)

  async function runTest() {
    if (testing) return
    testing = true
    result = null
    try {
      result = await bridge.testNetworkConnectivity(stunServer)
    } catch (e: any) {
      snackbar.show({
        title: 'NAT 检测失败',
        message: String(e?.message ?? e),
        type: 'error',
        action: { label: '重试', color: '#fff', onclick: runTest },
      })
    }
    testing = false
  }

  onMount(() => {
    setTimeout(runTest, 0)
  })

  function natColor(natType: string): string {
    if (['完全锥形', 'Full Cone', '开放互联网', 'Open Internet'].some((k) => natType.includes(k)))
      return M2.green
    if (['受限锥形', 'Restricted Cone', '端口受限', 'Port Restricted'].some((k) => natType.includes(k)))
      return M2.blue
    if (natType.includes('对称型') || natType.includes('Symmetric')) return M2.orange
    return M2.red
  }

  function natIcon(natType: string): string {
    if (['完全锥形', 'Full Cone', '开放互联网', 'Open Internet'].some((k) => natType.includes(k)))
      return 'check_circle'
    if (['受限锥形', 'Restricted Cone', '端口受限', 'Port Restricted'].some((k) => natType.includes(k)))
      return 'info'
    if (natType.includes('对称型') || natType.includes('Symmetric')) return 'warning'
    return 'error'
  }

  function natDescription(natType: string): string {
    if (natType.includes('完全锥形') || natType.includes('Full Cone'))
      return '最佳连接。任何主机都可发送数据。'
    if (natType.includes('受限锥形') || natType.includes('Restricted Cone'))
      return '良好连接。只有联系过的主机可发送。'
    if (natType.includes('端口受限') || natType.includes('Port Restricted'))
      return '较好连接。常见类型，部分联机可用。'
    if ((natType.includes('对称型') || natType.includes('Symmetric')) && !natType.includes('防火墙'))
      return '可能影响P2P连接，需要中继服务器。'
    if (natType.includes('防火墙') || natType.includes('Firewall'))
      return 'UDP流量受限。请检查防火墙。'
    if (natType.includes('被阻止') || natType.includes('Blocked'))
      return 'UDP被阻止。请检查路由器设置。'
    if (natType.includes('开放互联网') || natType.includes('Open Internet'))
      return '理想状态！无NAT，直连互联网。'
    return '无法确定。尝试更换STUN服务器。'
  }
</script>

<BaseSettingsPage title="NAT 类型检测">
  <div class="nat-body">
    {#if testing}
      <Card radius={12} margin="none">
        <div class="testing">
          <Progress circular size={24} strokeWidth={3} />
          <span class="gap16"></span>
          <div class="testing-text">
            <div class="tt title-medium">正在检测中...</div>
            <div class="ts">使用多 STUN 标准探测</div>
          </div>
        </div>
      </Card>
    {:else if result}
      <Card radius={12} margin="none">
        <div class="result">
          {#snippet compact(protocol: string, natType: string, latency: number)}
            <div class="proto-row">
              <span class="proto-badge">{protocol}</span>
              <span class="spacer"></span>
              <Icon name="speed" size={16} color="var(--md-sys-color-primary)" />
              <span class="gap4"></span>
              <span class="latency">{latency >= 0 ? `${latency}ms` : '-'}</span>
            </div>
            <div class="h8"></div>
            <div class="nat-row">
              <Icon name={natIcon(natType)} size={20} color={natColor(natType)} />
              <span class="gap8"></span>
              <span class="nat-type" style="color: {natColor(natType)}">{natType}</span>
            </div>
            <div class="h4"></div>
            <div class="nat-desc">{natDescription(natType)}</div>
          {/snippet}
          {@render compact('IPv4', result.natTypeV4, result.ipv4Latency)}
          <div class="h16"></div>
          <div class="divider"></div>
          <div class="h16"></div>
          {@render compact('IPv6', result.natTypeV6, result.ipv6Latency)}
        </div>
      </Card>
    {:else}
      <Card radius={12} margin="none">
        <div class="testing">
          <Icon name="error_outline" size={24} color="var(--md-sys-color-error)" />
          <span class="gap16"></span>
          <div class="tt title-medium">检测失败</div>
        </div>
      </Card>
    {/if}

    <div class="h16"></div>

    <div class="controls">
      <div class="flex">
        <Dropdown
          bind:value={stunServer}
          mode="field"
          label="STUN 服务器"
          items={STUN_SERVERS.map((s2) => ({ value: s2, label: s2 }))}
          disabled={testing}
        />
      </div>
      <span class="gap12"></span>
      <Button variant="filled" icon="refresh" disabled={testing} onclick={runTest}>检测</Button>
    </div>
  </div>
</BaseSettingsPage>

<style>
  .nat-body {
    padding: 16px;
    display: flex;
    flex-direction: column;
  }
  .testing {
    display: flex;
    align-items: center;
    padding: 20px;
  }
  .testing-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .tt {
    font-size: 14px;
    font-weight: 500;
  }
  .ts {
    font-size: 12px;
    color: var(--md-sys-color-on-surface-variant);
  }
  .result {
    padding: 16px;
    display: flex;
    flex-direction: column;
  }
  .proto-row {
    display: flex;
    align-items: center;
  }
  .proto-badge {
    background: var(--md-sys-color-primary-container);
    color: var(--md-sys-color-on-primary-container);
    font-size: 12px;
    font-weight: 700;
    padding: 4px 8px;
    border-radius: 4px;
  }
  .spacer {
    flex: 1;
  }
  .latency {
    font-size: 12px;
    font-weight: 700;
  }
  .nat-row {
    display: flex;
    align-items: center;
  }
  .nat-type {
    font-size: 14px;
    font-weight: 700;
  }
  .nat-desc {
    font-size: 12px;
    color: var(--md-sys-color-on-surface-variant);
    padding-left: 28px;
  }
  .divider {
    height: 1px;
    background: var(--md-sys-color-outline-variant);
  }
  .controls {
    display: flex;
    align-items: center;
  }
  .gap4 {
    width: 4px;
    display: inline-block;
  }
  .gap8 {
    width: 8px;
    display: inline-block;
  }
  .gap12 {
    width: 12px;
    display: inline-block;
  }
  .gap16 {
    width: 16px;
    display: inline-block;
  }
  .h4 {
    height: 4px;
  }
  .h8 {
    height: 8px;
  }
  .h16 {
    height: 16px;
  }
</style>
