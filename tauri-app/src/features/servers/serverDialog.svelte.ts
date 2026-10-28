/**
 * 服务器对话框状态 — 添加/编辑
 */
import type { ServerMod } from '../../core/models/types'

class ServerDialogState {
  open = $state(false)
  isEdit = $state(false)
  server = $state<ServerMod | null>(null)

  add() {
    this.isEdit = false
    this.server = null
    this.open = true
  }

  edit(server: ServerMod) {
    this.isEdit = true
    this.server = server
    this.open = true
  }
}

export const serverDialog = new ServerDialogState()
