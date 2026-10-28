<script lang="ts">
  // PortWhitelistPage — 对应 port_whitelist_page.dart (TCP/UDP 端口白名单)
  import BaseSettingsPage from './BaseSettingsPage.svelte'
  import SettingsCard from './SettingsCard.svelte'
  import ListTile from '../../lib/ui/ListTile.svelte'
  import IconButton from '../../lib/ui/IconButton.svelte'
  import Dialog from '../../lib/ui/Dialog.svelte'
  import Button from '../../lib/ui/Button.svelte'
  import TextField from '../../lib/ui/TextField.svelte'
  import { services } from '../../lib/core/services/services.svelte'
  import { M2 } from '../../lib/utils/uiHelpers'

  const s = services()

  let editType = $state<'TCP' | 'UDP' | null>(null)
  let editOpen = $state(false)
  let input = $state('')
  let confirmClear = $state<'TCP' | 'UDP' | null>(null)
  let clearOpen = $state(false)

  function openEdit(type: 'TCP' | 'UDP') {
    editType = type
    editOpen = true
    input = type === 'TCP' ? s.networkConfigState.tcpWhitelist : s.networkConfigState.udpWhitelist
  }

  async function save() {
    if (!editType) return
    const v = input.trim()
    if (editType === 'TCP') await s.networkConfig.updateTcpWhitelist(v)
    else await s.networkConfig.updateUdpWhitelist(v)
    editOpen = false
  }
</script>

<BaseSettingsPage title="端口白名单">
  <div class="page">
    <SettingsCard>
      <ListTile
        leadingIcon="info_outline"
        title="白名单说明"
      >
        <div class="desc">
          配置允许通过的TCP/UDP端口。<br />
          支持单个端口(80)和范围(8000-9000)。<br />
          多个端口用逗号分隔，如： 80,443,8000-9000
        </div>
      </ListTile>
    </SettingsCard>

    {#each ['TCP', 'UDP'] as type (type)}
      {@const value = type === 'TCP' ? s.networkConfigState.tcpWhitelist : s.networkConfigState.udpWhitelist}
      {@const icon = type === 'TCP' ? 'storage' : 'wifi'}
      <SettingsCard>
        <ListTile leadingIcon={icon} title={`${type} 端口白名单`}>
          {#snippet trailing()}
            <IconButton
              icon="edit"
              iconSize={24}
              size={40}
              padding={8}
              tip="编辑"
              onclick={() => openEdit(type as 'TCP' | 'UDP')}
            />
            {#if value}
              <IconButton
                icon="clear"
                iconSize={24}
                size={40}
                padding={8}
                tip="清空"
                onclick={() => {
              confirmClear = type as 'TCP' | 'UDP'
              clearOpen = true
            }}
              />
            {/if}
          {/snippet}
          <div class="whitelist" style={value ? 'color: var(--md-sys-color-primary)' : ''}>
            {value || '未设置'}
          </div>
        </ListTile>
      </SettingsCard>
    {/each}
  </div>
</BaseSettingsPage>

<!-- 编辑对话框 -->
<Dialog bind:open={editOpen} radius={28}>
  <div class="dlg-title headline-small">编辑 {editType} 端口白名单</div>
  <div class="dlg-content">
    <div class="bold">格式说明：</div>
    <div class="h8"></div>
    <div class="fmt">• 单个端口： 80</div>
    <div class="fmt">• 端口范围： 8000-9000</div>
    <div class="fmt">• 多个端口： 80,443,8000-9000</div>
    <div class="h16"></div>
    <TextField
      bind:value={input}
      autofocus
      textarea
      rows={3}
      label={`${editType} 端口`}
      hint="例如： 80,443,8000-9000"
      helperText="留空表示不限制"
    />
  </div>
  <div class="dlg-actions">
    <Button variant="text" onclick={() => (editOpen = false)}>取消</Button>
    <Button variant="text" onclick={save}>保存</Button>
  </div>
</Dialog>

<!-- 清空确认 -->
<Dialog bind:open={clearOpen} radius={28}>
  <div class="dlg-title headline-small">确认清空</div>
  <div class="dlg-content body-medium">
    确定要清空 {confirmClear} 端口白名单吗？<br />
    清空后将不限制端口访问。
  </div>
  <div class="dlg-actions">
    <Button variant="text" onclick={() => (clearOpen = false)}>取消</Button>
    <Button
      variant="text"
      fontColor={M2.red}
      onclick={async () => {
        if (confirmClear === 'TCP') await s.networkConfig.updateTcpWhitelist('')
        else if (confirmClear === 'UDP') await s.networkConfig.updateUdpWhitelist('')
        confirmClear = null
        clearOpen = false
      }}
    >
      清空
    </Button>
  </div>
</Dialog>

<style>
  .page {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .desc {
    font-size: 14px;
    color: var(--md-sys-color-on-surface-variant);
    white-space: pre-line;
    padding-top: 2px;
  }
  .whitelist {
    font-size: 14px;
    padding-top: 2px;
    word-break: break-all;
  }
  .bold {
    font-weight: 700;
  }
  .fmt {
    font-size: 14px;
    line-height: 20px;
  }
  .h8 {
    height: 8px;
  }
  .h16 {
    height: 16px;
  }
  .dlg-title {
    padding: 24px 24px 16px;
  }
  .dlg-content {
    padding: 0 24px;
  }
  .dlg-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 24px;
  }
</style>
