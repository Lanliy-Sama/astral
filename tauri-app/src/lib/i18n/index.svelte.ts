/**
 * i18n — 对应 easy_localization
 *
 * - 支持 zh / en，回退 zh（与原应用一致）
 * - `t(key, args)` 对应 `LocaleKeys.key.tr()`
 * - `setLocale()` 对应 `context.setLocale()`，持久化到 localStorage
 */
import zh from './zh.json'
import en from './en.json'

export type Locale = 'zh' | 'en'

const dicts: Record<Locale, Record<string, string>> = {
  zh: zh as Record<string, string>,
  en: en as Record<string, string>,
}

const STORAGE_KEY = 'astral.locale'

function readInitialLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'zh' || saved === 'en') return saved
  } catch {
    /* ignore */
  }
  const lang = (navigator.language || 'zh').toLowerCase()
  return lang.startsWith('zh') ? 'zh' : 'en'
}

class I18nState {
  locale = $state<Locale>(readInitialLocale())

  setLocale(locale: Locale) {
    this.locale = locale
    try {
      localStorage.setItem(STORAGE_KEY, locale)
    } catch {
      /* ignore */
    }
  }

  /** 翻译；缺失 key 回退中文再回退 key 本身 */
  t(key: string, args?: Record<string, string>): string {
    let text = dicts[this.locale][key] ?? dicts.zh[key] ?? key
    if (args) {
      for (const [k, v] of Object.entries(args)) {
        text = text.replaceAll(`{${k}}`, v)
      }
    }
    return text
  }
}

export const i18n = new I18nState()

/** 便捷函数：t('cancel') */
export function t(key: string, args?: Record<string, string>): string {
  return i18n.t(key, args)
}
