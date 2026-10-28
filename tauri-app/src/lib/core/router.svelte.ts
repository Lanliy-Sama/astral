/**
 * 应用内路由 — 对应 Navigator.push(MaterialPageRoute)
 * 桌面平台: fade+scale (ZoomPageTransitionsBuilder)
 * 移动/小窗: 底部滑入 300ms
 */
export type RouteName =
  | 'natTest'
  | 'magicWall'
  | 'portWhitelist'
  | 'startup'
  | 'softwareSettings'
  | 'updateSettings'
  | 'logs'
  | 'historyVersions'
  | 'networkSettings'
  | 'vpnSegment'
  | 'listenList'

export interface AppRoute {
  name: RouteName
  params?: Record<string, any>
}

class Router {
  stack = $state<AppRoute[]>([])

  get current(): AppRoute | null {
    return this.stack.length > 0 ? this.stack[this.stack.length - 1] : null
  }

  push(name: RouteName, params?: Record<string, any>) {
    this.stack = [...this.stack, { name, params }]
  }

  pop() {
    this.stack = this.stack.slice(0, -1)
  }

  popAll() {
    this.stack = []
  }
}

export const router = new Router()
