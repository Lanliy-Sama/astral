<script lang="ts">
  // Divider — M3: 1px outlineVariant, 支持 indent/endIndent
  let {
    height = 16,
    indent = 0,
    endIndent = 0,
    thickness = 1,
    color,
  }: {
    height?: number
    indent?: number
    endIndent?: number
    thickness?: number
    color?: string
  } = $props()
</script>

<div
  style="height:{height}px; display:flex; align-items:center; flex-shrink:0;"
>
  <div
    style="height:{thickness}px; background: {color ||
      'var(--md-sys-color-outline-variant)'}; margin-left:{indent}px; margin-right:{endIndent}px; width: calc(100% - {indent + endIndent}px);"
  ></div>
</div>
