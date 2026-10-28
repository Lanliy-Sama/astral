<script lang="ts">
  // M3 TextField (OutlineInputBorder) — 56 高 / 圆角 4 / 浮动 label 断开上边框 (fieldset/legend 原生缺口)
  // 对应 Flutter InputDecoration(floatingLabelBehavior: always/floatingLabelBehavior.auto)
  import Icon from './Icon.svelte'

  let {
    value = $bindable(''),
    label,
    hint,
    prefixIcon,
    suffixIcon,
    iconSize = 24,
    errorText,
    helperText,
    disabled = false,
    floatAlways = false,
    type = 'text',
    textarea = false,
    rows = 3,
    autofocus = false,
    maxlength,
    align = 'start',
    inputmode,
    oninput,
    onchange,
    onenter,
  }: {
    value?: string
    label?: string
    hint?: string
    prefixIcon?: string
    suffixIcon?: string
    iconSize?: number
    errorText?: string
    helperText?: string
    disabled?: boolean
    floatAlways?: boolean
    type?: string
    textarea?: boolean
    rows?: number
    autofocus?: boolean
    maxlength?: number
    align?: 'start' | 'end'
    inputmode?: string
    oninput?: (v: string) => void
    onchange?: (v: string) => void
    onenter?: (e: Event) => void
  } = $props()

  let focused = $state(false)

  // Flutter: label 浮起 = 聚焦 || 有值 || floatingLabelBehavior.always (hint 不影响浮起)
  let floated = $derived(focused || value !== '' || floatAlways)
  // Flutter: hintText 仅在聚焦时显示
  let showHint = $derived(focused ? hint : '')
  let isError = $derived(!!errorText)
  let hasLabel = $derived(!!label)
</script>

