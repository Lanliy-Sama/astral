/**
 * Svelte actions — 复刻 Flutter 的 InkWell 涟漪与 Tooltip 行为
 */
import type { Action } from 'svelte/action'

/**
 * InkWell 涟漪效果。
 * 用法: <div use:ripple={{ radius: 20 }}>
 * 可通过 CSS 变量 --ripple-color 自定义涟漪颜色(对应 splashColor)。
 */
export const ripple: Action<HTMLElement, { radius?: number } | undefined> = (
  node,
  params,
) => {
  let radius = params?.radius ?? 0
  let ink: HTMLElement | null = null
  let timer: ReturnType<typeof setTimeout> | null = null

  function destroy() {
    if (ink) {
      const el = ink
      el.classList.add('fade-out')
      setTimeout(() => el.remove(), 300)
      ink = null
    }
    if (timer) clearTimeout(timer)
  }

  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0) return
    destroy()
    const rect = node.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height)
    const el = document.createElement('span')
    el.className = 'ripple-ink'
    const r = radius || size
    el.style.width = el.style.height = `${r * 2}px`
    el.style.left = `${e.clientX - rect.left - r}px`
    el.style.top = `${e.clientY - rect.top - r}px`
    node.appendChild(el)
    ink = el
    // 800ms 后自动消散
    timer = setTimeout(() => destroy(), 800)
  }

  node.addEventListener('pointerdown', onPointerDown)
  return {
    update(p) {
      radius = p?.radius ?? 0
    },
    destroy() {
      node.removeEventListener('pointerdown', onPointerDown)
      destroy()
    },
  }
}

/**
 * Flutter Tooltip — 悬停 500ms 后出现, 出现在组件下方居中。
 * 用法: <button use:tooltip={'删除房间'}>
 */
export const tooltip: Action<HTMLElement, string | undefined> = (node, text) => {
  let label = text
  let el: HTMLElement | null = null
  let showTimer: ReturnType<typeof setTimeout> | null = null
  let hideTimer: ReturnType<typeof setTimeout> | null = null

  function show() {
    if (!label || el) return
    el = document.createElement('div')
    el.className = 'flutter-tooltip'
    el.textContent = label
    document.body.appendChild(el)
    const rect = node.getBoundingClientRect()
    const tw = el.offsetWidth
    let left = rect.left + rect.width / 2 - tw / 2
    left = Math.max(4, Math.min(left, window.innerWidth - tw - 4))
    let top = rect.bottom + 6
    if (top + el.offsetHeight > window.innerHeight - 4) {
      top = rect.top - el.offsetHeight - 6
    }
    el.style.left = `${left}px`
    el.style.top = `${top}px`
    requestAnimationFrame(() => el?.classList.add('visible'))
  }

  function hide() {
    if (showTimer) clearTimeout(showTimer)
    if (hideTimer) clearTimeout(hideTimer)
    if (el) {
      const e = el
      e.classList.remove('visible')
      hideTimer = setTimeout(() => e.remove(), 160)
      el = null
    }
  }

  function onEnter() {
    if (!label) return
    showTimer = setTimeout(show, 500)
  }
  function onLeave() {
    if (showTimer) clearTimeout(showTimer)
    hide()
  }

  node.addEventListener('mouseenter', onEnter)
  node.addEventListener('mouseleave', onLeave)
  node.addEventListener('focusin', onEnter)
  node.addEventListener('focusout', onLeave)

  return {
    update(t: string | undefined) {
      label = t
      if (!t) hide()
    },
    destroy() {
      hide()
      node.removeEventListener('mouseenter', onEnter)
      node.removeEventListener('mouseleave', onLeave)
      node.removeEventListener('focusin', onEnter)
      node.removeEventListener('focusout', onLeave)
    },
  }
}

/**
 * 弹层锚点定位工具: 将弹层(menu/dialog)锚定到目标元素下方/指定位置
 */
export function positionBelow(
  anchor: HTMLElement,
  floating: HTMLElement,
  offset = 4,
  align: 'start' | 'end' | 'center' = 'start',
): { left: number; top: number } {
  const r = anchor.getBoundingClientRect()
  const fw = floating.offsetWidth
  let left = r.left
  if (align === 'center') left = r.left + r.width / 2 - fw / 2
  if (align === 'end') left = r.right - fw
  left = Math.max(8, Math.min(left, window.innerWidth - fw - 8))
  let top = r.bottom + offset
  if (top + floating.offsetHeight > window.innerHeight - 8) {
    top = Math.max(8, r.top - floating.offsetHeight - offset)
  }
  return { left, top }
}
