<script lang="ts">
  // RoomCard — 对应 room_card.dart
  import Card from '../../lib/ui/Card.svelte'
  import Icon from '../../lib/ui/Icon.svelte'
  import IconButton from '../../lib/ui/IconButton.svelte'
  import Dialog from '../../lib/ui/Dialog.svelte'
  import Button from '../../lib/ui/Button.svelte'
  import { services } from '../../lib/core/services/services.svelte'
  import { roomDialogs } from './roomDialogs.svelte.ts'
  import { tooltip, ripple } from '../../lib/ui/actions'
  import { M2 } from '../../lib/utils/uiHelpers'
  import { router } from '../../lib/core/router.svelte'
  import { snackbar } from '../../lib/ui/snackbar.svelte.ts'

  let { room }: { room: import('../../core/models/types').Room } = $props()

  const s = services()

  let isHovered = $state(false)
  let isSelected = $derived(s.roomState.selectedRoom?.id === room.id)
  let confirmDelete = $state(false)

  // 选中态背景色: primary HSL 亮度调整 (亮色 0.95 / 暗色 0.10)
  let selectedBg = $derived(getSelectedBg())

  function getSelectedBg(): string {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark'
    const rgb = getComputedStyle(document.documentElement)
      .getPropertyValue('--md-sys-color-primary')
      .trim()
    const [h, sat, l] = hexToHsl(rgb)
    // 原版: HSLColor.fromColor(primary).withLightness(0.95/0.10) — 仅改亮度, 保留色相饱和度
    const targetL = dark ? 0.1 : 0.95
    return hslToCss(h, sat, targetL)
  }

  function hexToHsl(hex: string): [number, number, number] {
    const h = hex.replace('#', '')
    const r = parseInt(h.slice(0, 2), 16) / 255
    const g = parseInt(h.slice(2, 4), 16) / 255
    const b = parseInt(h.slice(4, 6), 16) / 255
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let hue = 0
    const l = (max + min) / 2
    const d = max - min
    const sat = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
    if (d !== 0) {
      if (max === r) hue = ((g - b) / d) % 6
      else if (max === g) hue = (b - r) / d + 2
      else hue = (r - g) / d + 4
      hue *= 60
      if (hue < 0) hue += 360
    }
    return [hue, sat, l]
  }

  function hslToCss(h: number, s: number, l: number): string {
    const c = (1 - Math.abs(2 * l - 1)) * s
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
    const m = l - c / 2
    let r = 0,
      g = 0,
      b = 0
    if (h < 60) [r, g, b] = [c, x, 0]
    else if (h < 120) [r, g, b] = [x, c, 0]
    else if (h < 180) [r, g, b] = [0, c, x]
    else if (h < 240) [r, g, b] = [0, x, c]
    else if (h < 300) [r, g, b] = [x, 0, c]
    else [r, g, b] = [c, 0, x]
    const to = (v: number) =>
      Math.round((v + m) * 255)
        .toString(16)
        .padStart(2, '0')
    return `#${to(r)}${to(g)}${to(b)}`
  }

  async function deleteRoom() {
    confirmDelete = false
    await s.room.deleteRoom(room.id)
  }
</script>

<Card
  radius={12}
  margin="4px"
  color={isSelected ? selectedBg : 'var(--md-sys-color-surface-container-low)'}
>
  <div
    class="room-card"
    class:hover={isHovered}
    class:selected={isSelected}
    onmouseenter={() => (isHovered = true)}
    onmouseleave={() => (isHovered = false)}
    use:ripple
    onclick={() => s.room.setRoom(room)}
  >
    <div class="content">
      <!-- 第一行: 名称 + 操作 (原版 IconButton padding:0 + constraints:{} → 紧凑 20px) -->
      <div class="row1">
        <div class="name-area">
          {#if isSelected}
            <Icon name="check_circle" size={20} color="var(--md-sys-color-primary)" />
            <span class="gap8"></span>
          {/if}
          <span class="name ellipsis">{room.name}</span>
        </div>
        <div class="actions">
          <button
            class="mini-btn"
            use:tooltip={'分享房间'}
            onclick={() => roomDialogs.openShare(room)}
          >
            <Icon name="share" size={20} />
          </button>
          <span class="gap8"></span>
          {#if isSelected}
            <button class="mini-btn disabled" title="不能删除正在连接的房间">
              <Icon name="delete" size={20} color="var(--md-sys-color-outline)" />
            </button>
          {:else}
            <button
              class="mini-btn"
              use:tooltip={'删除房间'}
              onclick={() => (confirmDelete = true)}
            >
              <Icon name="delete" size={20} />
            </button>
          {/if}
          <span class="gap8"></span>
          <button
            class="mini-btn"
            use:tooltip={'编辑房间'}
            onclick={() => roomDialogs.openEdit(room)}
          >
            <Icon name="edit" size={20} />
          </button>
          <span class="gap8"></span>
          <Icon
            name={room.encrypted ? 'lock' : 'lock_open'}
            size={20}
            color={room.encrypted ? M2.red : M2.green}
          />
        </div>
      </div>
      <div class="gap4"></div>
      <!-- 第二行: 类型 + 携带服务器徽章 -->
      <div class="row2">
        <span class="type">类型: {room.encrypted ? '保护' : '不保护'}</span>
        {#if room.servers.length > 0}
          <span class="server-badge">携带服务器</span>
        {/if}
      </div>
    </div>
  </div>
</Card>

<!-- 删除确认 -->
<Dialog bind:open={confirmDelete} radius={28}>
  <div class="dlg-title headline-small">确认删除</div>
  <div class="dlg-content body-medium">确定要删除这个房间吗？</div>
  <div class="dlg-actions">
    <Button variant="text" onclick={() => (confirmDelete = false)}>取消</Button>
    <Button variant="text" fontColor={M2.red} onclick={deleteRoom}>删除</Button>
  </div>
</Dialog>

<style>
  .room-card {
    padding: 16px;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    border: 2px solid transparent;
    border-radius: 12px;
    height: 100%;
  }
  .room-card.hover:not(.selected) {
    border-color: var(--md-sys-color-primary);
    border-width: 1px;
  }
  .room-card.selected {
    border-color: var(--md-sys-color-primary);
  }
  .content {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }
  .row1 {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    gap: 8px;
  }
  .name-area {
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;
  }
  .name {
    font-size: 18px;
    font-weight: 700;
  }
  .actions {
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }
  .mini-btn {
    width: 20px;
    height: 20px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--md-sys-color-on-surface-variant);
  }
  .mini-btn.disabled {
    pointer-events: none;
  }
  .gap8 {
    width: 8px;
    display: inline-block;
  }
  .gap4 {
    height: 4px;
  }
  .row2 {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }
  .type {
    color: var(--md-sys-color-on-surface-variant);
    font-size: 14px;
  }
  .server-badge {
    background: color-mix(in srgb, var(--md-sys-color-primary) 20%, transparent);
    color: var(--md-sys-color-primary);
    font-size: 12px;
    padding: 2px 8px;
    border-radius: 4px;
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
