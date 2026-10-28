<script lang="ts">
  // TopologyView — 对应 network_topology*.dart (vyuh_node_flow 画布的自绘等价实现)
  // 确定性轨道布局: 本机左列居中, 其余右列每行一个, 中继在两点间等分插入
  import { onMount, onDestroy } from 'svelte'
  import Icon from '../../lib/ui/Icon.svelte'
  import { services } from '../../lib/core/services/services.svelte'
  import { readColorRole, withAlpha } from '../../lib/theme/scheme'
  import {
    isServerNode,
    displayName,
    parsePlatform,
    latencyColor,
  } from '../../lib/utils/uiHelpers'
  import type { KVNodeInfo } from '../../core/models/types'

  let { nodes = $bindable() }: { nodes: KVNodeInfo[] } = $props()

  const s = services()

  const LOCAL_X = 120
  const TARGET_X = 760
  const BASE_Y = 80
  const ROW_GAP = 130

  // 视图变换 (zoom 0.3-2.0, 可平移)
  let view = $state({ x: 40, y: 0, scale: 0.9 })

  interface TNode {
    id: string
    type: 'local' | 'server' | 'player' | 'relay'
    x: number
    y: number
    displayName: string
    ip: string | null
    platform: string
    latency: number
  }
  interface TConn {
    id: string
    source: string
    target: string
    label: string
  }

  let graph = $state<{ nodes: TNode[]; conns: TConn[] }>({ nodes: [], conns: [] })
  let dense = $derived(nodes.length >= 12)
  let nodeWidth = $derived(dense ? 186 : 220)

  // 结构签名: 结构不变时保留位置(用户拖动)
  let dragPositions = new Map<string, { x: number; y: number }>()

  function safeId(key: string): string {
    return key.replace(/[^A-Za-z0-9_]/g, '_')
  }

  function nodeKey(n: KVNodeInfo): string {
    if (n.peerId > 0) return `peer_${n.peerId}`
    return n.ipv4 ? `ip_${n.ipv4}` : `name_${safeId(n.hostname)}`
  }

  function buildGraph() {
    const localIp = s.networkConfigState.ipv4
    const local = nodes.find((n) => localIp && n.ipv4 === localIp) ?? nodes[0]
    const others = nodes.filter((n) => n !== local)
    const servers = others
      .filter((n) => isServerNode(n))
      .sort((a, b) => a.peerId - b.peerId)
    const players = others
      .filter((n) => !isServerNode(n))
      .sort((a, b) => a.peerId - b.peerId)

    const spacer = servers.length > 0 && players.length > 0 ? 1 : 0
    const totalRows = servers.length + spacer + players.length
    const localY = totalRows <= 1 ? 250 : BASE_Y + ((totalRows - 1) * ROW_GAP) / 2

    const tnodes: TNode[] = []
    const tconns: TConn[] = []

    const mk = (
      key: string,
      type: TNode['type'],
      x: number,
      y: number,
      n: KVNodeInfo | null,
      name: string,
    ): TNode => {
      const saved = dragPositions.get(key)
      const node: TNode = {
        id: key,
        type,
        x: saved?.x ?? x,
        y: saved?.y ?? y,
        displayName: name,
        ip:
          n && n.ipv4 && n.ipv4 !== '0.0.0.0' && !isServerNode(n)
            ? n.ipv4
            : n === local
              ? n.ipv4 || null
              : n && !isServerNode(n)
                ? n.ipv4 || null
                : null,
        platform:
          type === 'relay'
            ? 'Relay'
            : n
              ? parsePlatform(n.version).name
              : '',
        latency: n ? Math.round(n.latencyMs) : 0,
      }
      return node
    }

    tnodes.push(
      mk(nodeKey(local), 'local', LOCAL_X, localY, local, displayName(local)),
    )

    const rowOf = new Map<string, number>()
    let row = 0
    for (const n of servers) {
      rowOf.set(nodeKey(n), row)
      tnodes.push(mk(nodeKey(n), 'server', TARGET_X, BASE_Y + row * ROW_GAP, n, displayName(n)))
      row++
    }
    row += spacer
    for (const n of players) {
      rowOf.set(nodeKey(n), row)
      tnodes.push(mk(nodeKey(n), 'player', TARGET_X, BASE_Y + row * ROW_GAP, n, displayName(n)))
      row++
    }

    // 连线 (含中继 hop 节点)
    for (const n of [...servers, ...players]) {
      const targetKey = nodeKey(n)
      const targetRow = rowOf.get(targetKey) ?? 0
      const y = BASE_Y + targetRow * ROW_GAP
      const hops = n.hops ?? []
      let prevKey = nodeKey(local)
      if (hops.length === 0) {
        tconns.push({
          id: `conn_${prevKey}_to_${targetKey}`,
          source: prevKey,
          target: targetKey,
          label: `${Math.round(n.latencyMs)}ms`,
        })
      } else {
        hops.forEach((h, i) => {
          const name = h.nodeName?.trim() || `relay_${h.targetIp}`
          const key = `relay_${safeId(name)}_${targetKey}_${i}`
          const x = LOCAL_X + ((TARGET_X - LOCAL_X) / (hops.length + 1)) * (i + 1)
          tnodes.push(mk(key, 'relay', x, y, null, name))
          tconns.push({
            id: `conn_${prevKey}_to_${key}`,
            source: prevKey,
            target: key,
            label: `${Math.round(h.latencyMs)}ms`,
          })
          prevKey = key
        })
        tconns.push({
          id: `conn_${prevKey}_to_${targetKey}`,
          source: prevKey,
          target: targetKey,
          label: `${Math.round(n.latencyMs)}ms`,
        })
      }
    }

    graph = { nodes: tnodes, conns: tconns }
  }

  // 结构同步节流: reduceUpdates → 4s, 否则 1s
  let syncTimer: ReturnType<typeof setInterval> | null = null
  let lastSignature = ''

  function structureSignature(): string {
    return JSON.stringify(
      nodes.map((n) => ({
        p: n.peerId,
        h: n.hostname,
        i: n.ipv4,
        v: n.version,
        hops: n.hops?.map((h) => [h.peerId, h.targetIp, h.nodeName]),
      })),
    )
  }

  function sync() {
    const sig = structureSignature()
    if (sig !== lastSignature) {
      lastSignature = sig
      buildGraph()
    }
  }

  onMount(() => {
    buildGraph()
    lastSignature = structureSignature()
    const interval = s.appSettingsState.reduceAnimationUpdates ? 4000 : 1000
    syncTimer = setInterval(sync, interval)
    return () => {
      if (syncTimer) clearInterval(syncTimer)
    }
  })

  // 平移 + 缩放
  let panning = false
  let panStart = { x: 0, y: 0, vx: 0, vy: 0 }

  function onPointerDown(e: PointerEvent) {
    if ((e.target as HTMLElement).closest('.tp-node') || (e.target as HTMLElement).closest('.legend-card')) return
    panning = true
    panStart = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  function onPointerMove(e: PointerEvent) {
    if (!panning) return
    view = {
      ...view,
      x: panStart.vx + (e.clientX - panStart.x),
      y: panStart.vy + (e.clientY - panStart.y),
    }
  }
  function onPointerUp() {
    panning = false
  }
  function onWheel(e: WheelEvent) {
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.1 : 0.9
    const scale = Math.min(2.0, Math.max(0.3, view.scale * factor))
    view = { ...view, scale }
  }

  // 节点拖动
  let draggingNode: TNode | null = null

  function onNodePointerDown(e: PointerEvent, node: TNode) {
    e.stopPropagation()
    draggingNode = node
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  function onNodePointerMove(e: PointerEvent) {
    if (!draggingNode) return
    const dx = e.movementX / view.scale
    const dy = e.movementY / view.scale
    draggingNode.x += dx
    draggingNode.y += dy
    dragPositions.set(draggingNode.id, { x: draggingNode.x, y: draggingNode.y })
    graph = { ...graph }
  }
  function onNodePointerUp() {
    draggingNode = null
  }

  // 连线路径
  function connPath(c: TConn): string {
    const a = graph.nodes.find((n) => n.id === c.source)
    const b = graph.nodes.find((n) => n.id === c.target)
    if (!a || !b) return ''
    const x1 = a.x + nodeWidth
    const y1 = a.y + 28
    const x2 = b.x
    const y2 = b.y + 28
    const cx = (x1 + x2) / 2
    return `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`
  }

  const typeMeta = $derived({
    local: {
      bg: readColorRole('primaryContainer'),
      fg: readColorRole('onPrimaryContainer'),
      icon: 'computer',
    },
    server: {
      bg: readColorRole('tertiaryContainer'),
      fg: readColorRole('onTertiaryContainer'),
      icon: 'cloud',
    },
    player: {
      bg: readColorRole('secondaryContainer'),
      fg: readColorRole('onSecondaryContainer'),
      icon: 'person',
    },
    relay: {
      bg: readColorRole('surfaceContainerHighest'),
      fg: readColorRole('onSurfaceVariant'),
      icon: 'router',
    },
  })

  $effect(() => {
    // 主题变化时刷新 typeMeta (通过读取 data-theme)
    void document.documentElement.getAttribute('data-theme')
    void document.documentElement.getAttribute('data-seed')
  })

  let serverCount = $derived(graph.nodes.filter((n) => n.type === 'server').length)
  let playerCount = $derived(graph.nodes.filter((n) => n.type === 'player').length)

  function legendFg(hex: string): string {
    const h = hex.replace('#', '')
    const r = parseInt(h.slice(0, 2), 16)
    const g = parseInt(h.slice(2, 4), 16)
    const b = parseInt(h.slice(4, 6), 16)
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.6 ? '#ffffff' : '#DD000000'
  }
</script>

<div
  class="topology"
  onpointerdown={onPointerDown}
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
  onwheel={onWheel}
>
  <div class="canvas-bg"></div>
  <div
    class="canvas"
    style="transform: translate({view.x}px, {view.y}px) scale({view.scale}); transform-origin: 0 0;"
  >
    <!-- 连线 -->
    <svg class="conns">
      {#each graph.conns as c (c.id)}
        <path d={connPath(c)} class="conn" />
        <path d={connPath(c)} class="conn-particle" />
      {/each}
    </svg>
    <!-- 连线标签 -->
    {#each graph.conns as c (c.id)}
      {@const a = graph.nodes.find((n) => n.id === c.source)}
      {@const b = graph.nodes.find((n) => n.id === c.target)}
      {#if a && b}
        <div
          class="conn-label"
          style="left: {(a.x + nodeWidth + b.x) / 2}px; top: {(a.y + b.y) / 2 + 28 - 8}px;"
        >
          {c.label}
        </div>
      {/if}
    {/each}
    <!-- 节点 -->
    {#each graph.nodes as node (node.id)}
      <div
        class="tp-node"
        style="left: {node.x}px; top: {node.y}px; width: {nodeWidth}px;"
        onpointerdown={(e) => onNodePointerDown(e, node)}
        onpointermove={onNodePointerMove}
        onpointerup={onNodePointerUp}
      >
        <div class="node-head" style="background: {typeMeta[node.type].bg}; color: {typeMeta[node.type].fg};">
          <Icon name={typeMeta[node.type].icon} size={18} />
          <span class="gap6"></span>
          <span class="node-name ellipsis">{node.displayName}</span>
        </div>
        <div class="node-body">
          {#if dense}
            {#if node.latency > 0}
              <div class="node-line">
                <Icon name="speed" size={13} />
                <span class="gap4"></span>
                <span style="font-weight:700; color: {latencyColor(node.latency)}">{node.latency}ms</span>
              </div>
              <div class="gap4"></div>
            {/if}
            {#if node.ip}
              <div class="node-line">
                <Icon name="language" size={13} />
                <span class="gap4"></span>
                <span class="ellipsis">{node.ip}</span>
              </div>
            {/if}
          {:else}
            {#if node.ip}
              <div class="node-line">
                <Icon name="language" size={13} />
                <span class="gap4"></span>
                <span class="ellipsis">{node.ip}</span>
              </div>
              <div class="gap4"></div>
            {/if}
            {#if node.platform}
              <div class="node-line">
                <Icon name="devices" size={13} />
                <span class="gap4"></span>
                <span class="ellipsis">{node.platform}</span>
              </div>
            {/if}
            {#if node.latency > 0}
              <div class="gap4"></div>
              <div class="node-line">
                <Icon name="speed" size={13} />
                <span class="gap4"></span>
                <span style="font-weight:700; color: {latencyColor(node.latency)}">{node.latency}ms</span>
              </div>
            {/if}
          {/if}
        </div>
      </div>
    {/each}
  </div>

  <!-- 图例 -->
  <div class="legend-card">
    <div class="legend-title">Topology</div>
    <div class="gap6"></div>
    <div class="legend-items">
      <div class="legend-item">
        <span class="lg-icon" style="background: {typeMeta.local.bg}">
          <Icon name="computer" size={12} color={legendFg(typeMeta.local.bg)} />
        </span>
        <span class="gap4"></span>
        <span>Local</span>
      </div>
      <div class="legend-item">
        <span class="lg-icon" style="background: {typeMeta.server.bg}">
          <Icon name="cloud" size={12} color={legendFg(typeMeta.server.bg)} />
        </span>
        <span class="gap4"></span>
        <span>Server {serverCount}</span>
      </div>
      <div class="legend-item">
        <span class="lg-icon" style="background: {typeMeta.player.bg}">
          <Icon name="person" size={12} color={legendFg(typeMeta.player.bg)} />
        </span>
        <span class="gap4"></span>
        <span>Player {playerCount}</span>
      </div>
    </div>
    {#if serverCount > 0 && playerCount > 0}
      <div class="gap6"></div>
      <div class="legend-hint">Servers are above players.</div>
    {/if}
  </div>
</div>

<style>
  .topology {
    position: relative;
    height: 100%;
    overflow: hidden;
    background: var(--md-sys-color-surface);
    cursor: grab;
    touch-action: none;
  }
  .topology:active {
    cursor: grabbing;
  }
  /* 点阵网格 (间距 20) */
  .canvas-bg {
    position: absolute;
    inset: 0;
    background-image: radial-gradient(
      color-mix(in srgb, var(--md-sys-color-outline-variant) 80%, transparent) 1px,
      transparent 1px
    );
    background-size: 20px 20px;
  }
  .canvas {
    position: absolute;
    inset: 0;
    transform-origin: 0 0;
  }
  .conns {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
    pointer-events: none;
  }
  .conn {
    fill: none;
    stroke: color-mix(in srgb, var(--md-sys-color-primary) 60%, transparent);
    stroke-width: 2.5;
  }
  .conn-particle {
    fill: none;
    stroke: var(--md-sys-color-primary);
    stroke-width: 2.5;
    stroke-dasharray: 6 200;
    animation: particle 4s linear infinite;
    opacity: 0.9;
  }
  @keyframes particle {
    from {
      stroke-dashoffset: 0;
    }
    to {
      stroke-dashoffset: -206;
    }
  }
  .conn-label {
    position: absolute;
    font-size: 11px;
    line-height: 14px;
    background: var(--md-sys-color-surface);
    color: var(--md-sys-color-on-surface);
    padding: 0 4px;
    border-radius: 3px;
    transform: translateX(-50%);
    white-space: nowrap;
    pointer-events: none;
  }
  .tp-node {
    position: absolute;
    user-select: none;
    cursor: grab;
  }
  .node-head {
    display: flex;
    align-items: center;
    padding: 8px 10px;
    border-radius: 8px 8px 0 0;
  }
  .node-body {
    background: var(--md-sys-color-surface);
    border: 1px solid var(--md-sys-color-outline);
    border-radius: 0 0 8px 8px;
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }
  .node-name {
    font-size: 13px;
    font-weight: 700;
    flex: 1;
    min-width: 0;
  }
  .node-line {
    display: flex;
    align-items: center;
    max-width: 100%;
    font-size: 11px;
    line-height: 14px;
    color: var(--md-sys-color-on-surface);
  }
  .node-line .ellipsis {
    min-width: 0;
  }
  .gap4 {
    width: 4px;
    height: 4px;
    flex-shrink: 0;
  }
  .gap6 {
    width: 6px;
    height: 6px;
    flex-shrink: 0;
  }
  .legend-card {
    position: absolute;
    top: 12px;
    left: 12px;
    background: color-mix(in srgb, var(--md-sys-color-surface) 92%, transparent);
    border-radius: 12px;
    padding: 8px 10px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    z-index: 5;
  }
  .legend-title {
    font-weight: 700;
    font-size: 14px;
  }
  .legend-items {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 10px;
  }
  .legend-item {
    display: flex;
    align-items: center;
    font-size: 11px;
    color: var(--md-sys-color-on-surface);
  }
  .lg-icon {
    padding: 3px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .legend-hint {
    font-size: 11px;
    color: var(--md-sys-color-on-surface-variant);
  }
</style>
