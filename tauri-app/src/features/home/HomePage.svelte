<script lang="ts">
  // HomePage — 对应 home_page.dart: StaggeredGrid + ConnectButton FAB
  import UserIpBox from './UserIpBox.svelte'
  import QuickNetworkConfig from './QuickNetworkConfig.svelte'
  import AboutHome from './AboutHome.svelte'
  import HitokotoCard from './HitokotoCard.svelte'
  import ConnectButton from './ConnectButton.svelte'
  import RoomSelectDialog from './RoomSelectDialog.svelte'
  import NpcapDialog from './NpcapDialog.svelte'

  let columnCount = $state(getColumns())

  function getColumns(): number {
    const w = window.innerWidth
    if (w >= 1200) return 5
    if (w >= 900) return 4
    if (w >= 600) return 3
    return 2
  }

  function onResize() {
    columnCount = getColumns()
  }
</script>

<svelte:window onresize={onResize} />

<div class="home-scroll">
  <div class="grid" style="grid-template-columns: repeat({columnCount}, 1fr)">
    <UserIpBox />
    <QuickNetworkConfig />
    <AboutHome />
    <HitokotoCard />
    <div style="grid-column: span {columnCount}; height: 100px"></div>
  </div>
</div>

<ConnectButton />
<RoomSelectDialog />
<NpcapDialog />

<style>
  .home-scroll {
    height: 100%;
    overflow-y: auto;
    padding: 14px;
  }
  .grid {
    display: grid;
    gap: 8px;
    align-items: start;
  }
</style>
