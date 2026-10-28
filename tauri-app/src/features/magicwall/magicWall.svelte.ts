/**
 * 魔法墙 — store + controller + engine 同步
 * 对应 magic_wall_store.dart / magic_wall_controller.dart / magic_wall_engine.dart
 */
import { services } from '../../lib/core/services/services.svelte'
import { bridge } from '../../lib/core/bridge/bridge'
import { MagicWallStore, nextId } from '../../lib/core/storage/storage'
import { snackbar } from '../../lib/ui/snackbar.svelte.ts'
import type { MagicWallGroupBundle, MagicWallGroupModel, MagicWallRuleModel } from '../../lib/core/models/types'
import { Platform } from '../../lib/platform'

class MagicWallController {
  isRunning = $state(false)
  groups = $state<MagicWallGroupBundle[]>([])
  activeRulesCount = $state(0)

  async init() {
    await this.loadData()
    await this.checkStatus()
  }

  async loadData() {
    const groups = MagicWallStore.getGroups().sort((a, b) => a.name.localeCompare(b.name))
    const rules = MagicWallStore.getRules().sort((a, b) => b.priority - a.priority)
    this.groups = groups.map((g) => ({
      group: g,
      rules: rules.filter((r) => r.groupId === g.groupId),
    }))
    this.recalcCount()
  }

  private recalcCount() {
    this.activeRulesCount = this.groups.reduce(
      (acc, b) => acc + (b.group.enabled ? b.rules.filter((r) => r.enabled).length : 0),
      0,
    )
  }

  async checkStatus() {
    try {
      const st = await bridge.getMagicWallStatus()
      this.isRunning = st.isRunning
      if (st.isRunning) this.activeRulesCount = st.activeRules
    } catch {
      /* ignore */
    }
  }

  // ---------- 引擎开关 ----------
  async toggleEngine(on: boolean) {
    try {
      if (on) {
        await this.startAndSyncRules()
        snackbar.show({ title: '成功', message: '魔法墙已启动', type: 'success' })
      } else {
        await bridge.stopMagicWall()
        snackbar.show({ title: '成功', message: '魔法墙已停止', type: 'success' })
      }
      this.isRunning = on
      await this.checkStatus()
    } catch (e: any) {
      snackbar.show({ title: '错误', message: String(e?.message ?? e), type: 'error' })
      throw e
    }
  }

  private async startAndSyncRules() {
    for (const bundle of this.groups) {
      if (!bundle.group.enabled) continue
      for (const rule of bundle.rules) {
        if (!rule.enabled) continue
        try {
          await bridge.addMagicWallRule(rule)
        } catch {
          /* 应用规则失败仅日志 */
        }
      }
    }
    await bridge.startMagicWall()
  }

  // ---------- 分组 CRUD ----------
  async saveGroup(group: MagicWallGroupModel, isNew: boolean) {
    try {
      const groups = MagicWallStore.getGroups()
      if (isNew) {
        group.id = nextId(groups)
        groups.push(group)
      } else {
        const i = groups.findIndex((g) => g.groupId === group.groupId)
        if (i >= 0) groups[i] = group
      }
      MagicWallStore.putGroups(groups)
      await this.loadData()
      snackbar.show({
        title: '成功',
        message: isNew ? '规则组已添加' : '规则组已更新',
        type: 'success',
      })
    } catch (e: any) {
      snackbar.show({ title: '无法保存', message: String(e?.message ?? e), type: 'error' })
    }
  }

  async deleteGroup(group: MagicWallGroupModel) {
    // 同步: 运行中且组启用 → 先移除规则
    if (this.isRunning && group.enabled) {
      const rules = MagicWallStore.getRules().filter((r) => r.groupId === group.groupId)
      for (const r of rules) {
        try {
          await bridge.removeMagicWallRule(r.ruleId)
        } catch {
          /* ignore */
        }
      }
    }
    MagicWallStore.putGroups(MagicWallStore.getGroups().filter((g) => g.groupId !== group.groupId))
    MagicWallStore.putRules(MagicWallStore.getRules().filter((r) => r.groupId !== group.groupId))
    await this.loadData()
    snackbar.show({ title: '成功', message: '规则组已删除', type: 'success' })
  }

