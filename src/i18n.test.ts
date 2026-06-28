import { describe, expect, it } from 'vitest'
import { getInitialLanguage, languages, t, type Language } from './i18n'

describe('i18n', () => {
  it('exposes English and Chinese language options', () => {
    expect(languages).toEqual([
      { code: 'en', label: 'English' },
      { code: 'zh-CN', label: '中文' },
    ])
  })

  it('translates app copy to Chinese', () => {
    expect(t('zh-CN', 'appTitle')).toBe('将任意图片转换成可拼豆的像素图。')
    expect(t('zh-CN', 'uploadActionEmpty')).toBe('拖入一张照片')
  })

  it('interpolates translated messages', () => {
    expect(t('en', 'readyStatus', { width: 32, height: 48 })).toBe('Ready: 32 x 48 PNG.')
    expect(t('zh-CN', 'readyStatus', { width: 32, height: 48 })).toBe('已就绪：32 x 48 PNG。')
  })

  it('falls back to English when a translation key is missing', () => {
    const unknownLanguage = 'missing' as Language

    expect(t(unknownLanguage, 'downloadPng')).toBe('Download PNG')
  })

  it('selects Chinese for zh browser locales', () => {
    expect(getInitialLanguage('zh-TW')).toBe('zh-CN')
    expect(getInitialLanguage('zh')).toBe('zh-CN')
    expect(getInitialLanguage('fr-FR')).toBe('en')
  })
})
