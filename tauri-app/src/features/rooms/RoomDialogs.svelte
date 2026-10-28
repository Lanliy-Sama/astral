<script lang="ts">
  // RoomDialogs — 房间模块全部对话框宿主 (add/edit/paste/reorder/share/网络配置确认)
  import Dialog from '../../lib/ui/Dialog.svelte'
  import Button from '../../lib/ui/Button.svelte'
  import TextField from '../../lib/ui/TextField.svelte'
  import SwitchListTile from '../../lib/ui/SwitchListTile.svelte'
  import Divider from '../../lib/ui/Divider.svelte'
  import Icon from '../../lib/ui/Icon.svelte'
  import Checkbox from '../../lib/ui/Checkbox.svelte'
  import ExpansionTile from '../../lib/ui/ExpansionTile.svelte'
  import BottomSheet from '../../lib/ui/BottomSheet.svelte'
  import { services } from '../../lib/core/services/services.svelte'
  import { roomDialogs } from './roomDialogs.svelte.ts'
  import { randomName } from '../../lib/utils/randomName'
  import { v4 as uuidv4 } from 'uuid'
  import { importRoom, importFromClipboard, finishImport, applyNetworkConfig } from './roomImport'
  import { generateShareLink, netConfigFromCurrent } from '../../lib/utils/shareCodec'
  import { expandServerUrls } from '../../lib/core/services/connection.svelte'
  import { snackbar } from '../../lib/ui/snackbar.svelte.ts'
  import { M2 } from '../../lib/utils/uiHelpers'
  import { userPageSheets } from './userPageSheets.svelte.ts'

  const s = services()

  // ---------- 添加房间 ----------
  let addName = $state('')
  let addEncrypted = $state(true)
  let addRoomName = $state('')
  let addPassword = $state('')

  $effect(() => {
    if (roomDialogs.addOpen) {
      addName = randomName()
      addEncrypted = true
      addRoomName = ''
      addPassword = ''
    }
  })

  async function confirmAdd() {
    roomDialogs.addOpen = false
    await s.room.addRoom({
      id: 0,
      name: addName || randomName(),
      encrypted: addEncrypted,
      roomName: addEncrypted ? uuidv4() : addRoomName,
      password: addEncrypted ? uuidv4() : addPassword,
      messageKey: addEncrypted ? uuidv4() : '',
      tags: [],
      sortOrder: 0,
      servers: [],
      customParam: '',
      networkConfigJson: '',
    })
  }

  // ---------- 编辑房间 ----------
  let editName = $state('')
  let editRoomName = $state('')
  let editPassword = $state('')
  let cannotEdit = $state(false)

  $effect(() => {
    if (roomDialogs.editOpen && roomDialogs.editRoom) {
      editName = roomDialogs.editRoom.name
      editRoomName = roomDialogs.editRoom.roomName
      editPassword = roomDialogs.editRoom.password
      cannotEdit = !!roomDialogs.editRoom.customParam
    }
  })

  async function confirmEdit() {
    const room = roomDialogs.editRoom
    if (!room) return
    roomDialogs.editOpen = false
    if (cannotEdit) return
    const updated = {
      ...room,
      name: editName,
      roomName: room.encrypted ? room.roomName : editRoomName,
      password: room.encrypted ? room.password : editPassword,
    }
    await s.room.updateRoom(updated)
  }

  // ---------- 粘贴导入 ----------
  let pasteCode = $state('')
  $effect(() => {
    if (roomDialogs.pasteOpen) pasteCode = ''
  })

  // ---------- 房间排序 ----------
  let reorderList = $state<import('../../core/models/types').Room[]>([])
  let dragIndex = $state<number | null>(null)
  $effect(() => {
    if (roomDialogs.reorderOpen) {
      reorderList = [...s.roomState.rooms]
    }
  })

  function onDrop(target: number) {
    if (dragIndex === null || dragIndex === target) return
    const list = [...reorderList]
    const [moved] = list.splice(dragIndex, 1)
    list.splice(target, 0, moved)
    reorderList = list
    dragIndex = null
  }

  async function confirmReorder() {
    roomDialogs.reorderOpen = false
    await s.room.reorderRooms(reorderList)
  }

  // ---------- 分享 ----------
  let selectedServers = $state<Set<string>>(new Set())
  let netOptions = $state<Record<string, boolean>>({})
  const NET_KEYS: [string, string][] = [
    ['dhcp', 'DHCP'],
    ['defaultProtocol', '默认协议'],
    ['enableEncryption', '加密'],
    ['latencyFirst', '延迟优先'],
    ['disableP2p', '禁用P2P'],
    ['disableUdpHolePunching', '禁用UDP打洞'],
    ['disableTcpHolePunching', '禁用TCP打洞'],
    ['disableSymHolePunching', '禁用对称打洞'],
    ['dataCompressAlgo', '数据压缩'],
    ['enableKcpProxy', 'KCP代理'],
    ['bindDevice', '绑定设备'],
    ['noTun', '禁用TUN'],
  ]

  let serverUrls = $derived.by(() => {
    const list: string[] = []
    for (const sv of s.serverState.servers.filter((x) => x.enable)) {
      list.push(...expandServerUrls(sv))
    }
    return list
  })

  $effect(() => {
    if (roomDialogs.shareOpen) {
      selectedServers = new Set()
      netOptions = {}
    }
  })

  let selectedCount = $derived(selectedServers.size)
  let netCount = $derived(Object.values(netOptions).filter(Boolean).length)
  let hasNewParam = $derived(selectedCount > 0 || netCount > 0)

  let roomToShare = $derived.by(() => {
    const room = roomDialogs.shareRoom
    if (!room) return null
    const servers = [...selectedServers]
    const hasNet = netCount > 0
    const net = hasNet
      ? JSON.stringify(netConfigFromCurrent(netOptions, s.networkConfigState))
      : ''
    return {
      ...room,
      servers,
      customParam: servers.length > 0 ? String(Date.now()) : room.customParam,
      networkConfigJson: net,
    }
  })

  function copyShareLink() {
    if (!roomToShare) return
    const link = generateShareLink(roomToShare)
    navigator.clipboard?.writeText(link).catch(() => {})
    snackbar.show({ title: '复制成功', message: '房间链接已复制到剪贴板', type: 'success' })
  }

  // ---------- 网络配置确认 ----------
  let applyConfigChecked = $state(true)
  $effect(() => {
    if (roomDialogs.netConfigConfirm) applyConfigChecked = true
  })

  // ---------- 房间设置 sheet ----------
  let isDesktopSheet = $derived(window.innerWidth > 600)

  function segOptions() {
    return [
      { key: 'style', title: '显示模式', options: [
        { v: 'simple' as const, label: '简约' },
        { v: 'detailed' as const, label: '详细' },
        { v: 'list' as const, label: '列表' },
      ] },
      { key: 'display', title: '用户显示', options: [
        { v: 'all' as const, label: '默认' },
        { v: 'users' as const, label: '用户' },
        { v: 'servers' as const, label: '服务器' },
      ] },
      { key: 'sort', title: '用户排序', options: [
        { v: 'none' as const, label: '默认' },
        { v: 'latency' as const, label: '延迟' },
        { v: 'nameLength' as const, label: '用户名' },
      ] },
      { key: 'order', title: '排序方式', options: [
        { v: 'ascending' as const, label: '升序' },
        { v: 'descending' as const, label: '降序' },
      ] },
    ]
  }

  function currentValue(groupKey: string): string {
    switch (groupKey) {
      case 'style':
        return s.displayState.userListStyle
      case 'display':
        return s.displayState.displayMode
      case 'sort':
        return s.displayState.sortOption
      case 'order':
        return s.displayState.sortOrder
      default:
        return ''
    }
  }

  function chooseOption(groupKey: string, v: string) {
    switch (groupKey) {
      case 'style':
        s.appSettings.setUserListStyle(v as any)
        break
      case 'display':
        s.appSettings.setDisplayMode(v as any)
        break
      case 'sort':
        s.appSettings.setSortOption(v as any)
        break
      case 'order':
        s.appSettings.setSortOrder(v as any)
        break
    }
  }
