<script lang="ts">
  // MagicWallPage — 对应 magic_wall_page.dart + 分组列表 + 控制面板
  import { onMount } from 'svelte'
  import BaseSettingsPage from '../settings/BaseSettingsPage.svelte'
  import Card from '../../lib/ui/Card.svelte'
  import Icon from '../../lib/ui/Icon.svelte'
  import Switch from '../../lib/ui/Switch.svelte'
  import IconButton from '../../lib/ui/IconButton.svelte'
  import Button from '../../lib/ui/Button.svelte'
  import Divider from '../../lib/ui/Divider.svelte'
  import Dialog from '../../lib/ui/Dialog.svelte'
  import Menu from '../../lib/ui/Menu.svelte'
  import BottomSheet from '../../lib/ui/BottomSheet.svelte'
  import Fab from '../../lib/ui/Fab.svelte'
  import { magicWall, ruleDescription } from './magicWall.svelte.ts'
  import { mwDialogs } from './mwDialogs.svelte.ts'
  import MwDialogs from './MwDialogs.svelte'
  import { Platform } from '../../lib/platform'
  import { M2 } from '../../lib/utils/uiHelpers'
  import type { MagicWallGroupModel, MagicWallRuleModel } from '../../lib/core/models/types'

  const controller = magicWall

  let collapsedGroups = $state<Set<string>>(new Set())

  onMount(() => controller.init())

  function toggleCollapse(groupId: string) {
    const set = new Set(collapsedGroups)
    if (set.has(groupId)) set.delete(groupId)
    else set.add(groupId)
    collapsedGroups = set
  }

  // 组菜单
  let groupMenuFor = $state<MagicWallGroupModel | null>(null)
  let groupMenuAnchor = $state<HTMLElement | null>(null)
  let ruleMenuFor = $state<MagicWallRuleModel | null>(null)
  let ruleMenuAnchor = $state<HTMLElement | null>(null)

  let confirmDeleteGroup = $state<MagicWallGroupModel | null>(null)
  let confirmDeleteRule = $state<MagicWallRuleModel | null>(null)
  let groupDeleteOpen = $state(false)
  let ruleDeleteOpen = $state(false)

  let groupMenuOpen = $state(false)
  let ruleMenuOpen = $state(false)
  let isDesktop = $derived(window.innerWidth > 600)
</script>

