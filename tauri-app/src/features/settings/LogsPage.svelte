<script lang="ts">
  // LogsPage — 对应 logs_page.dart (复制全部/清空/单条复制/滚动到底)
  import { tick } from 'svelte'
  import BaseSettingsPage from './BaseSettingsPage.svelte'
  import Card from '../../lib/ui/Card.svelte'
  import Icon from '../../lib/ui/Icon.svelte'
  import IconButton from '../../lib/ui/IconButton.svelte'
  import Dialog from '../../lib/ui/Dialog.svelte'
  import Button from '../../lib/ui/Button.svelte'
  import Fab from '../../lib/ui/Fab.svelte'
  import { services } from '../../lib/core/services/services.svelte'
  import { snackbar } from '../../lib/ui/snackbar.svelte.ts'
  import { M2 } from '../../lib/utils/uiHelpers'

  const s = services()

  let scrollEl: HTMLElement | null = $state(null)
  let confirmClear = $state(false)

  function logIcon(log: string): { icon: string; color: string } {
    const lower = log.toLowerCase()
    if (lower.includes('error') || log.includes('错误'))
      return { icon: 'error_outline', color: M2.red }
    if (lower.includes('warning') || log.includes('警告'))
      return { icon: 'warning_amber_outlined', color: M2.orange }
    return { icon: 'info_outline', color: M2.blue }
  }

  function logColor(log: string): string | undefined {
    const lower = log.toLowerCase()
    if (lower.includes('error') || log.includes('错误')) return M2.red
    if (lower.includes('warning') || log.includes('警告')) return M2.orange
    return undefined
  }

  function copyAll() {
    if (s.appSettingsState.logs.length === 0) {
      snackbar.show({ title: '提示', message: '暂无日志可复制', type: 'info' })
      return
    }
    navigator.clipboard?.writeText(s.appSettingsState.logs.join('\n')).catch(() => {})
    snackbar.show({
      title: '复制成功',
      message: `已复制 ${s.appSettingsState.logs.length} 条日志到剪贴板`,
      type: 'success',
    })
  }

  function clearAll() {
    confirmClear = false
    s.appSettingsState.logs = []
    snackbar.show({ title: '已清空', message: '日志已清空', type: 'success' })
  }

  async function scrollToBottom() {
    await tick()
    scrollEl?.scrollTo({ top: scrollEl.scrollHeight, behavior: 'smooth' })
  }
</script>

<BaseSettingsPage title="日志">
  {#snippet actions()}
    <IconButton icon="copy_all" size={40} padding={8} tip="复制所有日志" onclick={copyAll} />
    <IconButton icon="clear_all" size={40} padding={8} tip="清空日志" onclick={() => (confirmClear = true)} />
  {/snippet}

  {#if s.appSettingsState.logs.length === 0}
    <div class="empty">
      <Icon name="article_outlined" size={64} color={M2.grey} />
      <div class="h16"></div>
      <div class="empty-text">暂无日志</div>
    </div>
  {:else}
    <div class="logs-scroll" bind:this={scrollEl}>
      {#each s.appSettingsState.logs as log, i (i)}
        <Card radius={12} margin="2px 0">
          <div class="log-tile">
            <Icon name={logIcon(log).icon} size={20} color={logIcon(log).color} />
            <span class="gap16"></span>
            <div class="log-text" style={logColor(log) ? `color: ${logColor(log)}` : ''}>{log}</div>
            <IconButton
              icon="content_copy"
              iconSize={16}
              size={40}
              padding={12}
              tip="复制此条日志"
              onclick={() => {
                navigator.clipboard?.writeText(log).catch(() => {})
                snackbar.show({
                  title: '复制成功',
                  message: '日志已复制到剪贴板',
                  type: 'success',
                  duration: 1000,
                })
              }}
            />
          </div>
        </Card>
      {/each}
    </div>
  {/if}

  <div class="fab-area">
    <Fab icon="keyboard_arrow_down" tip="滚动到底部" onclick={scrollToBottom} />
  </div>
</BaseSettingsPage>

<!-- 清空确认 -->
<Dialog bind:open={confirmClear} radius={28}>
  <div class="dlg-title headline-small">确认清空</div>
  <div class="dlg-content body-medium">确定要清空所有日志吗？</div>
  <div class="dlg-actions">
    <Button variant="text" onclick={() => (confirmClear = false)}>取消</Button>
    <Button variant="text" onclick={clearAll}>确定</Button>
  </div>
</Dialog>

<style>
  .empty {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .empty-text {
    font-size: 18px;
    color: #9e9e9e;
  }
  .logs-scroll {
    height: 100%;
    overflow-y: auto;
    padding: 8px;
  }
  .log-tile {
    display: flex;
    align-items: center;
    padding: 0 8px 0 16px;
    min-height: 48px;
  }
  .log-text {
    flex: 1;
    min-width: 0;
    font-size: 12px;
    font-family: monospace;
    word-break: break-all;
  }
  .fab-area {
    position: fixed;
    right: 16px;
    bottom: 16px;
    z-index: 600;
  }
  .h16 {
    height: 16px;
  }
  .gap16 {
    width: 16px;
    flex-shrink: 0;
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
