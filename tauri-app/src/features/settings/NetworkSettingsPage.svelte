<script lang="ts">
  // NetworkSettingsPage — 对应 network_settings_page.dart (基础 + 高级 + 跃点三卡)
  import BaseSettingsPage from './BaseSettingsPage.svelte'
  import SettingsCard from './SettingsCard.svelte'
  import SwitchListTile from '../../lib/ui/SwitchListTile.svelte'
  import ListTile from '../../lib/ui/ListTile.svelte'
  import Divider from '../../lib/ui/Divider.svelte'
  import Dropdown from '../../lib/ui/Dropdown.svelte'
  import TextField from '../../lib/ui/TextField.svelte'
  import Dialog from '../../lib/ui/Dialog.svelte'
  import Button from '../../lib/ui/Button.svelte'
  import { services } from '../../lib/core/services/services.svelte'
  import { t } from '../../lib/i18n/index.svelte'
  import { bridge } from '../../lib/core/bridge/bridge'
  import { snackbar } from '../../lib/ui/snackbar.svelte.ts'
  import { normalizeSocks5Port } from '../../lib/core/services/services.svelte'

  const s = services()

  // 跃点列表
  let hopListOpen = $state(false)
  let hopList = $state<[string, number][]>([])

  async function viewHops() {
    try {
      hopList = await bridge.getAllInterfacesMetrics()
      hopListOpen = true
    } catch {
      snackbar.show({ title: '错误', message: '获取跃点列表失败', type: 'error' })
    }
  }
</script>

