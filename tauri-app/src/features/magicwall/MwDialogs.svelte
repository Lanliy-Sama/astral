<script lang="ts">
  // MwDialogs — 分组/规则编辑对话框 + 规则菜单 + 规则删除确认
  import Dialog from '../../lib/ui/Dialog.svelte'
  import Button from '../../lib/ui/Button.svelte'
  import TextField from '../../lib/ui/TextField.svelte'
  import SwitchListTile from '../../lib/ui/SwitchListTile.svelte'
  import Dropdown from '../../lib/ui/Dropdown.svelte'
  import Icon from '../../lib/ui/Icon.svelte'
  import Menu from '../../lib/ui/Menu.svelte'
  import { mwDialogs } from './mwDialogs.svelte.ts'
  import { magicWall } from './magicWall.svelte.ts'
  import { snackbar } from '../../lib/ui/snackbar.svelte.ts'
  import { M2 } from '../../lib/utils/uiHelpers'
  import { v4 as uuidv4 } from 'uuid'
  import type { MagicWallGroupModel, MagicWallRuleModel } from '../../lib/core/models/types'

  let { ruleDeleteOpen = $bindable(false) }: { ruleDeleteOpen?: boolean } = $props()

  // ---------- 分组对话框 ----------
  let groupName = $state('')
  let groupProcess = $state('')
  let groupAutoManage = $state(true)
  let groupEnabled = $state(false)

  $effect(() => {
    if (mwDialogs.groupOpen) {
      const g = mwDialogs.editingGroup
      groupName = g?.name ?? ''
      groupProcess = g?.processName ?? ''
      groupAutoManage = g?.autoManage ?? true
      groupEnabled = g?.enabled ?? false
    }
  })

  async function saveGroup() {
    if (!groupName.trim()) {
      snackbar.show({ title: '无法保存', message: '请输入规则组名称', type: 'error' })
      return
    }
    if (groupAutoManage && !groupProcess.trim()) {
      snackbar.show({ title: '无法保存', message: '启用自动监听时需填写进程名称', type: 'error' })
      return
    }
    const isNew = !mwDialogs.editingGroup
    const group: MagicWallGroupModel = {
      id: mwDialogs.editingGroup?.id ?? 0,
      groupId: mwDialogs.editingGroup?.groupId ?? uuidv4(),
      name: groupName.trim(),
      processName: groupProcess.trim(),
      enabled: groupEnabled,
      autoManage: groupAutoManage,
      createdAt: mwDialogs.editingGroup?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    }
    mwDialogs.groupOpen = false
    await magicWall.saveGroup(group, isNew)
  }

  // ---------- 规则对话框 ----------
  let ruleName = $state('')
  let ruleGroup = $state('')
  let ruleAction = $state<'allow' | 'block'>('block')
  let ruleProtocol = $state<'tcp' | 'udp' | 'both' | 'any'>('both')
  let ruleDirection = $state<'inbound' | 'outbound' | 'both'>('both')
  let ruleRemoteIp = $state('')
  let ruleRemotePort = $state('')
  let ruleLocalIp = $state('')
  let ruleLocalPort = $state('')
  let ruleEnabled = $state(true)

  $effect(() => {
    if (mwDialogs.ruleOpen) {
      const r = mwDialogs.editingRule
      ruleName = r?.name ?? ''
      ruleAction = r?.action ?? 'block'
      ruleProtocol = r?.protocol ?? 'both'
      ruleDirection = r?.direction ?? 'both'
      ruleRemoteIp = r?.remoteIp ?? ''
      ruleRemotePort = r?.remotePort ?? ''
      ruleLocalIp = r?.localIp ?? ''
      ruleLocalPort = r?.localPort ?? ''
      ruleEnabled = r?.enabled ?? true
      ruleGroup =
        r?.groupId ??
        mwDialogs.lockedGroupId ??
        magicWall.groups[0]?.group.groupId ??
        ''
    }
  })

  let groupItems = $derived(magicWall.groups.map((b) => ({ value: b.group.groupId, label: b.group.name })))

  async function saveRule() {
    if (!ruleName.trim()) {
      snackbar.show({ title: '无法保存', message: '请输入规则名称', type: 'error' })
      return
    }
    if (!ruleGroup) {
      snackbar.show({ title: '无法保存', message: '请选择规则组', type: 'error' })
      return
    }
    const isNew = !mwDialogs.editingRule
    const rule: MagicWallRuleModel = {
      id: mwDialogs.editingRule?.id ?? 0,
      ruleId: mwDialogs.editingRule?.ruleId ?? uuidv4(),
      groupId: ruleGroup,
      name: ruleName.trim(),
      enabled: ruleEnabled,
      action: ruleAction,
      protocol: ruleProtocol,
      direction: ruleDirection,
      appPath: mwDialogs.editingRule?.appPath ?? null,
      remoteIp: ruleRemoteIp.trim() || null,
      localIp: ruleLocalIp.trim() || null,
      remotePort: ruleRemotePort.trim() || null,
      localPort: ruleLocalPort.trim() || null,
      description: mwDialogs.editingRule?.description ?? null,
      createdAt: mwDialogs.editingRule?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
      priority: mwDialogs.editingRule?.priority ?? 0,
    }
    mwDialogs.ruleOpen = false
    try {
      await magicWall.saveRule(rule, isNew)
    } catch {
      /* snackbar 已在 controller 内处理 */
    }
  }

  // 规则菜单
  let ruleMenuOpen = $state(false)
  let ruleMenuAnchor = $state<HTMLElement | null>(null)
