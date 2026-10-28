<script lang="ts">
  // RoomSelectDialog (CanvasJump) — 对应 canvas_jump.dart: 搜索 + 房间列表 + 悬停高亮
  import Dialog from '../../lib/ui/Dialog.svelte'
  import Button from '../../lib/ui/Button.svelte'
  import Icon from '../../lib/ui/Icon.svelte'
  import TextField from '../../lib/ui/TextField.svelte'
  import { services } from '../../lib/core/services/services.svelte'
  import { roomSelectDialog } from './RoomSelectDialog.svelte.ts'

  const s = services()

  let search = $state('')
  let hoveredName = $state<string | null>(null)

  let filteredRooms = $derived(
    s.roomState.rooms.filter((r) => r.name.toLowerCase().includes(search.toLowerCase())),
  )

  function select(room: (typeof s.roomState.rooms)[number]) {
    s.room.setRoom(room)
    roomSelectDialog.open = false
  }
</script>

<Dialog bind:open={roomSelectDialog.open} radius={16} minWidth={Math.floor(window.innerWidth / 1.2)}>
  <div class="dlg-title">
    <Icon name="meeting_room" color="var(--md-sys-color-primary)" />
    <span class="t" style="color: var(--md-sys-color-primary); font-size: 18px">选择房间</span>
  </div>
  <div class="dlg-content">
    <div class="search-wrap">
      <TextField bind:value={search} hint="搜索房间" prefixIcon="search" />
    </div>
    <div class="room-list">
      {#each filteredRooms as room (room.id)}
        <div class="room-item-pad">
          <div
            class="room-item"
            class:hover={hoveredName === room.name}
            onclick={() => select(room)}
            onmouseenter={() => (hoveredName = room.name)}
            onmouseleave={() => (hoveredName = null)}
          >
            <div class="ri-inner">
              <div class="ri-text">
                <div class="ri-name">{room.name}</div>
                <div class="ri-sub">{room.encrypted ? '加密房间' : '开放房间'}</div>
              </div>
              <Icon
                name="chevron_right"
                color="color-mix(in srgb, var(--md-sys-color-primary) 59%, transparent)"
              />
            </div>
          </div>
        </div>
      {/each}
    </div>
  </div>
  <div class="dlg-actions">
    <Button variant="text" fontColor="var(--md-sys-color-primary)" onclick={() => (roomSelectDialog.open = false)}>
      <span style="font-size:16px">取消</span>
    </Button>
  </div>
</Dialog>

<style>
  .dlg-title {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 16px 16px 0 16px;
  }
  .dlg-content {
    padding: 8px 16px 16px;
    display: flex;
    flex-direction: column;
    max-height: calc(50vh + 12px);
  }
  .search-wrap {
    padding: 0 8px;
  }
  .room-list {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
  }
  .room-item-pad {
    padding: 4px 0;
  }
  .room-item {
    border-radius: 16px;
    background: light-dark(
      color-mix(in srgb, var(--md-sys-color-surface-container-highest) 95%, transparent),
      color-mix(in srgb, var(--md-sys-color-surface-container-highest) 15%, transparent)
    );
    border: 1.5px solid transparent;
    cursor: pointer;
  }
  .room-item:hover {
    background: color-mix(in srgb, var(--md-sys-color-primary-container) 12%, transparent);
    border-color: var(--md-sys-color-primary);
  }
  .ri-inner {
    display: flex;
    align-items: center;
    padding: 8px 16px;
    border-radius: 12px;
  }
  .ri-text {
    flex: 1;
    min-width: 0;
  }
  .ri-name {
    font-size: 16px;
    line-height: 24px;
    color: var(--md-sys-color-on-surface);
  }
  .ri-sub {
    font-size: 14px;
    line-height: 20px;
    color: var(--md-sys-color-on-surface-variant);
  }
  .dlg-actions {
    display: flex;
    justify-content: flex-end;
    padding: 16px;
  }
</style>
