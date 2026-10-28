<script lang="ts">
  // HitokotoCard — 对应 hitokoto_card.dart: 一言卡 (v1.hitokoto.cn)
  import { onMount } from 'svelte'
  import HomeBox from './HomeBox.svelte'
  import Icon from '../../lib/ui/Icon.svelte'
  import Progress from '../../lib/ui/Progress.svelte'

  let hitokoto = $state('加载中...')
  let from = $state('')
  let isLoading = $state(true)

  async function load() {
    isLoading = true
    hitokoto = '加载中...'
    from = ''
    try {
      const controller = new AbortController()
      const t = setTimeout(() => controller.abort(), 10000)
      const res = await fetch('https://v1.hitokoto.cn/', { signal: controller.signal })
      clearTimeout(t)
      if (res.status === 200) {
        const data = await res.json()
        hitokoto = data.hitokoto ?? '暂无内容'
        from = data.from ?? '未知来源'
      } else {
        hitokoto = '获取失败'
        from = ''
      }
    } catch {
      hitokoto = '网络错误'
      from = ''
    }
    isLoading = false
  }

  onMount(load)
</script>

<HomeBox>
  <div class="header">
    <Icon name="format_quote" size={22} color="var(--md-sys-color-primary)" />
    <span class="title">一言</span>
    <span class="spacer"></span>
    <button class="refresh" onclick={() => isLoading || load()} title="刷新一言">
      <Icon name="refresh" size={18} color="var(--md-sys-color-primary)" />
    </button>
  </div>
  <div class="gap16"></div>

  {#if isLoading}
    <div class="loading">
      <Progress circular size={16} strokeWidth={2} />
      <span class="loading-text">加载中...</span>
    </div>
  {:else}
    <div class="content">
      <div class="hitokoto">{hitokoto}</div>
      {#if from}
        <div class="from">—— {from}</div>
      {/if}
    </div>
  {/if}
</HomeBox>

<style>
  .header {
    display: flex;
    align-items: center;
    gap: 8px;
    align-self: stretch;
  }
  .title {
    font-size: 18px;
    font-weight: 400;
  }
  .spacer {
    flex: 1;
  }
  .refresh {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .refresh:hover {
    background: color-mix(in srgb, var(--md-sys-color-primary) 8%, transparent);
  }
  .gap16 {
    height: 16px;
  }
  .loading {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .loading-text {
    font-size: 14px;
    color: color-mix(in srgb, var(--md-sys-color-on-surface) 60%, transparent);
  }
  .hitokoto {
    font-size: 14px;
    line-height: 19.6px;
    color: var(--md-sys-color-on-surface);
    word-break: break-word;
  }
  .from {
    margin-top: 6px;
    font-size: 12px;
    line-height: 16px;
    color: color-mix(in srgb, var(--md-sys-color-on-surface) 60%, transparent);
    font-style: italic;
  }
</style>