<BaseSettingsPage title="魔法墙">
  {#snippet actions()}
    <div class="status-indicator">
      {#if controller.isRunning}
        <Icon name="shield" size={20} color={M2.green} />
      {:else}
        <Icon name="shield_outlined" size={20} color={M2.grey} />
      {/if}
      <span class="gap8"></span>
      <span class="status-text">{controller.activeRulesCount} 条规则</span>
    </div>
  {/snippet}

  <div class="mw-body">
    <!-- 控制面板 -->
    <Card radius={12} margin="16px">
      <div class="panel">
        <div class="panel-text">
          <div class="panel-title">魔法墙引擎</div>
          <div class="h4"></div>
          <div class="panel-status" style="color: {controller.isRunning ? M2.green : M2.grey}">
            {controller.isRunning ? '运行中' : '已停止'}
          </div>
          {#if !Platform.isWindows}
            <div class="h8"></div>
            <div class="platform-warn">⚠️ 魔法墙仅支持 Windows 平台</div>
          {/if}
        </div>
        <Switch
          checked={controller.isRunning}
          disabled={!Platform.isWindows}
          onchange={(v) => controller.toggleEngine(v)}
        />
      </div>
    </Card>

    <Divider height={1} />

    <!-- 分组列表 -->
    {#if controller.groups.length === 0}
      <div class="empty">
        <Icon name="shield_outlined" size={80} color="#BDBDBD" />
        <div class="h16"></div>
        <div class="empty-title">还没有规则组</div>
        <div class="h8"></div>
        <div class="empty-sub">点击右下角按钮创建规则组</div>
      </div>
    {:else}
      <div class="group-list">
        {#each controller.groups as bundle (bundle.group.groupId)}
          {@const group = bundle.group}
          {@const collapsed = collapsedGroups.has(group.groupId)}
          {@const enabledCount = bundle.rules.filter((r) => r.enabled).length}
          <Card radius={12} margin="8px 12px">
            <!-- 组头 -->
            <div class="group-head" onclick={() => toggleCollapse(group.groupId)}>
              <div class="avatar" style="background: {group.enabled ? M2.blue : M2.grey}">
                <Icon name="layers" size={24} color="#fff" />
              </div>
              <div class="group-text">
                <div class="group-name" style={group.enabled ? '' : `color: ${M2.grey}`}>
                  {group.name}
                </div>
                <div class="group-sub">
                  <div>进程: {group.processName || '未绑定'}</div>
                  <div>规则: {bundle.rules.length} 项 · 已启用 {enabledCount} 项</div>
                  {#if group.autoManage}
                    <div style="color: {M2.grey}">自动监听进程</div>
                  {/if}
                </div>
              </div>
              <div class="group-trailing">
                <IconButton
                  icon={collapsed ? 'expand_more' : 'expand_less'}
                  size={40}
                  padding={8}
                  onclick={() => toggleCollapse(group.groupId)}
                />
                <Switch
                  checked={group.enabled}
                  onchange={(v) => controller.toggleGroup(group, v)}
                />
                <IconButton
                  icon="more_vert"
                  size={40}
                  padding={8}
                  onclick={(e) => {
                    groupMenuFor = group
                    groupMenuAnchor = e.currentTarget as HTMLElement
                    groupMenuOpen = true
                  }}
                />
              </div>
            </div>

            <!-- 规则列表 (展开时) -->
            {#if !collapsed}
              {#if bundle.rules.length > 0}
                <Divider height={1} />
                {#each bundle.rules as rule, i (rule.ruleId)}
                  {#if i > 0}
                    <div class="rule-divider"></div>
                  {/if}
                  <div class="rule-tile">
                    <div class="rule-avatar"
                      style="background: {rule.action === 'allow'
                        ? rule.enabled && group.enabled
                          ? M2.green
                          : M2.grey
                        : '#EF9A9A'}"
                    >
                      <Icon name={rule.action === 'allow' ? 'check' : 'block'} size={24} color="#fff" />
                    </div>
                    <div class="rule-text">
                      <div class="rule-name" style={rule.enabled ? '' : `color: ${M2.grey}`}>
                        {rule.name}
                      </div>
                      <div class="rule-desc">{ruleDescription(rule)}</div>
                      {#if rule.description}
                        <div class="rule-custom-desc">{rule.description}</div>
                      {/if}
                    </div>
                    <div class="rule-trailing">
                      <Switch
                        checked={rule.enabled}
                        onchange={(v) => controller.toggleRule(rule, v)}
                      />
                      <IconButton
                        icon="more_vert"
                        size={40}
                        padding={8}
                        onclick={(e) => {
                          ruleMenuFor = rule
                          ruleMenuAnchor = e.currentTarget as HTMLElement
                          ruleMenuOpen = true
                        }}
                      />
                    </div>
                  </div>
                {/each}
              {/if}
              <div class="add-rule-row">
                <Button variant="text" icon="add" onclick={() => mwDialogs.openRule(null, bundle.group.groupId)}>
                  添加规则
                </Button>
              </div>
            {/if}
          </Card>
        {/each}
      </div>
    {/if}
  </div>

  <!-- FAB → 弹出菜单 -->
  <div class="fab-area">
    <Fab icon="add" onclick={() => (mwDialogs.fabMenuOpen = true)} />
  </div>
</BaseSettingsPage>

<!-- FAB 菜单 (添加规则组 / 添加规则) -->
{#if isDesktop}
  <Dialog bind:open={mwDialogs.fabMenuOpen} radius={28} width={280} maxWidth={280}>
    <div class="fab-menu">
      <div class="fab-menu-item" onclick={() => {
        mwDialogs.fabMenuOpen = false
        mwDialogs.openGroup(null)
      }}>
        <Icon name="layers" size={24} />
        <span class="gap16"></span>
        <span>添加规则组</span>
      </div>
      <div
        class="fab-menu-item"
        class:disabled={controller.groups.length === 0}
        onclick={() => {
          if (controller.groups.length === 0) return
          mwDialogs.fabMenuOpen = false
          mwDialogs.openRule(null, null)
        }}
      >
        <Icon name="playlist_add" size={24} />
        <span class="gap16"></span>
        <span>添加规则</span>
      </div>
    </div>
  </Dialog>
{:else}
  <BottomSheet bind:open={mwDialogs.fabMenuOpen} maxHeight="30vh">
    <div class="fab-menu">
      <div class="fab-menu-item" onclick={() => {
        mwDialogs.fabMenuOpen = false
        mwDialogs.openGroup(null)
      }}>
        <Icon name="layers" size={24} />
        <span class="gap16"></span>
        <span>添加规则组</span>
      </div>
      <div
        class="fab-menu-item"
        class:disabled={controller.groups.length === 0}
        onclick={() => {
          if (controller.groups.length === 0) return
          mwDialogs.fabMenuOpen = false
          mwDialogs.openRule(null, null)
        }}
      >
        <Icon name="playlist_add" size={24} />
        <span class="gap16"></span>
        <span>添加规则</span>
      </div>
    </div>
  </BottomSheet>
{/if}

<!-- 组菜单 -->
<Menu
  bind:open={groupMenuOpen}
  anchor={groupMenuAnchor}
  items={[
    { value: 'addRule', label: '添加规则', icon: 'add' },
    { value: 'edit', label: '编辑规则组', icon: 'edit' },
    { value: 'delete', label: '删除规则组', icon: 'delete', color: M2.red },
  ]}
  onselect={(v) => {
    const group = groupMenuFor
    groupMenuFor = null
    if (!group) return
    if (v === 'addRule') mwDialogs.openRule(null, group.groupId)
    else if (v === 'edit') mwDialogs.openGroup(group)
    else if (v === 'delete') {
      confirmDeleteGroup = group
      groupDeleteOpen = true
    }
  }}
/>

<!-- 规则菜单 -->
<Menu
  bind:open={ruleMenuOpen}
  anchor={ruleMenuAnchor}
  items={[
    { value: 'edit', label: '编辑', icon: 'edit', iconSize: 20 },
    { value: 'delete', label: '删除', icon: 'delete', iconSize: 20, color: M2.red },
  ]}
  onselect={(v) => {
    const rule = ruleMenuFor
    ruleMenuFor = null
    if (!rule) return
    if (v === 'edit') mwDialogs.openRule(rule, null)
    else if (v === 'delete') {
      confirmDeleteRule = rule
      ruleDeleteOpen = true
    }
  }}
/>

<!-- 删除确认 -->
<Dialog bind:open={groupDeleteOpen} radius={28}>
  <div class="dlg-title headline-small">确认删除</div>
  <div class="dlg-content body-medium">确定要删除规则组 "{confirmDeleteGroup?.name}" 吗？</div>
  <div class="dlg-actions">
    <Button variant="text" onclick={() => (groupDeleteOpen = false)}>取消</Button>
    <Button
      variant="text"
      fontColor={M2.red}
      onclick={async () => {
        if (confirmDeleteGroup) await controller.deleteGroup(confirmDeleteGroup)
        groupDeleteOpen = false
      }}
    >
      删除
    </Button>
  </div>
</Dialog>

<!-- 引入分组/规则对话框与规则菜单 -->
<MwDialogs bind:ruleDeleteOpen />

<!-- 规则删除确认 -->
<Dialog bind:open={ruleDeleteOpen} radius={28}>
  <div class="dlg-title headline-small">确认删除</div>
  <div class="dlg-content body-medium">确定要删除规则 "{confirmDeleteRule?.name}" 吗？</div>
  <div class="dlg-actions">
    <Button variant="text" onclick={() => (ruleDeleteOpen = false)}>取消</Button>
    <Button
      variant="text"
      fontColor={M2.red}
      onclick={async () => {
        if (confirmDeleteRule) await controller.deleteRule(confirmDeleteRule)
        ruleDeleteOpen = false
      }}
    >
      删除
    </Button>
  </div>
</Dialog>

<style>
  .status-indicator {
    display: flex;
    align-items: center;
    padding: 0 16px;
  }
  .status-text {
    font-size: 14px;
  }
  .mw-body {
    display: flex;
    flex-direction: column;
    min-height: 100%;
  }
  .panel {
    display: flex;
    align-items: center;
    padding: 16px;
  }
  .panel-text {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }
  .panel-title {
    font-size: 18px;
    font-weight: 700;
  }
  .panel-status {
    font-size: 14px;
  }
  .platform-warn {
    font-size: 12px;
    color: M2.orange;
    color: #FF9800;
  }
  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 64px 0;
  }
  .empty-title {
    font-size: 18px;
    color: #757575;
  }
  .empty-sub {
    font-size: 14px;
    color: #9E9E9E;
  }
  .group-list {
    padding: 8px 0;
  }
  .group-head {
    display: flex;
    align-items: center;
    padding: 8px 16px 8px 12px;
    cursor: pointer;
  }
  .avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .group-text {
    flex: 1;
    min-width: 0;
    padding-left: 16px;
  }
  .group-name {
    font-size: 16px;
    font-weight: 700;
  }
  .group-sub {
    font-size: 12px;
    color: var(--md-sys-color-on-surface-variant);
    display: flex;
    flex-direction: column;
  }
  .group-trailing {
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }
  .rule-tile {
    display: flex;
    align-items: center;
    padding: 8px 16px 8px 0;
    padding-left: 0;
    margin-left: 72px;
  }
  .rule-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .rule-text {
    flex: 1;
    min-width: 0;
    padding-left: 16px;
  }
  .rule-name {
    font-size: 15px;
    font-weight: 700;
  }
  .rule-desc {
    font-size: 13px;
    color: var(--md-sys-color-on-surface-variant);
  }
  .rule-custom-desc {
    font-size: 12px;
    font-style: italic;
    color: var(--md-sys-color-on-surface-variant);
  }
  .rule-trailing {
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }
  .rule-divider {
    height: 1px;
    background: var(--md-sys-color-outline-variant);
    margin-left: 72px;
    margin-right: 16px;
  }
  .add-rule-row {
    display: flex;
    justify-content: flex-start;
    padding: 8px 16px 12px 72px;
  }
  .fab-area {
    position: fixed;
    right: 16px;
    bottom: 16px;
    z-index: 600;
  }
  .fab-menu {
    padding: 8px 0;
  }
  .fab-menu-item {
    display: flex;
    align-items: center;
    padding: 16px;
    cursor: pointer;
  }
  .fab-menu-item:hover {
    background: color-mix(in srgb, var(--md-sys-color-on-surface) 4%, transparent);
  }
  .fab-menu-item.disabled {
    opacity: 0.38;
    pointer-events: none;
  }
  .gap8 {
    width: 8px;
    display: inline-block;
  }
  .gap16 {
    width: 16px;
    display: inline-block;
  }
  .h4 {
    height: 4px;
  }
  .h8 {
    height: 8px;
  }
  .h16 {
    height: 16px;
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