</script>

<!-- 添加房间 -->
<Dialog bind:open={roomDialogs.addOpen} radius={28}>
  <div class="dlg-title headline-small">添加房间</div>
  <div class="dlg-content">
    <TextField bind:value={addName} label="房间名称" />
    <div class="h8"></div>
    <SwitchListTile
      title="是否保护"
      bind:checked={addEncrypted}
      onchange={(v) => (addEncrypted = v)}
    />
    {#if !addEncrypted}
      <TextField bind:value={addRoomName} label="房间号" oninput={(v) => (addRoomName = v)} />
      <div class="h8"></div>
      <TextField bind:value={addPassword} label="房间密码" />
    {/if}
  </div>
  <div class="dlg-actions">
    <Button variant="text" onclick={() => (roomDialogs.addOpen = false)}>取消</Button>
    <Button variant="text" onclick={confirmAdd}>确定</Button>
  </div>
</Dialog>

<!-- 编辑房间 -->
<Dialog bind:open={roomDialogs.editOpen} radius={28}>
  {#if cannotEdit}
    <div class="dlg-title headline-small">无法编辑房间</div>
    <div class="dlg-content col-center">
      <Icon name="lock" size={48} color="var(--md-sys-color-primary)" />
      <div class="h16"></div>
      <div class="bold">此房间含有自定义参数</div>
      <div class="h8"></div>
      <div class="center-text body-medium">
        含有自定义参数的房间不可编辑，只能删除。如需修改，请删除此房间并重新创建或导入。
      </div>
    </div>
    <div class="dlg-actions">
      <Button variant="filled" onclick={() => (roomDialogs.editOpen = false)}>我知道了</Button>
    </div>
  {:else}
    <div class="dlg-title headline-small">编辑房间</div>
    <div class="dlg-content">
      <TextField bind:value={editName} label="房间名称" />
      <div class="h8"></div>
      <div class="static-tile">
        <div class="t">房间类型</div>
        <div class="st">{roomDialogs.editRoom?.encrypted ? '加密房间' : '普通房间'}</div>
      </div>
      {#if roomDialogs.editRoom && !roomDialogs.editRoom.encrypted}
        <TextField bind:value={editRoomName} label="房间号" />
        <div class="h8"></div>
        <TextField bind:value={editPassword} label="房间密码" />
      {/if}
    </div>
    <div class="dlg-actions">
      <Button variant="text" onclick={() => (roomDialogs.editOpen = false)}>取消</Button>
      <Button variant="text" onclick={confirmEdit}>确定</Button>
    </div>
  {/if}
</Dialog>

<!-- 粘贴导入 -->
<Dialog bind:open={roomDialogs.pasteOpen} radius={28}>
  <div class="dlg-title headline-small">导入房间</div>
  <div class="dlg-content">
    <TextField bind:value={pasteCode} textarea rows={3} hint="请输入分享码或链接" />
    <div class="h16"></div>
    <Button
      variant="outlined"
      icon="content_paste"
      fullwidth
      onclick={() => {
        roomDialogs.pasteOpen = false
        importFromClipboard()
      }}
    >
      从剪贴板导入
    </Button>
  </div>
  <div class="dlg-actions">
    <Button variant="text" onclick={() => (roomDialogs.pasteOpen = false)}>取消</Button>
    <Button
      variant="text"
      disabled={!pasteCode.trim()}
      onclick={() => {
        roomDialogs.pasteOpen = false
        importRoom(pasteCode)
      }}
    >
      导入
    </Button>
  </div>
</Dialog>

<!-- 房间排序 -->
{#if isDesktopSheet}
  <Dialog bind:open={roomDialogs.reorderOpen} radius={28} width={400} maxWidth={400}>
    {@render reorderContent()}
  </Dialog>
{:else}
  <BottomSheet bind:open={roomDialogs.reorderOpen} maxHeight="90vh">
    {@render reorderContent()}
  </BottomSheet>
{/if}

{#snippet reorderContent()}
  <div class="sheet-head">
    <Icon name="sort" size={24} color="var(--md-sys-color-primary)" />
    <span class="gap8"></span>
    <span class="sheet-title" style="font-size:18px">房间排序</span>
    <div class="h4"></div>
    <div class="sheet-sub">拖拽房间卡片来调整显示顺序</div>
  </div>
  <div class="sheet-body">
    {#each reorderList as room, index (room.id)}
      <div
        class="reorder-item"
        class:dragging={dragIndex === index}
        draggable="true"
        ondragstart={() => (dragIndex = index)}
        ondragover={(e) => e.preventDefault()}
        ondrop={() => onDrop(index)}
      >
        <div class="ri-inner">
          <div class="ri-text">
            <div class="ri-name">{room.name}</div>
            <div class="ri-sub">{room.encrypted ? '加密房间' : '开放房间'}</div>
          </div>
          <Icon name="drag_indicator" size={24} color="var(--md-sys-color-outline)" />
        </div>
      </div>
    {/each}
  </div>
  <div class="sheet-actions">
    <Button variant="outlined" fullwidth padding="16px 0" radius={12} onclick={() => (roomDialogs.reorderOpen = false)}
      >取消</Button
    >
    <span class="w16"></span>
    <Button variant="filled" fullwidth padding="16px 0" radius={12} onclick={confirmReorder}
      >确认</Button
    >
  </div>
{/snippet}

<!-- 分享房间 -->
<Dialog bind:open={roomDialogs.shareOpen} radius={28}>
  <div class="share-head">
    <div class="share-icon">
      <Icon name="share" size={24} color="var(--md-sys-color-on-primary-container)" />
    </div>
    <span class="gap12"></span>
    <div class="share-titles">
      <div class="headline-small" style="font-weight: 600">分享房间</div>
      <div class="share-roomname body-small ellipsis">{roomDialogs.shareRoom?.name}</div>
    </div>
  </div>
  <Divider height={1} />
  <div class="share-body">
    <!-- 房间基本信息 -->
    <div class="info-card">
      <div class="ic-head">
        <Icon name="info_outline" size={18} color="var(--md-sys-color-primary)" />
        <span class="gap8"></span>
        <span class="ic-title">房间基本信息</span>
      </div>
      <div class="h12"></div>
      <div class="ic-row">
        <Icon name="sell" size={16} color="var(--md-sys-color-on-surface-variant)" />
        <span class="gap8"></span>
        <div class="ic-fields">
          <div class="ic-label">房间名称</div>
          <div class="h4"></div>
          <div class="ic-value ellipsis">{roomDialogs.shareRoom?.name}</div>
        </div>
      </div>
    </div>
    <div class="h24"></div>

    {#if serverUrls.length > 0 || true}
      <ExpansionTile radius={12} borderColor="var(--md-sys-color-outline-variant)">
        {#snippet titleSnippet()}
          <div class="exp-title-row">
            <Icon name="tune_outlined" size={20} color="var(--md-sys-color-secondary)" />
            <span class="gap8"></span>
            <span class="label-large" style="color: var(--md-sys-color-secondary); font-weight: 600"
              >高级选项</span
            >
          </div>
        {/snippet}
        <div class="exp-content">
          {#if serverUrls.length > 0}
            <div class="exp-section-title">🔗 服务器列表</div>
            <div class="h8"></div>
            <div class="check-container">
              {#each serverUrls as url (url)}
                <div class="check-row" onclick={() => {
                  const set = new Set(selectedServers)
                  if (set.has(url)) set.delete(url)
                  else set.add(url)
                  selectedServers = set
                }}>
                  <Checkbox checked={selectedServers.has(url)} />
                  <span class="gap4"></span>
                  <span class="check-label mono ellipsis">{url}</span>
                </div>
              {/each}
            </div>
            <div class="h16"></div>
          {/if}
          <div class="exp-section-title">⚙️ 网络配置</div>
          <div class="h8"></div>
          <div class="check-container">
            {#each NET_KEYS as [key, label], i (key)}
              {#if i > 0}<div class="check-divider"></div>{/if}
              <div class="check-row" onclick={() => (netOptions = { ...netOptions, [key]: !netOptions[key] })}>
                <Checkbox checked={!!netOptions[key]} />
                <span class="gap4"></span>
                <span class="check-label2">{label}</span>
              </div>
            {/each}
          </div>
        </div>
      </ExpansionTile>
    {/if}

    {#if serverUrls.length > 0 || netCount > 0}
      <div class="h16"></div>
      <div class="summary-card">
        <Icon name="check_circle_outline" size={18} color="var(--md-sys-color-secondary)" />
        <span class="gap8"></span>
        <span class="summary-text body-small">
          {#if selectedCount > 0 && netCount > 0}
            将分享 {selectedCount} 个服务器 + {netCount} 项配置
          {:else if selectedCount > 0}
            将分享 {selectedCount} 个服务器
          {:else}
            将分享 {netCount} 项配置
          {/if}
        </span>
      </div>
    {/if}
  </div>
  <Divider height={1} />
  <div class="share-actions">
    <Button variant="text" onclick={() => (roomDialogs.shareOpen = false)}>取消</Button>
    <span class="gap8"></span>
    <Button
      variant="filled"
      icon="content_copy"
      onclick={() => {
        roomDialogs.shareOpen = false
        copyShareLink()
      }}
    >
      复制链接
    </Button>
  </div>
</Dialog>

<!-- 导入时网络配置确认 -->
<Dialog bind:open={roomDialogs.netConfirmOpen} radius={28} barrierDismissible={false}>
  <div class="dlg-title row-title">
    <Icon name="settings_suggest" color="var(--md-sys-color-primary)" />
    <span class="gap8"></span>
    <span class="headline-small">检测到网络配置</span>
  </div>
  <div class="dlg-content">
    <div class="body-medium">该房间包含以下网络配置：</div>
    <div class="h12"></div>
    <div class="net-lines">
      {#each roomDialogs.netConfigConfirm?.lines ?? [] as line, i (i)}
        <div class="net-line body-small" style="margin-top: {i === 0 ? 0 : 2}px">{line}</div>
      {/each}
    </div>
    <div class="h16"></div>
    <div class="apply-tile" onclick={() => (applyConfigChecked = !applyConfigChecked)}>
      <Checkbox bind:checked={applyConfigChecked} />
      <span class="gap4"></span>
      <div>
        <div>应用网络配置</div>
        <div class="apply-sub">将上述配置应用到当前设备</div>
      </div>
    </div>
    <div class="h8"></div>
    <div class="body-small" style="color: var(--md-sys-color-outline)">提示：如果不应用，仅导入房间信息</div>
  </div>
  <div class="dlg-actions">
    <Button
      variant="text"
      onclick={() => {
        const room = roomDialogs.netConfigConfirm?.room
        roomDialogs.netConfigConfirm = null
        roomDialogs.netConfirmOpen = false
        if (room) finishImport(room, false)
      }}
      >取消</Button
    >
    <Button
      variant="elevated"
      onclick={() => {
        const payload = roomDialogs.netConfigConfirm
        roomDialogs.netConfigConfirm = null
        roomDialogs.netConfirmOpen = false
        if (payload) finishImport(payload.room, applyConfigChecked)
      }}
      >确定</Button
    >
  </div>
</Dialog>

<!-- 房间设置 (RoomSettingsSheet) -->
{#if isDesktopSheet}
  <Dialog bind:open={userPageSheets.settingsOpen} radius={28} width={400} maxWidth={400}>
    {@render settingsContent()}
  </Dialog>
{:else}
  <BottomSheet bind:open={userPageSheets.settingsOpen} maxHeight="60vh">
    {@render settingsContent()}
  </BottomSheet>
{/if}

{#snippet settingsContent()}
  <div class="sheet-head">
    <Icon name="bar_chart_outlined" size={20} color="var(--md-sys-color-primary)" />
    <span class="gap8"></span>
    <span class="sheet-title" style="font-size:16px; color: var(--md-sys-color-primary); font-weight: 500"
      >房间设置</span
    >
    <div class="h4"></div>
    <div class="sheet-sub">点击下方设置项进行配置，所有更改将实时生效</div>
  </div>
  <div class="sheet-body settings-body">
    {#each segOptions() as group (group.key)}
      <div class="settings-group-title">{group.title}</div>
      <div class="settings-options">
        {#each group.options as opt (opt.v)}
          <button
            class="opt-btn"
            class:selected={currentValue(group.key) === opt.v}
            onclick={() => chooseOption(group.key, opt.v)}
          >
            {opt.label}
          </button>
        {/each}
      </div>
    {/each}
  </div>
{/snippet}

<style>
  .dlg-title {
    padding: 24px 24px 16px;
  }
  .row-title {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .dlg-content {
    padding: 0 24px;
    display: flex;
    flex-direction: column;
  }
  .dlg-content.col-center {
    align-items: center;
  }
  .dlg-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 24px;
  }
  .h4 {
    height: 4px;
  }
  .h8 {
    height: 8px;
  }
  .h12 {
    height: 12px;
  }
  .h16 {
    height: 16px;
  }
  .h24 {
    height: 24px;
  }
  .w16 {
    width: 16px;
  }
  .gap4 {
    width: 4px;
    display: inline-block;
  }
  .gap8 {
    width: 8px;
    display: inline-block;
  }
  .gap12 {
    width: 12px;
    display: inline-block;
  }
  .bold {
    font-weight: 700;
  }
  .center-text {
    text-align: center;
  }
  .static-tile {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 16px;
  }
  .static-tile .t {
    font-size: 16px;
  }
  .static-tile .st {
    font-size: 14px;
    color: var(--md-sys-color-on-surface-variant);
  }
  /* 排序 sheet */
  .sheet-head {
    padding: 14px 24px 16px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }
  .sheet-title {
    color: var(--md-sys-color-primary);
    font-weight: 500;
  }
  .sheet-sub {
    font-size: 14px;
    color: var(--md-sys-color-on-surface-variant);
  }
  .sheet-body {
    flex: 1;
    overflow-y: auto;
    padding: 0 16px 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .reorder-item {
    border-radius: 16px;
    background: var(--md-sys-color-surface-container-highest);
    margin: 4px 0;
  }
  .reorder-item.dragging {
    opacity: 0.5;
  }
  .ri-inner {
    display: flex;
    align-items: center;
    padding: 4px 12px;
  }
  .ri-text {
    flex: 1;
    min-width: 0;
  }
  .ri-name {
    font-size: 16px;
  }
  .ri-sub {
    font-size: 14px;
    color: var(--md-sys-color-on-surface-variant);
  }
  .sheet-actions {
    display: flex;
    padding: 24px;
    gap: 16px;
  }
  /* 分享 */
  .share-head {
    display: flex;
    align-items: center;
    padding: 24px 24px 16px;
  }
  .share-icon {
    background: var(--md-sys-color-primary-container);
    border-radius: 12px;
    padding: 8px;
    display: flex;
  }
  .share-titles {
    flex: 1;
    min-width: 0;
  }
  .share-roomname {
    color: var(--md-sys-color-on-surface-variant);
  }
  .share-body {
    padding: 24px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    max-height: 50vh;
  }
  .info-card {
    background: color-mix(in srgb, var(--md-sys-color-surface-container-highest) 30%, transparent);
    border: 1px solid var(--md-sys-color-outline-variant);
    border-radius: 16px;
    padding: 16px;
  }
  .ic-head {
    display: flex;
    align-items: center;
  }
  .ic-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--md-sys-color-primary);
  }
  .ic-row {
    display: flex;
    align-items: center;
  }
  .ic-fields {
    flex: 1;
    min-width: 0;
  }
  .ic-label {
    font-size: 11px;
    color: var(--md-sys-color-on-surface-variant);
  }
  .ic-value {
    font-size: 14px;
    font-weight: 500;
  }
  .exp-title-row {
    display: flex;
    align-items: center;
  }
  .exp-content {
    padding: 12px 16px;
  }
  .exp-section-title {
    font-size: 12px;
    font-weight: 600;
  }
  .check-container {
    border: 1px solid var(--md-sys-color-outline-variant);
    border-radius: 8px;
    overflow: hidden;
  }
  .check-row {
    display: flex;
    align-items: center;
    padding: 4px 12px;
    min-height: 40px;
    cursor: pointer;
  }
  .check-row:hover {
    background: color-mix(in srgb, var(--md-sys-color-on-surface) 4%, transparent);
  }
  .check-divider {
    height: 1px;
    background: var(--md-sys-color-outline-variant);
  }
  .check-label {
    font-size: 12px;
    flex: 1;
    min-width: 0;
  }
  .check-label2 {
    font-size: 14px;
  }
  .summary-card {
    display: flex;
    align-items: center;
    background: color-mix(in srgb, var(--md-sys-color-secondary-container) 30%, transparent);
    border: 1px solid var(--md-sys-color-outline);
    border-radius: 12px;
    padding: 12px;
  }
  .summary-text {
    color: var(--md-sys-color-secondary);
  }
  .share-actions {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    padding: 16px;
  }
  /* 网络配置确认 */
  .net-lines {
    background: color-mix(in srgb, var(--md-sys-color-surface-container-highest) 50%, transparent);
    border: 1px solid color-mix(in srgb, var(--md-sys-color-outline) 30%, transparent);
    border-radius: 8px;
    padding: 12px;
  }
  .apply-tile {
    display: flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
  }
  .apply-sub {
    font-size: 12px;
    color: var(--md-sys-color-on-surface-variant);
  }
  /* 房间设置 */
  .settings-body {
    gap: 0;
    padding: 0 16px 16px;
  }
  .settings-group-title {
    padding: 16px 8px 8px;
    font-size: 14px;
    font-weight: 700;
    color: var(--md-sys-color-primary);
  }
  .settings-options {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .opt-btn {
    height: 32px;
    padding: 0 30px;
    border-radius: 5px;
    font-size: 13px;
    background: var(--md-sys-color-surface-container-highest);
    color: var(--md-sys-color-on-surface-variant);
    border: 1px solid var(--md-sys-color-outline);
  }
  .opt-btn.selected {
    background: var(--md-sys-color-primary);
    color: var(--md-sys-color-on-primary);
    border-color: var(--md-sys-color-primary);
  }
</style>
