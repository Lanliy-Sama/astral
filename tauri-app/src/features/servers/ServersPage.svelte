<script lang="ts">
  // ServersPage — 对应 server_page.dart: 可拖拽排序的服务器卡片列表 + 状态色条
  import { onMount, onDestroy } from 'svelte'
  import { services } from '../../lib/core/services/services.svelte'
  import Card from '../../lib/ui/Card.svelte'
  import Switch from '../../lib/ui/Switch.svelte'
  import IconButton from '../../lib/ui/IconButton.svelte'
  import Icon from '../../lib/ui/Icon.svelte'
  import Button from '../../lib/ui/Button.svelte'
  import Menu from '../../lib/ui/Menu.svelte'
  import Dialog from '../../lib/ui/Dialog.svelte'
  import { serverDialog } from './serverDialog.svelte.ts'
  import ServerDialog from './ServerDialog.svelte'
  import { isBlockedServer } from '../../lib/core/storage/storage'
  import { M2 } from '../../lib/utils/uiHelpers'
  import { checkServers } from '../../lib/core/services/services.svelte'
  import { snackbar } from '../../lib/ui/snackbar.svelte.ts'
  import type { ServerMod } from '../../lib/core/models/types'

  const s = services()

  // 30s 周期检测
  onMount(() => {
    s.serverStatusState.startPeriodicCheck(s.serverState.servers, 30000, (servers) =>
      checkServers(servers, s.serverStatusState.activeServerIds),
    )
  })
  onDestroy(() => s.serverStatusState.stopPeriodicCheck())

  function statusColor(id: number): string {
    const st = s.serverStatusState.serverStatuses[id] ?? 'unknown'
    switch (st) {
      case 'online':
        return M2.green
      case 'offline':
        return M2.red
      case 'inUse':
        return M2.blue
      default:
        return 'var(--md-sys-color-outline)'
    }
  }

  let menuOpenFor = $state<number | null>(null)
  let menuAnchor = $state<HTMLElement | null>(null)
  let deleteOpen = $state(false)
  let deleteTarget = $state<ServerMod | null>(null)

  function editServer(server: ServerMod) {
    if (isBlockedServer(server.url)) {
      snackbar.show({ title: '不可编辑', message: '此服务器不可编辑', type: 'info', duration: 2000 })
      return
    }
    serverDialog.edit(server)
  }

  // 拖拽排序
  let dragId = $state<number | null>(null)

  function onDrop(target: number) {
    if (dragId === null) return
    const list = [...s.serverState.servers]
    const from = list.findIndex((x) => x.id === dragId)
    const to = list.findIndex((x) => x.id === target)
    if (from < 0 || to < 0 || from === to) {
      dragId = null
      return
    }
    const [moved] = list.splice(from, 1)
    list.splice(to, 0, moved)
    s.server.reorderServers(list)
    dragId = null
  }
</script>

