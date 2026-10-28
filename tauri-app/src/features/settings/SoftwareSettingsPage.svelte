<script lang="ts">
  // SoftwareSettingsPage — 对应 software_settings_page.dart
  import BaseSettingsPage from './BaseSettingsPage.svelte'
  import SettingsCard from './SettingsCard.svelte'
  import SwitchListTile from '../../lib/ui/SwitchListTile.svelte'
  import ListTile from '../../lib/ui/ListTile.svelte'
  import Divider from '../../lib/ui/Divider.svelte'
  import SegmentedButton from '../../lib/ui/SegmentedButton.svelte'
  import Dropdown from '../../lib/ui/Dropdown.svelte'
  import Icon from '../../lib/ui/Icon.svelte'
  import { services } from '../../lib/core/services/services.svelte'
  import { t } from '../../lib/i18n/index.svelte'
  import { Platform } from '../../lib/platform'
  import { M2 } from '../../lib/utils/uiHelpers'

  const s = services()

  let isAndroid = Platform.isAndroid
  let installGranted = $state(false)
  let notificationGranted = $state(false)
</script>

<BaseSettingsPage title={t('software_settings')}>
  <div class="page">
    <SettingsCard>
      <ListTile
        leadingIcon="settings"
        title={t('software_settings')}
        subtitle={t('software_behavior_desc')}
      />
      <Divider height={1} />
      {#if isAndroid}
        <ListTile
          leadingIcon="install_mobile"
          title={t('get_install_permission')}
          subtitle={installGranted
            ? t('install_permission_granted')
            : t('install_permission_not_granted')}
          trailingIcon={installGranted ? 'check_circle' : 'warning'}
          trailingIconColor={installGranted ? M2.green : M2.orange}
          onclick={() => {
            installGranted = !installGranted
          }}
        />
      {/if}
      {#if !isAndroid}
        <SwitchListTile
          title={t('minimize')}
          subtitle={t('minimize_desc')}
          checked={s.windowState.closeMinimize}
          onchange={(v) => s.appSettings.updateCloseMinimize(v)}
        />
      {/if}
      <ListTile
        title={t('player_list_card')}
        subtitle={t('player_list_card_desc')}
      />
      <div class="seg-wrap">
        <SegmentedButton
          fullwidth
          bind:value={s.displayState.userListStyle}
          segments={[
            { value: 'simple', label: '简约' },
            { value: 'detailed', label: '详细' },
            { value: 'list', label: '列表' },
          ]}
          onselect={(v) => s.appSettings.setUserListStyle(v as any)}
        />
      </div>
      <SwitchListTile
        title="减少动画更新"
        subtitle="降低拓扑图与连线动画刷新频率，减少 GPU 占用"
        checked={s.appSettingsState.reduceAnimationUpdates}
        onchange={(v) => s.appSettings.updateReduceAnimationUpdates(v)}
      />
    </SettingsCard>

    <!-- 连接设置 -->
    <SettingsCard>
      <ListTile leadingIcon="sync" title="连接设置" subtitle="配置连接重试行为" />
      <Divider height={1} />
      <SwitchListTile
        title="连接失败自动重试"
        subtitle="连接失败时自动重新尝试连接"
        checked={s.appSettingsState.autoRetryOnFailure}
        onchange={(v) => s.appSettings.updateAutoRetryOnFailure(v)}
      />
      {#if s.appSettingsState.autoRetryOnFailure}
        <ListTile title="最大重试次数" subtitle={`当前设置为 ${s.appSettingsState.maxRetryCount} 次`}>
          {#snippet trailing()}
            <div class="dd-wrap">
              <Dropdown
                bind:value={s.appSettingsState.maxRetryCount}
                mode="plain"
                items={[1, 2, 3, 5, 10].map((n) => ({ value: n, label: `${n} 次` }))}
                onselect={(v) => s.appSettings.updateMaxRetryCount(v)}
              />
            </div>
          {/snippet}
        </ListTile>
      {/if}
    </SettingsCard>

    {#if isAndroid}
      <SettingsCard>
        <ListTile leadingIcon="android" title={t('android_settings')} subtitle={t('android_settings_desc')} />
        <Divider height={1} />
        <ListTile
          leadingIcon="notifications"
          title={t('get_notification_permission')}
          subtitle={notificationGranted
            ? t('notification_permission_granted')
            : t('notification_permission_not_granted')}
          trailingIcon={notificationGranted ? 'check_circle' : 'warning'}
          trailingIconColor={notificationGranted ? M2.green : M2.orange}
          onclick={() => (notificationGranted = !notificationGranted)}
        />
        <SwitchListTile
          title={t('enable_connection_notification')}
          subtitle={t('enable_connection_notification_desc')}
          checked={s.appSettingsState.enableConnectionNotification}
          onchange={(v) => s.appSettings.updateEnableConnectionNotification(v)}
        />
        <Divider height={1} />
        <ListTile
          leadingIcon="info_outline"
          title={t('permission_description')}
          subtitle={t('permission_description_desc')}
        />
      </SettingsCard>
    {/if}
  </div>
</BaseSettingsPage>

<style>
  .page {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .seg-wrap {
    padding: 0 16px 12px;
  }
  .dd-wrap {
    width: 100px;
  }
</style>
