import {getRequestConfig} from 'next-intl/server'
import {routing} from './routing'
import {headers} from 'next/headers'

export default getRequestConfig(async ({requestLocale}) => {
  try {
    console.log('[i18n/request] Starting getRequestConfig')

    // 尝试从 requestLocale 获取语言
    let locale = await requestLocale
    console.log('[i18n/request] Received locale from requestLocale:', locale)

    // 如果 requestLocale 为空，尝试从 headers 中获取路径信息
    if (!locale) {
      const headersList = await headers()
      const pathname = headersList.get('x-pathname') || headersList.get('x-next-pathname') || ''
      console.log('[i18n/request] Pathname from headers:', pathname)

      // 从路径中提取语言代码
      const pathSegments = pathname.split('/')
      if (pathSegments.length > 1 && routing.locales.includes(pathSegments[1] as any)) {
        locale = pathSegments[1]
        console.log('[i18n/request] Extracted locale from pathname:', locale)
      }
    }

    // 如果仍然没有有效的语言，使用默认语言
    if (!locale || !routing.locales.includes(locale as any)) {
      console.log('[i18n/request] Using default locale:', routing.defaultLocale)
      locale = routing.defaultLocale
    } else {
      console.log('[i18n/request] Using valid locale:', locale)
    }

    console.log('[i18n/request] Final locale used:', locale)
    console.log('[i18n/request] Available locales:', routing.locales)

    // 确保返回有效的配置
    const config = {
      locale,
      messages: (await import(`../../messages/${locale}.json`)).default
    }

    console.log('[i18n/request] Returning config with locale:', config.locale)
    return config
  } catch (error) {
    console.error('[i18n/request] Error in getRequestConfig:', error)
    // 出错时使用默认配置
    const fallbackLocale = routing.defaultLocale
    console.log('[i18n/request] Using fallback locale:', fallbackLocale)
    return {
      locale: fallbackLocale,
      messages: (await import(`../../messages/${fallbackLocale}.json`)).default
    }
  }
})