</script>

<!-- 分组编辑 -->
<Dialog bind:open={mwDialogs.groupOpen} radius={28} width={420} maxWidth={420}>
  <div class="dlg-title headline-small">
    {mwDialogs.editingGroup ? '编辑规则组' : '添加规则组'}
  </div>
  <div class="dlg-content">
    <TextField bind:value={groupName} label="规则组名称 *" prefixIcon="layers" />
    <div class="h16"></div>
    <TextField bind:value={groupProcess} label="绑定进程名称" hint="如: game.exe" prefixIcon="memory" />
    <div class="h16"></div>
    <SwitchListTile title="自动监听进程" subtitle="进程启动启用规则组, 进程结束关闭规则组" bind:checked={groupAutoManage} />
    <SwitchListTile title="启用规则组" bind:checked={groupEnabled} />
  </div>
  <div class="dlg-actions">
    <Button variant="text" onclick={() => (mwDialogs.groupOpen = false)}>取消</Button>
    <Button variant="elevated" onclick={saveGroup}>保存</Button>
  </div>
</Dialog>

<!-- 规则编辑 -->
<Dialog bind:open={mwDialogs.ruleOpen} radius={28} width={500} maxWidth={500}>
  <div class="dlg-title headline-small">{mwDialogs.editingRule ? '编辑规则' : '添加规则'}</div>
  <div class="dlg-content">
    {#if groupItems.length > 0}
      <Dropdown
        bind:value={ruleGroup}
        mode="field"
        label="所属规则组"
        items={groupItems}
        disabled={!!mwDialogs.lockedGroupId && !mwDialogs.editingRule}
      />
      <div class="h16"></div>
    {/if}
    <TextField bind:value={ruleName} label="规则名称 *" prefixIcon="label" />
    <div class="h16"></div>
    <div class="row">
      <div class="flex">
        <Dropdown
          bind:value={ruleAction}
          mode="field"
          label="动作"
          items={[
            { value: 'allow', label: '允许' },
            { value: 'block', label: '阻止' },
          ]}
        />
      </div>
      <span class="gap8"></span>
      <div class="flex">
        <Dropdown
          bind:value={ruleProtocol}
          mode="field"
          label="协议"
          items={[
            { value: 'tcp', label: 'TCP' },
            { value: 'udp', label: 'UDP' },
            { value: 'both', label: 'TCP+UDP' },
            { value: 'any', label: '任意' },
          ]}
        />
      </div>
    </div>
    <div class="h16"></div>
    <Dropdown
      bind:value={ruleDirection}
      mode="field"
      label="方向"
      prefixIconHint
      items={[
        { value: 'inbound', label: '⬇️ 入站' },
        { value: 'outbound', label: '⬆️ 出站' },
        { value: 'both', label: '↕️ 双向' },
      ]}
    />
    <div class="h16"></div>
    <div class="row">
      <div class="flex">
        <TextField bind:value={ruleRemoteIp} label="远程 IP（可选）" hint="192.168.1.1 或 192.168.0.0/16" />
      </div>
      <span class="gap8"></span>
      <div class="flex">
        <TextField bind:value={ruleRemotePort} label="远程端口（可选）" hint="80 或 8000-9000" inputmode="numeric" />
      </div>
    </div>
    <div class="h16"></div>
    <div class="row">
      <div class="flex">
        <TextField bind:value={ruleLocalIp} label="本地 IP（可选）" />
      </div>
      <span class="gap8"></span>
      <div class="flex">
        <TextField bind:value={ruleLocalPort} label="本地端口（可选）" inputmode="numeric" />
      </div>
    </div>
    <div class="h16"></div>
    <SwitchListTile title="启用规则" bind:checked={ruleEnabled} />
  </div>
  <div class="dlg-actions">
    <Button variant="text" onclick={() => (mwDialogs.ruleOpen = false)}>取消</Button>
    <Button variant="elevated" onclick={saveRule}>保存</Button>
  </div>
</Dialog>

<style>
  .dlg-title {
    padding: 24px 24px 16px;
  }
  .dlg-content {
    padding: 0 24px;
    display: flex;
    flex-direction: column;
    max-height: 55vh;
    overflow-y: auto;
  }
  .dlg-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 24px;
  }
  .row {
    display: flex;
    align-items: center;
  }
  .h16 {
    height: 16px;
  }
  .gap8 {
    width: 8px;
    display: inline-block;
  }
</style>