  async toggleGroup(group: MagicWallGroupModel, enabled: boolean) {
    group.enabled = enabled
    const groups = MagicWallStore.getGroups()
    const i = groups.findIndex((g) => g.groupId === group.groupId)
    if (i >= 0) groups[i] = group
    MagicWallStore.putGroups(groups)

    // 同步引擎
    const bundle = this.groups.find((b) => b.group.groupId === group.groupId)
    const ruleIds = new Set((bundle?.rules ?? []).map((r) => r.ruleId))
    if (this.isRunning && enabled) {
      for (const r of bundle?.rules ?? []) {
        if (r.enabled && !ruleIds.has('')) {
          try {
            await bridge.addMagicWallRule(r)
          } catch {
            /* ignore */
          }
        }
      }
    } else if (this.isRunning && !enabled) {
      for (const id of ruleIds) {
        try {
          await bridge.removeMagicWallRule(id)
        } catch {
          /* ignore */
        }
      }
    }
    await this.loadData()
    await this.checkStatus()
  }

  // ---------- 规则 CRUD ----------
  async saveRule(rule: MagicWallRuleModel, isNew: boolean) {
    try {
      const rules = MagicWallStore.getRules()
      if (isNew) {
        rule.id = nextId(rules)
        rules.push(rule)
      } else {
        const i = rules.findIndex((r) => r.ruleId === rule.ruleId)
        if (i >= 0) rules[i] = rule
      }
      MagicWallStore.putRules(rules)

      // 同步引擎: 新增/更新
      const bundle = this.groups.find((b) => b.group.groupId === rule.groupId)
      if (this.isRunning && rule.enabled && bundle?.group.enabled) {
        try {
          if (isNew) await bridge.addMagicWallRule(rule)
          else await bridge.updateMagicWallRule(rule)
        } catch (e: any) {
          throw e
        }
      }
      await this.loadData()
      snackbar.show({
        title: '成功',
        message: isNew ? '规则已添加' : '规则已更新',
        type: 'success',
      })
    } catch (e: any) {
      snackbar.show({ title: '无法保存', message: String(e?.message ?? e), type: 'error' })
      throw e
    }
  }

  async deleteRule(rule: MagicWallRuleModel) {
    if (this.isRunning && rule.enabled) {
      try {
        await bridge.removeMagicWallRule(rule.ruleId)
      } catch {
        /* ignore */
      }
    }
    MagicWallStore.putRules(MagicWallStore.getRules().filter((r) => r.ruleId !== rule.ruleId))
    await this.loadData()
    snackbar.show({ title: '成功', message: '规则已删除', type: 'success' })
  }

  async toggleRule(rule: MagicWallRuleModel, enabled: boolean) {
    rule.enabled = enabled
    const rules = MagicWallStore.getRules()
    const i = rules.findIndex((r) => r.ruleId === rule.ruleId)
    if (i >= 0) rules[i] = rule
    MagicWallStore.putRules(rules)

    const bundle = this.groups.find((b) => b.group.groupId === rule.groupId)
    if (this.isRunning && enabled && bundle?.group.enabled) {
      try {
        await bridge.addMagicWallRule(rule)
      } catch {
        /* ignore */
      }
    } else if (this.isRunning && !enabled) {
      try {
        await bridge.removeMagicWallRule(rule.ruleId)
      } catch {
        /* ignore */
      }
    }
    await this.loadData()
    await this.checkStatus()
  }
}

export const magicWall = new MagicWallController()

/** 规则描述行 (buildMagicWallRuleDescription) */
export function ruleDescription(rule: MagicWallRuleModel): string {
  const parts: string[] = []
  parts.push(rule.action === 'allow' ? '允许' : '阻止')
  parts.push(rule.protocol.toUpperCase())
  if (rule.direction !== 'both') {
    parts.push(rule.direction === 'inbound' ? '入站' : '出站')
  }
  if (rule.remoteIp) parts.push(`从 ${rule.remoteIp}`)
  if (rule.remotePort) parts.push(`端口 ${rule.remotePort}`)
  return parts.join(' · ')
}
