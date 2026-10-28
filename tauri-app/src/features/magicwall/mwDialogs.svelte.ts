/**
 * 魔法墙对话框状态
 */
import type { MagicWallGroupModel, MagicWallRuleModel } from '../../core/models/types'

class MwDialogsState {
  fabMenuOpen = $state(false)
  groupOpen = $state(false)
  ruleOpen = $state(false)
  editingGroup = $state<MagicWallGroupModel | null>(null)
  editingRule = $state<MagicWallRuleModel | null>(null)
  /** 规则对话框锁定的分组 (从分组内"添加规则"进入) */
  lockedGroupId = $state<string | null>(null)

  openGroup(group: MagicWallGroupModel | null) {
    this.editingGroup = group
    this.groupOpen = true
  }

  openRule(rule: MagicWallRuleModel | null, lockedGroupId: string | null) {
    this.editingRule = rule
    this.lockedGroupId = lockedGroupId
    this.ruleOpen = true
  }
}

export const mwDialogs = new MwDialogsState()