<div class="m3-textfield" class:disabled class:is-error={isError} class:no-label={!hasLabel}>
  <fieldset
    class="container"
    class:focused
    class:floated
    class:multiline={textarea}
    class:has-prefix={!!prefixIcon}
    aria-hidden="true"
  >
    {#if hasLabel && floated}
      <legend class="lbl" class:is-error={isError}>{label}</legend>
    {/if}
    <div class="inner">
      {#if prefixIcon}
        <div class="icon-slot">
          <Icon name={prefixIcon} size={iconSize} color="var(--md-sys-color-primary)" />
        </div>
      {/if}
      <div class="field-area">
        {#if hasLabel && !floated}
          <span class="ghost" class:is-error={isError}>{label}</span>
        {/if}
        {#if textarea}
          <textarea
            bind:value
            {rows}
            {disabled}
            {autofocus}
            {maxlength}
            placeholder={showHint}
            onfocus={() => (focused = true)}
            onblur={() => (focused = false)}
            oninput={(e) => oninput?.((e.target as HTMLTextAreaElement).value)}
            onchange={(e) => onchange?.((e.target as HTMLTextAreaElement).value)}
          ></textarea>
        {:else}
          <input
            bind:value
            {type}
            {disabled}
            {autofocus}
            {maxlength}
            {inputmode}
            placeholder={showHint}
            style="text-align:{align}"
            onfocus={() => (focused = true)}
            onblur={() => (focused = false)}
            oninput={(e) => oninput?.((e.target as HTMLInputElement).value)}
            onchange={(e) => onchange?.((e.target as HTMLInputElement).value)}
            onkeydown={(e) => {
              if (e.key === 'Enter') onenter?.(e)
            }}
          />
        {/if}
      </div>
      {#if suffixIcon}
        <div class="icon-slot">
          <Icon name={suffixIcon} size={iconSize} color="var(--md-sys-color-primary)" />
        </div>
      {/if}
    </div>
  </fieldset>
  {#if errorText}
    <div class="support error">{errorText}</div>
  {:else if helperText}
    <div class="support">{helperText}</div>
  {/if}
</div>

<style>
  .m3-textfield {
    position: relative;
    width: 100%;
    min-width: 0;
  }
  /* fieldset: 原生 legend 缺口 = Flutter OutlineInputBorder 的 label 断边 */
  .container {
    margin: 0;
    padding: 0;
    border: 1px solid var(--md-sys-color-outline);
    border-radius: 4px;
    height: 56px;
    min-width: 0;
    width: 100%;
    position: relative;
    background: transparent;
    transition: border-color 0.1s ease;
    display: block;
    box-sizing: border-box;
  }
  .container.multiline {
    height: auto;
    min-height: 56px;
  }
  .container.focused {
    border: 2px solid var(--md-sys-color-primary);
  }
  .m3-textfield.is-error .container {
    border-color: var(--md-sys-color-error);
  }
  .m3-textfield.is-error .container.focused {
    border: 2px solid var(--md-sys-color-error);
  }
  .m3-textfield.disabled .container {
    border: 1px solid color-mix(in srgb, var(--md-sys-color-on-surface) 12%, transparent);
    background: color-mix(in srgb, var(--md-sys-color-on-surface) 4%, transparent);
  }
  /* 浮起标签: 落在边框线上, 原生断开描边。
     float 使 legend 脱离流(不占内容空间) + 负 margin 上提贴线 */
  .lbl {
    display: block;
    padding: 0 4px;
    margin-left: 12px;
    margin-top: -9px;
    float: left;
    font-size: 12px;
    line-height: 16px;
    height: 16px;
    color: var(--md-sys-color-on-surface-variant);
    white-space: nowrap;
    max-width: calc(100% - 24px);
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .container.has-prefix .lbl {
    margin-left: 0;
  }
  .container.focused .lbl {
    color: var(--md-sys-color-primary);
  }
  .lbl.is-error {
    color: var(--md-sys-color-error);
  }
  .m3-textfield.disabled .lbl {
    color: color-mix(in srgb, var(--md-sys-color-on-surface) 60%, transparent);
  }
  /* 未浮起标签: 作为占位文字显示在框内 */
  .ghost {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 16px;
    line-height: 24px;
    color: var(--md-sys-color-on-surface-variant);
    pointer-events: none;
    white-space: nowrap;
    max-width: calc(100% - 8px);
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ghost.is-error {
    color: var(--md-sys-color-error);
  }
  .m3-textfield.disabled .ghost {
    color: color-mix(in srgb, var(--md-sys-color-on-surface) 60%, transparent);
  }
  /* 内容行: 流式布局。固定 54px(56-2边框) 避开 fieldset 百分比高度怪癖;
     legend 已 float 脱离流 → 无需补偿 */
  .inner {
    display: flex;
    align-items: center;
    height: 54px;
  }
  .container.multiline .inner {
    height: auto;
  }
  .icon-slot {
    width: 48px;
    padding: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    align-self: stretch;
  }
  .field-area {
    flex: 1;
    position: relative;
    min-width: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding-right: 12px;
  }
  .container:not(.has-prefix) .field-area {
    padding-left: 12px;
  }
  input,
  textarea {
    width: 100%;
    border: none;
    background: transparent;
    font-size: 16px;
    line-height: 24px;
    color: var(--md-sys-color-on-surface);
    padding: 0;
    outline: none;
    font-family: inherit;
  }
  ::placeholder {
    color: var(--md-sys-color-on-surface-variant);
    opacity: 1;
  }
  textarea {
    min-height: 88px;
    resize: vertical;
  }
  .m3-textfield.disabled input,
  .m3-textfield.disabled textarea {
    color: color-mix(in srgb, var(--md-sys-color-on-surface) 38%, transparent);
  }
  .support {
    font-size: 12px;
    line-height: 16px;
    padding: 4px 16px 0;
    color: var(--md-sys-color-on-surface-variant);
  }
  .support.error {
    color: var(--md-sys-color-error);
  }
</style>
