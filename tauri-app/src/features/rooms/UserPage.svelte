<script lang="ts">
  // UserPage — 对应 user_page.dart: 用户/节点列表 + 拓扑图切换 + 房间设置
  import { onMount } from 'svelte'
  import Fab from '../../lib/ui/Fab.svelte'
  import Icon from '../../lib/ui/Icon.svelte'
  import { services } from '../../lib/core/services/services.svelte'
  import ListUserCard from './ListUserCard.svelte'
  import MiniUserCard from './MiniUserCard.svelte'
  import AllUserCard from './AllUserCard.svelte'
  import TopologyView from './TopologyView.svelte'
  import { userPageSheets } from './userPageSheets.svelte.ts'
  import type { KVNodeInfo } from '../../core/models/types'
  import { isServerNode } from '../../lib/utils/uiHelpers'

  const s = services()

  let showTopology = $state(false)

  let nodes = $derived(s.connectionState.netStatus?.nodes ?? [])
  let state = $derived(s.connectionState.connectionState)
  let localIp = $derived(s.networkConfigState.ipv4)

  // 过滤 + 排序 (displayState)
  let filtered = $derived.by(() => {
    let list = [...nodes]
    if (s.displayState.displayMode === 'users') list = list.filter((n) => !isServerNode(n))
    else if (s.displayState.displayMode === 'servers') list = list.filter((n) => isServerNode(n))
    const opt = s.displayState.sortOption
    const order = s.displayState.sortOrder === 'ascending' ? 1 : -1
    if (opt === 'latency') {
      list.sort((a, b) => (a.latencyMs - b.latencyMs) * order)
    } else if (opt === 'nameLength') {
      list.sort((a, b) => (a.hostname.length - b.hostname.length) * order)
    }
    return list
  })

  let columnCount = $state(getColumns())
  function getColumns(): number {
    const w = window.innerWidth
    if (w >= 1200) return 3
    if (w >= 900) return 2
    return 1
  }
</script>

<svelte:window onresize={() => (columnCount = getColumns())} />

<div class="user-page">
  {#if state !== 'connected'}
    <!-- 未连接空态 -->
    <div class="empty">
      <Icon name="cloud_off_rounded" size={48} color="var(--md-sys-color-primary)" />
      <div class="gap16"></div>
      <div class="empty-title">无数据</div>
    </div>
  {:else if showTopology && nodes.length > 0}
    <TopologyView {nodes} />
  {:else if nodes.length === 0}
    <!-- 无成员空态 -->
    <div class="empty">
      <Icon
        name="people_outline"
        size={64}
        color="color-mix(in srgb, var(--md-sys-color-primary) 60%, transparent)"
      />
      <div class="gap16"></div>
      <div class="empty-title">房间内暂无成员</div>
      <div class="gap8"></div>
      <div class="empty-sub">当前没有其他玩家连接到房间</div>
    </div>
  {:else}
    <div class="scroll" class:list-mode={s.displayState.userListStyle === 'list'}>
      {#if s.displayState.userListStyle === 'list'}
        <div class="list-container">
          {#each filtered as node (node.peerId + node.ipv4)}
            <ListUserCard {node} {localIp} showDivider={filtered.indexOf(node) < filtered.length - 1} />
          {/each}
        </div>
      {:else}
        <div class="grid" style="grid-template-columns: repeat({columnCount}, 1fr)">
          {#each filtered as node (node.peerId + node.ipv4)}
            {#if s.displayState.userListStyle === 'simple'}
              <MiniUserCard {node} {localIp} />
            {:else}
              <AllUserCard {node} {localIp} />
            {/if}
          {/each}
        </div>
      {/if}
    </div>
  {/if}

  <!-- FAB 列: 拓扑切换 / 房间设置 (对应 Flutter Scaffold.floatingActionButton, 始终显示) -->
  <div class="fabs">
    <Fab
      icon={showTopology ? 'list' : 'hub'}
      tip={showTopology ? '列表视图' : '拓扑图'}
      onclick={() => (showTopology = !showTopology)}
    />
    <div class="fab-gap"></div>
    <Fab icon="bar_chart" tip="房间设置" onclick={() => userPageSheets.openSettings()} />
  </div>
</div>

<style>
  .user-page {
    height: 100%;
    position: relative;
  }
  .empty {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .empty-title {
    font-size: 18px;
    font-weight: 700;
    color: var(--md-sys-color-primary);
  }
  .empty-sub {
    color: color-mix(in srgb, var(--md-sys-color-on-surface) 70%, transparent);
  }
  .gap16 {
    height: 16px;
  }
  .gap8 {
    height: 8px;
  }
  .scroll {
    height: 100%;
    overflow-y: auto;
  }
  .grid {
    display: grid;
    gap: 8px;
    align-items: start;
    padding: 12px 0;
  }
  .list-container {
    padding: 8px 8px 8px 8px;
  }
  .fabs {
    position: absolute;
    right: 16px;
    bottom: 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    z-index: 10;
  }
  .fab-gap {
    height: 16px;
  }
</style>
