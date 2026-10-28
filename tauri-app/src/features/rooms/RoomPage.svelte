<script lang="ts">
  // RoomPage — 对应 room_page.dart (含顶部当前房间横幅 + FAB 组)
  import { services } from '../../lib/core/services/services.svelte'
  import RoomCard from './RoomCard.svelte'
  import UserPage from './UserPage.svelte'
  import RoomDialogs from './RoomDialogs.svelte'
  import Fab from '../../lib/ui/Fab.svelte'
  import Card from '../../lib/ui/Card.svelte'
  import { roomDialogs } from './roomDialogs.svelte.ts'
  import { snackbar } from '../../lib/ui/snackbar.svelte.ts'
  import { generateShareLink } from '../../lib/utils/shareCodec'

  const s = services()

  let columnCount = $state(getColumns())
  function getColumns(): number {
    const w = window.innerWidth
    if (w >= 1200) return 4
    if (w >= 900) return 3
    if (w >= 600) return 2
    return 1
  }

  let state = $derived(s.connectionState.connectionState)

  function stateText(): string {
    switch (state) {
      case 'connected':
        return '已连接'
      case 'connecting':
        return '连接中'
      default:
        return '未连接'
    }
  }

  function copyShareLink() {
    const room = s.roomState.selectedRoom
    if (!room) return
    const link = generateShareLink(room)
    navigator.clipboard?.writeText(link).catch(() => {})
    snackbar.show({ title: '复制成功', message: '房间链接已复制到剪贴板', type: 'success' })
  }
</script>

<svelte:window onresize={() => (columnCount = getColumns())} />

<div class="room-page">
  <!-- 顶部当前房间横幅 (已连接且选中房间) -->
  {#if s.roomState.selectedRoom && state === 'connected'}
    <Card radius={8} margin="16px 16px 8px 16px" onclick={copyShareLink}>
      <div class="banner">
        <div class="banner-text">
          <div class="bt">当前房间: {s.roomState.selectedRoom.name}</div>
          <div class="bs">连接状态: {stateText()} (点击分享房间)</div>
        </div>
      </div>
    </Card>
  {/if}

  {#if state !== 'idle'}
    <div class="flex">
      <UserPage />
    </div>
  {:else}
    <div class="scroll">
      <div class="grid" style="grid-template-columns: repeat({columnCount}, 1fr)">
        {#each s.roomState.rooms as room (room.id)}
          <RoomCard {room} />
        {/each}
      </div>
    </div>

    <!-- FAB 组: 排序 / 粘贴导入 / 添加 -->
    <div class="fabs">
      <Fab icon="sort" tip="房间排序" onclick={() => roomDialogs.openReorder()} />
      <div class="fab-gap"></div>
      <Fab icon="paste" tip="导入房间" onclick={() => roomDialogs.openPaste()} />
      <div class="fab-gap"></div>
      <Fab icon="add" tip="添加房间" onclick={() => roomDialogs.openAddRoom()} />
    </div>
  {/if}
</div>

<RoomDialogs />

<style>
  .room-page {
    height: 100%;
    position: relative;
    display: flex;
    flex-direction: column;
  }
  .flex {
    flex: 1;
    min-height: 0;
  }
  .banner {
    padding: 8px 16px;
    display: flex;
    align-items: center;
  }
  .banner-text .bt {
    font-size: 16px;
    line-height: 24px;
  }
  .banner-text .bs {
    font-size: 14px;
    line-height: 20px;
    color: var(--md-sys-color-on-surface-variant);
  }
  .scroll {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  }
  .grid {
    display: grid;
    gap: 8px;
    align-items: start;
  }
  .fabs {
    position: absolute;
    right: 16px;
    bottom: 16px;
    display: flex;
    align-items: center;
    z-index: 10;
  }
  .fab-gap {
    width: 16px;
  }
</style>
