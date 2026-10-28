<script lang="ts">
  // StartupPage — 对应 startup_page.dart (仅桌面)
  import BaseSettingsPage from './BaseSettingsPage.svelte'
  import SettingsCard from './SettingsCard.svelte'
  import SwitchListTile from '../../lib/ui/SwitchListTile.svelte'
  import ListTile from '../../lib/ui/ListTile.svelte'
  import Divider from '../../lib/ui/Divider.svelte'
  import Icon from '../../lib/ui/Icon.svelte'
  import { services } from '../../lib/core/services/services.svelte'
  import { t } from '../../lib/i18n/index.svelte'

  const s = services()
</script>

<BaseSettingsPage title={t('startup_related')}>
  <div class="page">
    <SettingsCard>
      <SwitchListTile
        title={t('startup_on_boot')}
        subtitle={t('startup_on_boot_desc')}
        checked={s.startupState.startup}
        onchange={(v) => s.appSettings.setStartup(v)}
      />
      <SwitchListTile
        title={t('startup_minimize')}
        subtitle={t('startup_minimize_desc')}
        checked={s.startupState.startupMinimize}
        onchange={(v) => s.appSettings.setStartupMinimize(v)}
      />
      <SwitchListTile
        title={t('startup_auto_connect')}
        subtitle={t('startup_auto_connect_desc')}
        checked={s.startupState.startupAutoConnect}
        onchange={(v) => s.appSettings.setStartupAutoConnect(v)}
      />
    </SettingsCard>

    <SettingsCard header={t('startup_description')}>
      <ListTile
        leadingIcon="power_settings_new"
        title={t('startup_on_boot_title')}
        subtitle={t('startup_on_boot_info')}
      />
      <Divider height={1} />
      <ListTile
        leadingIcon="minimize"
        title={t('startup_minimize_title')}
        subtitle={t('startup_minimize_info')}
      />
      <Divider height={1} />
      <ListTile
        leadingIcon="play_arrow"
        title={t('startup_auto_connect_title')}
        subtitle={t('startup_auto_connect_info')}
      />
    </SettingsCard>
  </div>
</BaseSettingsPage>

<style>
  .page {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
</style>
