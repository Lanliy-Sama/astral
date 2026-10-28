<script lang="ts">
  // AboutHome — 对应 about_home.dart: 软件版本/内核版本
  import { onMount } from 'svelte'
  import HomeBox from './HomeBox.svelte'
  import Icon from '../../lib/ui/Icon.svelte'
  import { services } from '../../lib/core/services/services.svelte'
  import { t } from '../../lib/i18n/index.svelte'
  import { APP_VERSION, fetchKernelVersion } from '../../lib/core/services/updateService'
  import { parsePlatform, formatVersionDisplay } from '../../lib/utils/uiHelpers'

  const s = services()

  let kernelVersion = $state('')

  onMount(async () => {
    kernelVersion = await fetchKernelVersion()
  })

  let versionText = $derived(formatVersionDisplay(APP_VERSION, s.updateState.latestVersion))
  let hasNew = $derived(
    !!s.updateState.latestVersion && s.updateState.latestVersion.replace(/^v/, '') !== APP_VERSION,
  )
  let platform = $derived(parsePlatform(kernelVersion))
  let kernelVer = $derived(kernelVersion.split('|')[0] ?? '')
</script>

<HomeBox>
  <div class="header">
    <Icon name="info_outline" size={22} color="var(--md-sys-color-primary)" />
    <span class="title">{t('about')}</span>
  </div>
  <div class="gap16"></div>

  <!-- 软件版本 -->
  <div class="line">
    <Icon name="smartphone" size={20} color="var(--md-sys-color-primary)" />
    <span class="label">{t('software_version')}: </span>
    <span class="value" style="color: var(--md-sys-color-secondary)">{versionText}</span>
    {#if hasNew}
      <Icon name="arrow_upward" size={16} color="var(--md-sys-color-primary)" />
    {/if}
  </div>
  <div class="gap4"></div>

  <!-- 内核版本 -->
  <div class="line">
    <Icon name={platform.icon} size={20} color="var(--md-sys-color-primary)" />
    <span class="label">{t('kernel_version')}: </span>
    <span class="value" style="color: var(--md-sys-color-secondary)">{kernelVer}</span>
    {#if platform.name}
      <span class="platform-badge">{platform.name}</span>
    {/if}
  </div>
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
  .gap16 {
    height: 16px;
  }
  .gap4 {
    height: 4px;
  }
  .line {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    align-self: stretch;
  }
  .label {
    font-weight: 700;
    font-size: 14px;
  }
  .value {
    font-size: 14px;
  }
  .platform-badge {
    background: var(--md-sys-color-primary-container);
    color: var(--md-sys-color-on-primary-container);
    font-size: 12px;
    font-weight: 500;
    padding: 2px 6px;
    border-radius: 4px;
  }
</style>
