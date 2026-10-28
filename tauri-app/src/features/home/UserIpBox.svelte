<script lang="ts">
  // UserIpBox — 对应 user_ip.dart: 用户信息卡 (用户名/房间选择/虚拟IP + DHCP开关)
  import HomeBox from './HomeBox.svelte'
  import Icon from '../../lib/ui/Icon.svelte'
  import TextField from '../../lib/ui/TextField.svelte'
  import Switch from '../../lib/ui/Switch.svelte'
  import { services } from '../../lib/core/services/services.svelte'
  import { t } from '../../lib/i18n/index.svelte'
  import { isValidIpv4WithMask } from '../../lib/utils/uiHelpers'
  import { roomSelectDialog } from './RoomSelectDialog.svelte.ts'

  const s = services()

  let state = $derived(s.connectionState.connectionState)

  let username = $derived(s.playerState.playerName)
  let virtualIp = $derived(s.networkConfigState.ipv4)
  let dhcp = $derived(s.networkConfigState.dhcp)
  let selectedRoom = $derived(s.roomState.selectedRoom)

  let ipError = $derived(!dhcp && virtualIp !== '' && !isValidIpv4WithMask(virtualIp))
</script>

<HomeBox>
  <div class="row header">
    <Icon name="person" size={22} color="var(--md-sys-color-primary)" />
    <span class="title">{t('user_info')}</span>
    <span class="spacer"></span>
    {#if state !== 'idle'}
      <span class="badge">{t('locked')}</span>
    {/if}
  </div>
  <div class="gap14"></div>

  <TextField
    bind:value={s.playerState.playerName}
    label={t('username')}
    hint={t('username_hint')}
    prefixIcon="person"
    disabled={state !== 'idle'}
    floatAlways
    oninput={(v) => s.appSettings.updatePlayerName(v)}
  />
  <div class="gap14"></div>

  <!-- 房间选择 (点击弹房间列表) -->
  <div
    class="room-select"
    class:disabled-look={state === 'connected'}
    onclick={() => {
      if (state !== 'connected') roomSelectDialog.openDialog()
    }}
    role="button"
    tabindex="0"
  >
    <div class="rs-inner" class:disabled={state !== 'idle'}>
      <div class="icon-slot">
        <Icon name="apartment" size={24} color="var(--md-sys-color-primary)" />
      </div>
      <div class="rs-text">
        <label class:disabled={state !== 'idle'}>{t('select_room')}</label>
        <div class="rs-value" class:disabled={state === 'connected'}>
          {selectedRoom?.name ?? t('select_room_hint')}
        </div>
      </div>
      <div class="icon-slot">
        <Icon name="menu" size={24} color="var(--md-sys-color-primary)" />
      </div>
    </div>
  </div>

  <div class="gap9"></div>

  <!-- 原版: SizedBox(height: 60, child: Row[TextField + 8 + Switch列]) -->
  <div class="row ip-row">
    <div class="flex">
      <TextField
        bind:value={s.networkConfigState.ipv4}
        label={t('virtual_network_ip')}
        hint={t('virtual_network_ip_hint')}
        prefixIcon="lan"
        disabled={!dhcp ? state !== 'idle' : true}
        floatAlways
        errorText={ipError ? t('invalid_ipv4_error') : undefined}
        oninput={(v) => s.networkConfig.updateIpv4(v)}
      />
    </div>
    <div class="dhcp-col">
      <Switch
        checked={dhcp}
        disabled={state !== 'idle'}
        onchange={(v) => s.networkConfig.updateDhcp(v)}
      />
      <div class="dhcp-label">{dhcp ? t('automatic') : t('manual')}</div>
    </div>
  </div>

  {#if dhcp}
    <div class="dhcp-notice">{t('auto_assign_ip_notice')}</div>
  {:else}
    <div class="gap12"></div>
  {/if}
</HomeBox>

<style>
  .row {
    display: flex;
    align-items: center;
    width: 100%;
    gap: 8px;
  }
  .header {
    width: 100%;
  }
  .title {
    font-size: 18px;
    font-weight: 400;
  }
  .badge {
    background: var(--md-sys-color-secondary-container);
    color: var(--md-sys-color-on-secondary-container);
    font-size: 12px;
    font-weight: 300;
    padding: 4px 8px;
    border-radius: 12px;
    white-space: nowrap;
  }
  .spacer {
    flex: 1;
  }
  .gap14 {
    height: 14px;
  }
  .gap9 {
    height: 9px;
  }
  .gap12 {
    height: 12px;
  }
  .ip-row {
    align-items: center;
    min-height: 60px;
  }
  .room-select {
    width: 100%;
    cursor: pointer;
  }
  .room-select .rs-inner {
    display: flex;
    align-items: center;
    min-height: 56px;
    border: 1px solid var(--md-sys-color-outline);
    border-radius: 4px;
  }
  .room-select .rs-inner.disabled {
    border: 1px solid color-mix(in srgb, var(--md-sys-color-on-surface) 12%, transparent);
    background: color-mix(in srgb, var(--md-sys-color-on-surface) 4%, transparent);
  }
  .icon-slot {
    width: 48px;
    padding: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    align-self: stretch;
    flex-shrink: 0;
  }
  .rs-text {
    flex: 1;
    min-width: 0;
    position: relative;
    /* 拉伸至整行高, 使绝对定位的标签贴住上边框 */
    align-self: stretch;
    padding: 0 12px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .rs-text label {
    font-size: 12px;
    line-height: 16px;
    color: var(--md-sys-color-on-surface-variant);
    padding: 0 4px;
    position: absolute;
    top: -9px;
    left: 12px;
    background: var(--md-sys-color-surface-container-low);
  }
  .rs-text label.disabled {
    color: color-mix(in srgb, var(--md-sys-color-on-surface) 60%, transparent);
  }
  .rs-value {
    font-size: 16px;
    line-height: 24px;
    padding: 2px 0 4px;
  }
  .rs-value.disabled {
    color: color-mix(in srgb, var(--md-sys-color-on-surface) 38%, transparent);
  }
  .ip-row {
    align-items: center;
  }
  .dhcp-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    padding-left: 8px;
    flex-shrink: 0;
  }
  .dhcp-label {
    font-size: 12px;
    line-height: 16px;
  }
  .dhcp-notice {
    font-size: 12px;
    line-height: 16px;
    padding-top: 8px;
    align-self: stretch;
  }
</style>
