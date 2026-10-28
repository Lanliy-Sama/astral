<script lang="ts">
  // UpdateSettingsPage — 对应 update_settings_page.dart + 更新对话框链路
  import BaseSettingsPage from './BaseSettingsPage.svelte'
  import SettingsCard from './SettingsCard.svelte'
  import SwitchListTile from '../../lib/ui/SwitchListTile.svelte'
  import ListTile from '../../lib/ui/ListTile.svelte'
  import Divider from '../../lib/ui/Divider.svelte'
  import IconButton from '../../lib/ui/IconButton.svelte'
  import Icon from '../../lib/ui/Icon.svelte'
  import Dialog from '../../lib/ui/Dialog.svelte'
  import Button from '../../lib/ui/Button.svelte'
  import Progress from '../../lib/ui/Progress.svelte'
  import TextField from '../../lib/ui/TextField.svelte'
  import Checkbox from '../../lib/ui/Checkbox.svelte'
  import { services } from '../../lib/core/services/services.svelte'
  import { t } from '../../lib/i18n/index.svelte'
  import {
    UpdateChecker,
    APP_VERSION,
    GITHUB_MIRRORS,
    probeMirrors,
    resolveDownloadUrl,
    type UpdateCheckResult,
  } from '../../lib/core/services/updateService'
  import { router } from '../../lib/core/router.svelte'
  import { snackbar } from '../../lib/ui/snackbar.svelte.ts'

  const s = services()
  const checker = new UpdateChecker()

  // 检查更新状态
  let checking = $state(false)
  let result = $state<UpdateCheckResult | null>(null)
  let resultOpen = $state(false)

  // 版本信息对话框
  let versionInfoOpen = $state(false)

  // 下载加速编辑
  let accelOpen = $state(false)
  let accelMode = $state('auto')
  let accelManual = $state('')
  let probing = $state(false)
  let probeResult = $state('')

  $effect(() => {
    if (accelOpen) {
      accelMode = s.updateState.downloadAccelerate === '' ? 'off' : s.updateState.downloadAccelerate === 'auto' ? 'auto' : 'manual'
      accelManual = s.updateState.downloadAccelerate !== 'auto' && s.updateState.downloadAccelerate !== '' ? s.updateState.downloadAccelerate : ''
      probeResult = ''
    }
  })

  async function checkForUpdates(showUi = true) {
    if (checking) return
    checking = true
    result = await checker.checkForUpdates(APP_VERSION, s.updateState.beta)
    checking = false
    if (result.status === 'updateAvailable' || showUi) {
      resultOpen = true
    }
    if (result.status === 'updateAvailable') {
      s.appSettings.updateLatestVersion(result.version)
    }
  }

  async function runProbe() {
    if (probing) return
    probing = true
    probeResult = ''
    try {
      const mirror = await probeMirrors()
      probeResult = mirror
    } catch {
      probeResult = t('download_acceleration_probe_failed')
    }
    probing = false
  }

  function saveAccel() {
    let mode = accelMode
    if (accelMode === 'manual') {
      if (!accelManual.trim()) {
        accelManual = GITHUB_MIRRORS[0]
      }
      mode = accelManual.trim().endsWith('/') ? accelManual.trim() : accelManual.trim() + '/'
    }
    s.appSettings.setDownloadAccelerate(mode)
    accelOpen = false
  }

  let accelSubtitle = $derived.by(() => {
    const mode = s.updateState.downloadAccelerate
    if (mode === '' || mode === 'off') return t('download_acceleration_disabled')
    if (mode === 'auto') {
      return s.updateState.resolvedDownloadAccelerate
        ? t('download_acceleration_auto_current', { mirror: s.updateState.resolvedDownloadAccelerate })
        : t('download_acceleration_auto_pending')
    }
    return mode
  })

  async function downloadUpdate() {
    resultOpen = false
    // 打开 astral.fan 下载页 (桌面安装包由网盘分发)
    window.open('https://astral.fan/quick-start/download-install/', '_blank')
  }
</script>

