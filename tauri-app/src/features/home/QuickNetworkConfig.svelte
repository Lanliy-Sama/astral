<script lang="ts">
  // QuickNetworkConfig — 对应 quick_network_config.dart: 强制中转/广播转发/防火墙开关行
  import HomeBox from './HomeBox.svelte'
  import Icon from '../../lib/ui/Icon.svelte'
  import Switch from '../../lib/ui/Switch.svelte'
  import { services } from '../../lib/core/services/services.svelte'
  import { t } from '../../lib/i18n/index.svelte'
  import { Platform } from '../../lib/platform'
  import { snackbar } from '../../lib/ui/snackbar.svelte.ts'

  const s = services()

  function toggleRow(config: {
    enabled: boolean
    toggle: (v: boolean) => Promise<void>
  }) {
    return (v: boolean) => config.toggle(v)
  }

  async function toggleFirewall(v: boolean) {
    try {
      await s.firewall.setFirewall(v)
    } catch {
      snackbar.show({ title: '错误', message: '设置防火墙失败', type: 'error' })
    }
  }
</script>

<HomeBox>
  <div class="header">
    <Icon name="tune" size={22} color="var(--md-sys-color-primary)" />
    <span class="title">快捷网络配置</span>
  </div>
  <div class="gap14"></div>

  <!-- 行1: 强制中转 (所有平台) -->
  <div class="cfg-row">
    <div class="icon-box" class:on={s.networkConfigState.disableP2p}>
      <Icon
        name="route"
        size={20}
        color={s.networkConfigState.disableP2p
          ? 'var(--md-sys-color-on-primary-container)'
          : 'var(--md-sys-color-on-surface-variant)'}
      />
    </div>
    <div class="cfg-text">
      <div class="cfg-title">强制中转</div>
      <div class="cfg-desc">禁用P2P直连，所有流量经服务器中转</div>
    </div>
    <Switch
      checked={s.networkConfigState.disableP2p}
      onchange={(v) => s.networkConfig.updateDisableP2p(v)}
    />
  </div>

  {#if Platform.isWindows}
    <div class="gap8"></div>
    <!-- 行2: 广播转发 -->
    <div class="cfg-row">
      <div class="icon-box" class:on={s.networkConfigState.enableUdpBroadcastRelay}>
        <Icon
          name="settings_input_antenna"
          size={20}
          color={s.networkConfigState.enableUdpBroadcastRelay
            ? 'var(--md-sys-color-on-primary-container)'
            : 'var(--md-sys-color-on-surface-variant)'}
        />
      </div>
      <div class="cfg-text">
        <div class="cfg-title">广播转发</div>
        <div class="cfg-desc">Windows：将局域网 UDP 广播转发到虚拟网（通常需管理员权限）</div>
      </div>
      <Switch
        checked={s.networkConfigState.enableUdpBroadcastRelay}
        onchange={(v) => s.networkConfig.updateEnableUdpBroadcastRelay(v)}
      />
    </div>

    <div class="gap8"></div>
    <!-- 行3: 防火墙 -->
    <div class="cfg-row">
      <div class="icon-box" class:on={s.firewallState.firewallStatus}>
        <Icon
          name="shield"
          size={20}
          color={s.firewallState.firewallStatus
            ? 'var(--md-sys-color-on-primary-container)'
            : 'var(--md-sys-color-on-surface-variant)'}
        />
      </div>
      <div class="cfg-text">
        <div class="cfg-title">{t('firewall')}</div>
        <div class="cfg-desc">
          {s.firewallState.firewallStatus ? t('firewall_enabled') : t('firewall_disabled')}
        </div>
      </div>
      <Switch checked={s.firewallState.firewallStatus} onchange={toggleFirewall} />
    </div>
  {/if}
</HomeBox>

<style>
  .header {
    display: flex;
    align-items: center;
    gap: 8px;
    align-self: stretch;
  }
  .title {
    font-size: 18px;
    font-weight: 400;
  }
  .gap14 {
    height: 14px;
  }
  .gap8 {
    height: 8px;
  }
  .cfg-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: color-mix(
      in srgb,
      var(--md-sys-color-surface-container-highest) 30%,
      transparent
    );
    border: 1px solid color-mix(in srgb, var(--md-sys-color-outline) 20%, transparent);
    border-radius: 8px;
    width: 100%;
  }
  .icon-box {
    padding: 8px;
    border-radius: 8px;
    background: var(--md-sys-color-surface-container-highest);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: background 0.15s ease;
  }
  .icon-box.on {
    background: var(--md-sys-color-primary-container);
  }
  .cfg-text {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .cfg-title {
    font-size: 15px;
    font-weight: 500;
    line-height: 20px;
  }
  .cfg-desc {
    font-size: 12px;
    line-height: 16px;
    color: color-mix(in srgb, var(--md-sys-color-on-surface) 60%, transparent);
  }
</style>
