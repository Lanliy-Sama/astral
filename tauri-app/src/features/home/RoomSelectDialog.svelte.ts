/**
 * 房间选择弹窗状态 (CanvasJump)
 */
class RoomSelectDialogState {
  open = $state(false)
  openDialog() {
    this.open = true
  }
}

export const roomSelectDialog = new RoomSelectDialogState()