<BaseSettingsPage title={t('network_settings')}>
  <div class="page">
    <!-- 卡片A: 基础 -->
    <SettingsCard>
      <ListTile
        title={t('p2p_hole_punching')}
        subtitle={t('preferred_protocol')}
        contentPadding="16px 16px 16px 16px"
      >
        {#snippet trailing()}
          <div class="dd-plain">
            <Dropdown
              bind:value={s.networkConfigState.defaultProtocol}
              mode="plain"
              items={[
                { value: '', label: 'tcp' },
                { value: 'tcp', label: 'TCP' },
                { value: 'udp', label: 'UDP' },
                { value: 'faketcp', label: 'FakeTCP' },
                { value: 'ws', label: 'WebSocket' },
                { value: 'wss', label: 'WSS' },
                { value: 'quic', label: 'QUIC' },
              ]}
              onselect={(v) => s.networkConfig.updateDefaultProtocol(v)}
            />
          </div>
        {/snippet}
      </ListTile>
      <Divider height={1} />
      <SwitchListTile
        title={t('enable_encryption')}
        subtitle={t('auto_set_mtu')}
        checked={s.networkConfigState.enableEncryption}
        onchange={(v) => s.networkConfig.updateEnableEncryption(v)}
      />
      <SwitchListTile
        title={t('latency_first')}
        subtitle={t('latency_first_desc')}
        checked={s.networkConfigState.latencyFirst}
        onchange={(v) => s.networkConfig.updateLatencyFirst(v)}
      />
      <SwitchListTile
        title={t('disable_p2p')}
        subtitle={t('disable_p2p_desc')}
        checked={s.networkConfigState.disableP2p}
        onchange={(v) => s.networkConfig.updateDisableP2p(v)}
      />
    </SettingsCard>

    <!-- 卡片B: 高级 -->
    <SettingsCard>
      <ListTile
        leadingIcon="settings_ethernet"
        title={t('advanced_network_settings')}
        subtitle={t('advanced_network_settings_desc')}
      />
      <Divider height={1} />
      <SwitchListTile
        title={t('disable_udp_hole_punching')}
        subtitle={t('disable_udp_hole_punching_desc')}
        checked={s.networkConfigState.disableUdpHolePunching}
        onchange={(v) => s.networkConfig.updateDisableUdpHolePunching(v)}
      />
      <SwitchListTile
        title={t('disable_tcp_hole_punching')}
        subtitle={t('disable_tcp_hole_punching_desc')}
        checked={s.networkConfigState.disableTcpHolePunching}
        onchange={(v) => s.networkConfig.updateDisableTcpHolePunching(v)}
      />
      <SwitchListTile
        title={t('disable_sym_hole_punching')}
        subtitle={t('disable_sym_hole_punching_desc')}
        checked={s.networkConfigState.disableSymHolePunching}
        onchange={(v) => s.networkConfig.updateDisableSymHolePunching(v)}
      />
      <ListTile
        title={t('compression_algorithm')}
        subtitle={t('compression_algorithm_desc')}
      >
        {#snippet trailing()}
          <div class="dd-plain">
            <Dropdown
              bind:value={s.networkConfigState.dataCompressAlgo}
              mode="plain"
              items={[
                { value: 1, label: t('no_compression') },
                { value: 2, label: t('high_performance_compression') },
              ]}
              onselect={(v) => s.networkConfig.updateDataCompressAlgo(v)}
            />
          </div>
        {/snippet}
      </ListTile>
      <SwitchListTile
        title={t('enable_kcp_proxy')}
        subtitle={t('enable_kcp_proxy_desc')}
        checked={s.networkConfigState.enableKcpProxy}
        onchange={(v) => s.networkConfig.updateEnableKcpProxy(v)}
      />
      <SwitchListTile
        title={t('bind_device')}
        subtitle={t('bind_device_desc')}
        checked={s.networkConfigState.bindDevice}
        onchange={(v) => s.networkConfig.updateBindDevice(v)}
      />
      <SwitchListTile
        title={t('tun_device')}
        subtitle={t('tun_device_desc')}
        checked={s.networkConfigState.noTun}
        onchange={(v) => s.networkConfig.updateNoTun(v)}
      />
      <SwitchListTile
        title={t('enable_socks5')}
        subtitle={t('enable_socks5_desc')}
        checked={s.networkConfigState.enableSocks5}
        onchange={(v) => s.networkConfig.updateEnableSocks5(v)}
      />
      {#if s.networkConfigState.enableSocks5}
        <ListTile title={t('socks5_port')} subtitle={t('socks5_port_desc')}>
          {#snippet trailing()}
            <div class="port-field">
              <TextField
                bind:value={s.networkConfigState.socks5Port}
                align="end"
                inputmode="numeric"
                oninput={(v) => {
                  const n = parseInt(v)
                  if (!Number.isNaN(n)) s.networkConfig.updateSocks5Port(n)
                }}
              />
            </div>
          {/snippet}
        </ListTile>
        <ListTile>
          <div class="socks5-hint">{t('socks5_address_hint', { port: String(s.networkConfigState.socks5Port) })}</div>
        </ListTile>
      {/if}
    </SettingsCard>

    <!-- 卡片C: 跃点 -->
    <SettingsCard>
      <SwitchListTile
        title={t('auto_set_hop')}
        subtitle={t('auto_set_hop_desc')}
        checked={s.networkConfigState.autoSetMTU}
        onchange={(v) => s.networkConfig.setAutoSetMTU(v)}
      />
      <Divider height={1} />
      <ListTile
        leadingIcon="list"
        title={t('view_hop_list')}
        trailingIcon="chevron_right"
        onclick={viewHops}
      />
    </SettingsCard>
  </div>
</BaseSettingsPage>

<!-- 网卡跃点列表 -->
<Dialog bind:open={hopListOpen} radius={28}>
  <div class="dlg-title headline-small">{t('network_adapter_hop_list')}</div>
  <div class="dlg-content">
    <div class="hop-scroll">
      {#each hopList as [name, metric] (name)}
        <div class="hop-line">{name}： {metric}</div>
      {/each}
    </div>
  </div>
  <div class="dlg-actions">
    <Button variant="text" onclick={() => (hopListOpen = false)}>{t('close')}</Button>
  </div>
</Dialog>

<style>
  .page {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .dd-plain {
    background: color-mix(in srgb, var(--md-sys-color-surface-container-highest) 30%, transparent);
    border-radius: 8px;
  }
  .port-field {
    width: 100px;
  }
  .socks5-hint {
    color: var(--md-sys-color-primary);
    font-weight: 500;
    font-size: 14px;
  }
  .dlg-title {
    padding: 24px 24px 16px;
  }
  .dlg-content {
    padding: 0 24px;
  }
  .hop-scroll {
    max-height: 40vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }
  .hop-line {
    padding: 4px 0;
    font-size: 14px;
  }
  .dlg-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 24px;
  }
</style>
