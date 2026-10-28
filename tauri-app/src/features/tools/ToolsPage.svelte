<script lang="ts">
  // ToolsPage — 对应 tools_page.dart: 工具列表 (魔法墙[Win]/端口白名单/NAT测试)
  import Card from '../../lib/ui/Card.svelte'
  import Icon from '../../lib/ui/Icon.svelte'
  import { router } from '../../lib/core/router.svelte'
  import { Platform } from '../../lib/platform'

  const tools = $derived([
    ...(Platform.isWindows
      ? [
          {
            title: '魔法墙',
            desc: '高级防火墙管理',
            icon: 'security',
            go: () => router.push('magicWall'),
          },
        ]
      : []),
    {
      title: '端口白名单',
      desc: '配置TCP/UDP端口访问白名单',
      icon: 'security_outlined',
      go: () => router.push('portWhitelist'),
    },
    {
      title: 'NAT 类型测试',
      desc: '检测您的网络 NAT 类型',
      icon: 'network_check',
      go: () => router.push('natTest'),
    },
  ])
</script>

<div class="tools-page">
  <div class="scroll">
    <div class="section-title">联机工具</div>
    <div class="h12"></div>
    {#each tools as tool (tool.title)}
      <Card radius={12} margin="none" onclick={tool.go}>
        <div class="tool-item">
          <Icon name={tool.icon} size={24} color="var(--md-sys-color-primary)" />
          <div class="tool-text">
            <div class="tool-title">{tool.title}</div>
            <div class="tool-desc">{tool.desc}</div>
          </div>
          <Icon name="chevron_right" size={24} color="var(--md-sys-color-on-surface-variant)" />
        </div>
      </Card>
      <div class="h8"></div>
    {/each}
    <div class="h32"></div>
  </div>
</div>

<style>
  .tools-page {
    height: 100%;
  }
  .scroll {
    height: 100%;
    overflow-y: auto;
    padding: 16px;
  }
  .section-title {
    padding-left: 4px;
    padding-bottom: 8px;
    font-size: 16px;
    font-weight: 600;
  }
  .h8 {
    height: 8px;
  }
  .h12 {
    height: 12px;
  }
  .h32 {
    height: 32px;
  }
  .tool-item {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 12px 20px;
    cursor: pointer;
  }
  .tool-text {
    flex: 1;
    min-width: 0;
  }
  .tool-title {
    font-size: 16px;
    font-weight: 500;
  }
  .tool-desc {
    font-size: 12px;
    color: var(--md-sys-color-on-surface-variant);
  }
</style>