<div class="server-page">
  {#if s.serverState.servers.length === 0}
    <!-- 空状态 -->
    <div class="empty">
      <Icon name="dns_outlined" size={64} color="var(--md-sys-color-outline)" />
      <div class="gap16"></div>
      <div class="empty-title">暂无服务器</div>
      <div class="gap16"></div>
      <Button variant="elevated" icon="add" onclick={() => serverDialog.add()}>添加服务器</Button>
    </div>
  {:else}
    <div class="scroll">
      {#each s.serverState.servers as server (server.id)}
        <div
          class="server-card-wrap"
          draggable="true"
          ondragstart={() => (dragId = server.id)}
          ondragover={(e) => e.preventDefault()}
          ondrop={() => onDrop(server.id)}
        >
          <Card radius={12} margin="none">
            <div class="server-card">
              <div class="status-bar" style="background: {statusColor(server.id)}"></div>
              <div class="card-main">
                <div class="name">{server.name}</div>
                <div class="url ellipsis">
                  {isBlockedServer(server.url) ? '***' : server.url}
                </div>
              </div>
              <div class="trailing">
                <div class="switch-scale">
                  <Switch
                    checked={server.enable}
                    onchange={(v) => s.server.setServerEnable(server, v)}
                  />
                </div>
                <span class="gap4"></span>
                <IconButton
                  icon="more_vert"
                  iconSize={24}
                  size={40}
                  padding={8}
                  onclick={(e) => {
                    menuAnchor = e.currentTarget as HTMLElement
                    menuOpenFor = menuOpenFor === server.id ? null : server.id
                  }}
                />
              </div>
            </div>
          </Card>
          <div class="card-gap"></div>
        </div>
      {/each}
    </div>
  {/if}

  <!-- FAB -->
  <div class="fab-area">
    <button class="fab elevation-6" onclick={() => serverDialog.add()}>
      <Icon name="add" size={24} />
    </button>
  </div>
</div>

<!-- 卡片菜单 -->
<Menu
  open={menuOpenFor !== null}
  anchor={menuAnchor}
  items={[
    {
      value: 'edit',
      label: '编辑',
      icon: 'edit_outlined',
      iconSize: 18,
    },
    { value: 'delete', label: '删除', icon: 'delete_outline', iconSize: 18, color: M2.red },
  ]}
  onselect={async (v) => {
    const server = s.serverState.servers.find((x) => x.id === menuOpenFor)
    menuOpenFor = null
    if (!server) return
    if (v === 'edit') editServer(server)
    else if (v === 'delete') {
      deleteTarget = server
      deleteOpen = true
    }
  }}
/>

<!-- 删除确认 -->
<ServerDialog />

<Dialog bind:open={deleteOpen} radius={28}>
  <div class="dlg-title headline-small">删除服务器</div>
  <div class="dlg-content body-medium">
    确定要删除服务器 "{deleteTarget?.name}" 吗？此操作不可撤销。
  </div>
  <div class="dlg-actions">
    <Button variant="text" onclick={() => (deleteOpen = false)}>取消</Button>
    <Button
      variant="text"
      fontColor={M2.red}
      onclick={async () => {
        if (deleteTarget) await s.server.deleteServer(deleteTarget)
        deleteOpen = false
      }}
    >
      删除
    </Button>
  </div>
</Dialog>

<style>
  .server-page {
    height: 100%;
    position: relative;
  }
  .empty {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .empty-title {
    font-size: 16px;
    font-weight: 500;
    color: var(--md-sys-color-outline);
  }
  .gap16 {
    height: 16px;
  }
  .scroll {
    height: 100%;
    overflow-y: auto;
    padding: 12px;
  }
  .card-gap {
    height: 8px;
  }
  .server-card {
    display: flex;
    align-items: center;
    cursor: grab;
    /* 原版 ListTile 双行高度 72 */
    min-height: 72px;
  }
  .status-bar {
    width: 4px;
    height: 40px;
    border-radius: 2px;
    margin: 0 16px 0 16px;
    flex-shrink: 0;
  }
  .card-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .name {
    font-size: 16px;
    font-weight: 600;
  }
  .url {
    font-size: 14px;
    color: var(--md-sys-color-on-surface-variant);
  }
  .trailing {
    display: flex;
    align-items: center;
    /* 原版 ListTile 右侧 contentPadding 16 */
    padding-right: 16px;
  }
  .switch-scale {
    transform: scale(0.8);
  }
  .gap4 {
    width: 4px;
  }
  .fab-area {
    position: absolute;
    right: 16px;
    bottom: 16px;
    z-index: 10;
  }
  .fab {
    width: 56px;
    height: 56px;
    border-radius: 16px;
    background: var(--md-sys-color-primary-container);
    color: var(--md-sys-color-on-primary-container);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .fab:hover {
    box-shadow:
      0 5px 7px -1px rgba(0, 0, 0, 0.2),
      0 8px 12px rgba(0, 0, 0, 0.14);
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
