<script lang="ts">
  // Material 图标 — 对应 Flutter Icon(Icons.xxx)
  import { createEventDispatcher } from 'svelte'

  let {
    name,
    size = 24,
    color,
    outlined = false,
    rotate = 0,
    onclick,
  }: {
    name: string
    size?: number
    color?: string
    outlined?: boolean
    rotate?: number
    onclick?: (e: MouseEvent) => void
  } = $props()

  const dispatch = createEventDispatcher<{ click: MouseEvent }>()
</script>

<span
  class={outlined ? 'material-icons-outlined' : 'material-icons'}
  style="font-size: {size}px; width: {size}px; height: {size}px;
    {color ? `color: ${color};` : ''}
    {rotate ? `transform: rotate(${rotate}rad);` : ''}"
  onclick={(e) => {
    onclick?.(e)
    dispatch('click', e)
  }}>​{name}</span
>
