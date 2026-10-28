/**
 * Npcap 对话框状态
 */
class NpcapDialogState {
  open = $state(false)
  private onConfirm: (() => void) | null = null

  show(onConfirm: () => void) {
    this.onConfirm = onConfirm
    this.open = true
  }
  proceed() {
    this.open = false
    this.onConfirm?.()
  }
}

export const npcapDialog = new NpcapDialogState()
