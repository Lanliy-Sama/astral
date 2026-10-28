import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'

const app = mount(App, {
  target: document.getElementById('app')!,
})

// 开发模式调试钩子 (仅 DEV 生效, 便于自动化测试与深度调试)
if (import.meta.env.DEV) {
  import('./lib/core/services/services.svelte').then((m) => {
    ;(window as any).__astral = {
      services: m.services,
      router: null,
    }
  })
  import('./lib/core/router.svelte').then((m) => {
    if ((window as any).__astral) (window as any).__astral.router = m.router
  })
}

export default app
