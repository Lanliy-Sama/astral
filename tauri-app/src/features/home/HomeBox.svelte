<script lang="ts">
  // HomeBox — 对应 home_box.dart: Card + hover 边框 + 内容 padding 12
  import Card from '../../lib/ui/Card.svelte'

  let {
    widthSpan = 2,
    children,
  }: {
    widthSpan?: number
    children?: import('svelte').Snippet
  } = $props()
</script>

<div class="home-box" style="grid-column: span {Math.min(widthSpan, 2)}">
  <Card radius={8} margin="none" elevation={1} class="hb-card">
    <div class="hb-hover-border"></div>
    <div class="hb-content">
      {@render children?.()}
    </div>
  </Card>
</div>

<style>
  .home-box {
    min-width: 0;
  }
  .hb-card {
    height: 100%;
  }
  .hb-hover-border {
    position: absolute;
    inset: 0;
    border: 1px solid var(--md-sys-color-primary);
    border-radius: 8px;
    opacity: 0;
    transition: opacity 0.1s ease;
    pointer-events: none;
    z-index: 1;
  }
  .home-box:hover .hb-hover-border {
    opacity: 1;
  }
  .hb-content {
    padding: 12px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }
</style>
