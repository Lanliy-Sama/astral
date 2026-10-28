<script lang="ts">
  // HistoryVersionsPage — 对应 history_versions_page.dart (astral.fan/downloads.json)
  import { onMount } from 'svelte'
  import BaseSettingsPage from './BaseSettingsPage.svelte'
  import Card from '../../lib/ui/Card.svelte'
  import IconButton from '../../lib/ui/IconButton.svelte'
  import Icon from '../../lib/ui/Icon.svelte'
  import Button from '../../lib/ui/Button.svelte'
  import Progress from '../../lib/ui/Progress.svelte'
  import { snackbar } from '../../lib/ui/snackbar.svelte.ts'
  import type { HistoryVersion } from '../../lib/core/models/types'

  let versions = $state<HistoryVersion[] | null>(null)
  let loading = $state(true)
  let errorText = $state('')

  async function load() {
    loading = true
    errorText = ''
    versions = null
    try {
      const controller = new AbortController()
      const t = setTimeout(() => controller.abort(), 15000)
      const res = await fetch('https://astral.fan/downloads.json', { signal: controller.signal })
      clearTimeout(t)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      versions = await res.json()
    } catch (e: any) {
      errorText = String(e?.message ?? e)
    }
    loading = false
  }

  onMount(load)
</script>

<BaseSettingsPage title="历史版本">
  {#snippet actions()}
    <IconButton icon="refresh" size={40} padding={8} tip="刷新" onclick={load} />
  {/snippet}

  {#if loading}
    <div class="center">
      <Progress circular size={36} strokeWidth={4} />
    </div>
  {:else if errorText}
    <div class="center col">
      <Icon name="error_outline" size={64} color="#F44336" />
      <div class="h16"></div>
      <div class="err-text">加载失败： {errorText}</div>
      <div class="h16"></div>
      <Button variant="elevated" icon="refresh" onclick={load}>重试</Button>
    </div>
  {:else if !versions || versions.length === 0}
    <div class="center"><span class="empty-text">暂无历史版本</span></div>
  {:else}
    <div class="list">
      {#each versions as v, i (v.version)}
        <Card radius={12} margin="0 0 12px 0">
          <div
            class="version-item"
            onclick={() => {
              const win = window.open(v.url, '_blank')
              if (!win) snackbar.show({ title: '无法打开链接', message: v.url, type: 'error' })
            }}
          >
            <div class="avatar">{i + 1}</div>
            <div class="v-text">
              <div class="v-version">{v.version}</div>
              <div class="v-date">{v.date}</div>
            </div>
            <Icon name="download" size={24} color="var(--md-sys-color-primary)" />
          </div>
        </Card>
      {/each}
    </div>
  {/if}
</BaseSettingsPage>

<style>
  .center {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .center.col {
    flex-direction: column;
  }
  .err-text {
    font-size: 16px;
    text-align: center;
  }
  .empty-text {
    font-size: 16px;
  }
  .list {
    padding: 16px;
  }
  .version-item {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 4px 16px;
    min-height: 72px;
    cursor: pointer;
  }
  .avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--md-sys-color-primary-container);
    color: var(--md-sys-color-on-primary-container);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    flex-shrink: 0;
  }
  .v-text {
    flex: 1;
    min-width: 0;
  }
  .v-version {
    font-size: 16px;
    font-weight: 600;
  }
  .v-date {
    font-size: 14px;
    color: var(--md-sys-color-on-surface-variant);
  }
  .h16 {
    height: 16px;
  }
</style>
