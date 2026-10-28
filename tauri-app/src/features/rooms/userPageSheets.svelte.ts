/**
 * UserPage 的两个底部 Sheet 状态 (房间设置 / 房间排序)
 */
class UserPageSheetsState {
  settingsOpen = $state(false)
  openSettings() {
    this.settingsOpen = true
  }
}

export const userPageSheets = new UserPageSheetsState()
