<script lang="ts">
  // SettingsMainPage — 对应 settings_main_page.dart: 设置分类入口列表
  import Card from '../../lib/ui/Card.svelte'
  import Icon from '../../lib/ui/Icon.svelte'
  import { router } from '../../lib/core/router.svelte'
  import { t } from '../../lib/i18n/index.svelte'
  import { Platform } from '../../lib/platform'

  const entries = $derived.by(() => {
    const network: {
      icon: string
      title: string
      subtitle: string
      go: () => void
    }[] = [
      {
        icon: 'list_alt',
        title: t('listen_list'),
        subtitle: '管理网络监听地址',
        go: () => router.push('listenList'),
      },
    ]
    if (Platform.isAndroid) {
      network.push({
        icon: 'vpn_lock',
        title: t('custom_vpn_segment'),
        subtitle: '配置VPN网段',
        go: () => router.push('vpnSegment'),
      })
    }
    network.push({
      icon: 'network_wifi',
      title: '高级网络设置',
      subtitle: '协议、加密等高级选项',
      go: () => router.push('networkSettings'),
    })

    const general: typeof network = []
    if (!Platform.isAndroid) {
      general.push({
        icon: 'launch',
        title: t('startup_related'),
        subtitle: '开机启动和自动连接',
        go: () => router.push('startup'),
      })
    }
    general.push(
      {
        icon: 'info',
        title: t('software_settings'),
        subtitle: '权限和界面设置',
        go: () => router.push('softwareSettings'),
      },
      {
        icon: 'system_update',
        title: t('update_settings'),
        subtitle: '自动更新和下载设置',
        go: () => router.push('updateSettings'),
      },
      {
        icon: 'article_outlined',
        title: '日志',
        subtitle: '查看应用运行日志',
        go: () => router.push('logs'),
      },
    )
    return { network, general }
  })
</script>

<div class="settings-main">
  <div class="scroll">
    <div class="section-header">{t('network_settings')}</div>
    {#each entries.network as e (e.title)}
      <Card radius={12} margin="0 0 8px 0" onclick={e.go}>
        <div class="entry">
          <Icon name={e.icon} size={24} color="var(--md-sys-color-primary)" />
          <div class="entry-text">
            <div class="entry-title">{e.title}</div>
            <div class="entry-sub">{e.subtitle}</div>
          </div>
          <Icon name="chevron_right" size={24} color="var(--md-sys-color-on-surface-variant)" />
        </div>
      </Card>
    {/each}

    <div class="h24"></div>

    <div class="section-header">通用设置</div>
    {#each entries.general as e (e.title)}
      <Card radius={12} margin="0 0 8px 0" onclick={e.go}>
        <div class="entry">
          <Icon name={e.icon} size={24} color="var(--md-sys-color-primary)" />
          <div class="entry-text">
            <div class="entry-title">{e.title}</div>
            <div class="entry-sub">{e.subtitle}</div>
          </div>
          <Icon name="chevron_right" size={24} color="var(--md-sys-color-on-surface-variant)" />
        </div>
      </Card>
    {/each}
  </div>
</div>

<style>
  .settings-main {
    height: 100%;
  }
  .scroll {
    height: 100%;
    overflow-y: auto;
    padding: 16px;
  }
  .section-header {
    padding: 0 16px 8px;
    font-size: 16px;
    font-weight: 600;
    color: var(--md-sys-color-primary);
  }
  .h24 {
    height: 24px;
  }
  .entry {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 4px 16px;
    min-height: 72px;
    cursor: pointer;
  }
  .entry-text {
    flex: 1;
    min-width: 0;
  }
  .entry-title {
    font-size: 16px;
    line-height: 24px;
  }
  .entry-sub {
    font-size: 14px;
    line-height: 20px;
    color: var(--md-sys-color-on-surface-variant);
  }
</style>
