/**
 * 更新服务 — 对应 UpdateService / UpdateChecker / GitHubProxySelector
 * GET https://api.github.com/repos/ldoubil/astral/releases?per_page=20 (15s 超时)
 */
import type { ReleaseInfo } from '../models/types'
import { services } from './services.svelte'

export const GITHUB_MIRRORS = ['https://gh.xmly.dev/', 'https://gh-proxy.org/', 'https://ghfast.top/']

export type UpdateCheckStatus = 'upToDate' | 'updateAvailable' | 'failed'

export interface UpdateCheckResult {
  status: UpdateCheckStatus
  version: string
  notes: string
  releasePage?: string
  releaseInfo?: ReleaseInfo
  error?: string
}

/** 比较版本号: latest > current ? (忽略 v 前缀, 逐段数字比较) */
export function isNewerVersion(latest: string, current: string): boolean {
  const norm = (v: string) => v.replace(/^v/i, '')
  const a = norm(latest).split(/[.\-+]/).filter(Boolean)
  const b = norm(current).split(/[.\-+]/).filter(Boolean)
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = parseInt(a[i] ?? '0') || 0
    const y = parseInt(b[i] ?? '0') || 0
    if (x > y) return true
    if (x < y) return false
  }
  return false
}

export class UpdateChecker {
  constructor(
    public owner = 'ldoubil',
    public repo = 'astral',
  ) {}

  async checkForUpdates(
    currentVersion: string,
    beta: boolean,
  ): Promise<UpdateCheckResult> {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15000)
      const res = await fetch(
        `https://api.github.com/repos/${this.owner}/${this.repo}/releases?per_page=20`,
        { signal: controller.signal },
      )
      clearTimeout(timeout)
      if (!res.ok) {
        return {
          status: 'failed',
          version: '检查更新失败',
          notes: `无法获取最新版本信息 (HTTP ${res.status})`,
        }
      }
      const releases = (await res.json()) as ReleaseInfo[]
      const valid = releases.filter((r) => beta || !r.prerelease).filter((r) => !r.draft)
      if (valid.length === 0) {
        return { status: 'failed', version: '检查更新失败', notes: '无法解析版本号' }
      }
      const latest = valid[0]
      const latestVersion = latest.tag_name.replace(/^v/i, '')
      if (isNewerVersion(latestVersion, currentVersion)) {
        return {
          status: 'updateAvailable',
          version: latestVersion,
          notes: latest.body || '新版本已发布',
          releasePage: latest.html_url,
          releaseInfo: latest,
        }
      }
      return {
        status: 'upToDate',
        version: '当前已是最新版本',
        notes: `当前版本为： ${currentVersion}`,
      }
    } catch (e: any) {
      return {
        status: 'failed',
        version: '检查更新失败',
        notes: `更新检查时发生错误： ${e?.message ?? e}`,
      }
    }
  }
}

/** 下载加速前缀选择 */
export async function resolveDownloadUrl(url: string): Promise<string> {
  const s = services().updateState
  const mode = s.downloadAccelerate
  if (mode === '' || mode === 'off') return url
  if (mode === 'auto') {
    const prefix = s.resolvedDownloadAccelerate ?? (await probeMirrors())
    return prefix + url
  }
  // 手动前缀
  const p = mode.endsWith('/') ? mode : mode + '/'
  return p + url
}

/** 测速: 对镜像发 Range 请求, 6s 超时, 取最快 */
export async function probeMirrors(): Promise<string> {
  const s = services().updateState
  const results = await Promise.all(
    GITHUB_MIRRORS.map(async (m) => {
      const start = performance.now()
      try {
        const controller = new AbortController()
        const t = setTimeout(() => controller.abort(), 6000)
        const res = await fetch(m + 'https://github.com/ldoubil/astral/releases', {
          headers: { Range: 'bytes=0-0' },
          signal: controller.signal,
        })
        clearTimeout(t)
        if (res.ok || res.status === 206) return { m, ms: performance.now() - start }
      } catch {
        /* ignore */
      }
      return null
    }),
  )
  const ok = results.filter((r): r is { m: string; ms: number } => !!r).sort((a, b) => a.ms - b.ms)
  if (ok.length === 0) throw new Error('所有节点均不可用')
  s.resolvedDownloadAccelerate = ok[0].m
  return ok[0].m
}

/** 应用版本 (对应 AppInfoUtil.getVersion, pubspec version) */
export const APP_VERSION = '2.9.60'

/** 内核版本 (easytierVersion, "版本|平台") */
export async function fetchKernelVersion(): Promise<string> {
  try {
    return await (await import('../bridge/bridge')).bridge.easytierVersion()
  } catch {
    return ''
  }
}