<BaseSettingsPage title={t('update_settings')}>
  {#snippet actions()}
    <IconButton icon="refresh" size={40} padding={8} tip={t('check_update')} onclick={() => checkForUpdates(true)} />
  {/snippet}

  <div class="page">
    <!-- 更新设置 -->
    <SettingsCard>
      <ListTile leadingIcon="system_update" title={t('update_settings')} subtitle={t('update_behavior_desc')} />
      <Divider height={1} />
      <SwitchListTile
        title={t('join_beta')}
        subtitle={t('join_beta_desc')}
        checked={s.updateState.beta}
        onchange={(v) => s.appSettings.setBeta(v)}
      />
      {#if !s.updateState.beta}
        <SwitchListTile
          title={t('auto_update')}
          subtitle={t('auto_update_desc')}
          checked={s.updateState.autoCheckUpdate}
          onchange={(v) => s.appSettings.setAutoCheckUpdate(v)}
        />
      {/if}
      <Divider height={1} />
      <ListTile
        leadingIcon="bolt"
        title={t('download_acceleration')}
        subtitle={accelSubtitle}
        trailingIcon="chevron_right"
        onclick={() => (accelOpen = true)}
      />
    </SettingsCard>

    <!-- 更新操作 -->
    <SettingsCard>
      <ListTile leadingIcon="update" title={t('update_operations')} subtitle={t('update_operations_desc')} />
      <Divider height={1} />
      <ListTile
        leadingIcon="refresh"
        title={t('check_update')}
        subtitle={t('check_update_available')}
        trailingIcon="chevron_right"
        onclick={() => checkForUpdates(true)}
      />
      <ListTile
        leadingIcon="info_outline"
        title={t('version_info')}
        subtitle={t('version_info_desc')}
        trailingIcon="chevron_right"
        onclick={() => (versionInfoOpen = true)}
      />
      <ListTile
        leadingIcon="history"
        title={t('history_versions')}
        subtitle={t('history_versions_desc')}
        trailingIcon="chevron_right"
        onclick={() => router.push('historyVersions')}
      />
      <ListTile
        leadingIcon="cloud_download"
        title="重新下载"
        subtitle="如果出现问题可以尝试重新下载！"
        trailingIcon="chevron_right"
        onclick={downloadUpdate}
      />
    </SettingsCard>

    <!-- 更新说明 -->
    <SettingsCard>
      <ListTile leadingIcon="help_outline" title={t('update_description')} subtitle={t('update_description_desc')} />
      <Divider height={1} />
      <ListTile leadingIcon="science" title={t('beta_version')} subtitle={t('beta_version_desc')} />
      <ListTile leadingIcon="auto_awesome" title={t('auto_update_title')} subtitle={t('auto_update_info_desc')} />
    </SettingsCard>
  </div>
</BaseSettingsPage>

<!-- 检查更新忙碌对话框 -->
<Dialog bind:open={checking} radius={28} barrierDismissible={false}>
  <div class="dlg-title headline-small">{t('check_update')}</div>
  <div class="dlg-content">
    <Progress circular={false} height={4} />
    <div class="h16"></div>
    <div class="busy-text">正在从 GitHub 获取版本信息…</div>
  </div>
</Dialog>

<!-- 更新结果对话框 -->
<Dialog bind:open={resultOpen} radius={28} barrierDismissible={false}>
  <div class="dlg-title headline-small">
    {#if result?.status === 'updateAvailable'}
      发现新版本： {result?.version}
    {:else}
      {result?.version}
    {/if}
  </div>
  <div class="dlg-content">
    <div class="result-scroll">
      {#if result?.status === 'updateAvailable'}
        <div class="bold">更新内容：</div>
        <div class="h8"></div>
      {/if}
      <div class="body-medium notes">{result?.notes}</div>
    </div>
  </div>
  <div class="dlg-actions">
    <Button variant="text" onclick={() => (resultOpen = false)}>稍后再说</Button>
    {#if result?.status === 'updateAvailable'}
      <Button variant="text" onclick={downloadUpdate}>网盘下载</Button>
      <Button variant="elevated" onclick={downloadUpdate}>GitHub下载</Button>
    {:else}
      <Button variant="elevated" onclick={() => (resultOpen = false)}>确定</Button>
    {/if}
  </div>
</Dialog>

<!-- 版本信息 -->
<Dialog bind:open={versionInfoOpen} radius={28}>
  <div class="dlg-title headline-small">{t('version_info')}</div>
  <div class="dlg-content">
    <div>{t('current_version')}: {APP_VERSION}</div>
    <div class="h8"></div>
    <div>{t('update_channel')}: {s.updateState.beta ? 'Beta' : 'Stable'}</div>
  </div>
  <div class="dlg-actions">
    <Button variant="text" onclick={() => (versionInfoOpen = false)}>{t('close')}</Button>
  </div>
</Dialog>

<!-- 下载加速编辑 -->
<Dialog bind:open={accelOpen} radius={28}>
  <div class="dlg-title headline-small">{t('download_acceleration_title')}</div>
  <div class="dlg-content">
    <div class="body-medium">{t('download_acceleration_info_desc')}</div>
    <div class="h12"></div>
    <div class="radio-list">
      <div class="radio-item" onclick={() => (accelMode = 'auto')}>
        <Checkbox checked={accelMode === 'auto'} />
        <span class="gap4"></span>
        <div>
          <div>{t('download_acceleration_auto')}</div>
          <div class="mirror-list">
            {#each GITHUB_MIRRORS as m (m)}
              <div class="mirror">{m}</div>
            {/each}
          </div>
        </div>
      </div>
      <div class="radio-item" onclick={() => (accelMode = 'manual')}>
        <Checkbox checked={accelMode === 'manual'} />
        <span class="gap4"></span>
        <div class="flex">
          <div>{t('download_acceleration_manual')}</div>
          {#if accelMode === 'manual'}
            <div class="h8"></div>
            <TextField bind:value={accelManual} hint={t('download_acceleration_manual_hint')} />
          {/if}
        </div>
      </div>
      <div class="radio-item" onclick={() => (accelMode = 'off')}>
        <Checkbox checked={accelMode === 'off'} />
        <span class="gap4"></span>
        <div>{t('download_acceleration_disabled')}</div>
      </div>
    </div>
    {#if accelMode === 'auto'}
      <div class="h8"></div>
      <Button variant="outlined" onclick={runProbe}>
        {#if probing}
          <Progress circular size={16} strokeWidth={2} />
          <span class="gap8"></span>
          {t('download_acceleration_probing')}
        {:else}
          <Icon name="speed" size={18} />
          <span class="gap8"></span>
          {t('download_acceleration_reprobe')}
        {/if}
      </Button>
      {#if probeResult}
        <div class="h8"></div>
        <div class="probe-result">{probeResult}</div>
      {/if}
    {/if}
  </div>
  <div class="dlg-actions">
    <Button variant="text" onclick={() => (accelOpen = false)}>{t('cancel')}</Button>
    <Button variant="elevated" onclick={saveAccel}>{t('save')}</Button>
  </div>
</Dialog>

<style>
  .page {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .dlg-title {
    padding: 24px 24px 16px;
  }
  .dlg-content {
    padding: 0 24px;
    display: flex;
    flex-direction: column;
  }
  .dlg-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 24px;
    flex-wrap: wrap;
  }
  .busy-text {
    font-size: 14px;
    padding: 4px 0;
  }
  .result-scroll {
    max-height: 40vh;
    overflow-y: auto;
  }
  .notes {
    white-space: pre-wrap;
    word-break: break-word;
  }
  .bold {
    font-weight: 700;
  }
  .radio-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .radio-item {
    display: flex;
    align-items: flex-start;
    cursor: pointer;
  }
  .mirror-list {
    font-size: 12px;
    color: var(--md-sys-color-on-surface-variant);
    padding-top: 4px;
  }
  .probe-result {
    font-size: 13px;
    color: var(--md-sys-color-secondary);
  }
  .h8 {
    height: 8px;
  }
  .h12 {
    height: 12px;
  }
  .gap4 {
    width: 4px;
  }
  .gap8 {
    width: 8px;
  }
</style>
