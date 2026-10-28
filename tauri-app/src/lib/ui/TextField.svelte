<script lang="ts">
  // M3 TextField (OutlineInputBorder) — 56 高 / 圆角 4 / 浮动 label / 前后缀图标 / 错误与帮助文本
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

  let floated = $derived(focused || value !== '' || !!hint || floatAlways)
  let isError = $derived(!!errorText)
  let hasLabel = $derived(!!label)
</script>

<div class="m3-textfield" class:disabled class:is-error={isError} class:no-label={!hasLabel}>
  <div class="container" class:focused style="border-radius: 4px;">
    {#if prefixIcon}
      <div class="icon-slot">
        <Icon name={prefixIcon} size={iconSize} color="var(--md-sys-color-primary)" />
      </div>
    {/if}
    <div class="field-area">
      {#if label}
        <label class:floated class:is-error={isError}>{label}</label>
      {/if}
      {#if textarea}
        <textarea
          bind:value
          {rows}
          {disabled}
          {autofocus}
          {maxlength}
          placeholder={hint}
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
          placeholder={hint}
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
  }
  .container {
    position: relative;
    display: flex;
    align-items: center;
    min-height: 56px;
    background: transparent;
    border: 1px solid var(--md-sys-color-outline);
    transition: border 0.1s ease;
  }
  .container.focused {
    border: 2px solid var(--md-sys-color-primary);
  }
  .m3-textfield.is-error .container {
    border: 2px solid var(--md-sys-color-error);
  }
  .m3-textfield.disabled .container {
    border: 1px solid color-mix(in srgb, var(--md-sys-color-on-surface) 12%, transparent);
    background: color-mix(in srgb, var(--md-sys-color-on-surface) 4%, transparent);
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
    padding: 0 12px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  label {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 16px;
    line-height: 24px;
    color: var(--md-sys-color-on-surface-variant);
    pointer-events: none;
    transition: all 0.15s ease;
    white-space: nowrap;
    max-width: calc(100% - 8px);
    overflow: hidden;
    text-overflow: ellipsis;
  }
  label.floated {
    top: 16px;
    font-size: 12px;
    line-height: 16px;
  }
  input,
  textarea {
    width: 100%;
    border: none;
    background: transparent;
    font-size: 16px;
    line-height: 24px;
    color: var(--md-sys-color-on-surface);
    padding: 24px 0 4px;
    outline: none;
    font-family: inherit;
  }
  .no-label input,
  .no-label textarea {
    padding-top: 0;
    padding-bottom: 0;
  }
  textarea {
    min-height: 88px;
    resize: vertical;
  }
  .container.focused label {
    color: var(--md-sys-color-primary);
  }
  label.is-error {
    color: var(--md-sys-color-error);
  }
  .m3-textfield.disabled label {
    color: color-mix(in srgb, var(--md-sys-color-on-surface) 60%, transparent);
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
