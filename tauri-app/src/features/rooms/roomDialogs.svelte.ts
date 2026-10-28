/**
 * 房间对话框状态机 — add/edit/paste/reorder/share + 网络配置确认
 */
import type { Room } from '../../core/models/types'

class RoomDialogsState {
  addOpen = $state(false)
  editRoom = $state<Room | null>(null)
  editOpen = $state(false)
  pasteOpen = $state(false)
  reorderOpen = $state(false)
  shareRoom = $state<Room | null>(null)
  shareOpen = $state(false)
  /** 导入时检测到网络配置 → 确认对话框 */
  netConfigConfirm = $state<{ room: Room; lines: string[] } | null>(null)
  netConfirmOpen = $state(false)

  openAddRoom() {
    this.addOpen = true
  }
  openEdit(room: Room) {
    this.editRoom = room
    this.editOpen = true
  }
  openPaste() {
    this.pasteOpen = true
  }
  openReorder() {
    this.reorderOpen = true
  }
  openShare(room: Room) {
    this.shareRoom = room
    this.shareOpen = true
  }
}

export const roomDialogs = new RoomDialogsState()
