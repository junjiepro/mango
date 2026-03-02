/**
 * i18n Request Configuration
 * T157: next-intl getRequestConfig for cookie-based locale detection
 */

import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { defaultLocale, isValidLocale, type Locale } from './config';

import zhCommon from '../../messages/zh/common.json';
import zhAuth from '../../messages/zh/auth.json';
import zhConversations from '../../messages/zh/conversations.json';
import zhMiniapps from '../../messages/zh/miniapps.json';
import zhProfile from '../../messages/zh/profile.json';
import zhDevices from '../../messages/zh/devices.json';
import zhWorkspace from '../../messages/zh/workspace.json';
import zhFeedback from '../../messages/zh/feedback.json';
import zhErrors from '../../messages/zh/errors.json';

import enCommon from '../../messages/en/common.json';
import enAuth from '../../messages/en/auth.json';
import enConversations from '../../messages/en/conversations.json';
import enMiniapps from '../../messages/en/miniapps.json';
import enProfile from '../../messages/en/profile.json';
import enDevices from '../../messages/en/devices.json';
import enWorkspace from '../../messages/en/workspace.json';
import enFeedback from '../../messages/en/feedback.json';
import enErrors from '../../messages/en/errors.json';

const allMessages: Record<Locale, Record<string, unknown>> = {
  zh: {
    common: zhCommon,
    auth: zhAuth,
    conversations: zhConversations,
    miniapps: zhMiniapps,
    profile: zhProfile,
    devices: zhDevices,
    workspace: zhWorkspace,
    feedback: zhFeedback,
    errors: zhErrors,
  },
  en: {
    common: enCommon,
    auth: enAuth,
    conversations: enConversations,
    miniapps: enMiniapps,
    profile: enProfile,
    devices: enDevices,
    workspace: enWorkspace,
    feedback: enFeedback,
    errors: enErrors,
  },
};

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
  if (cookieLocale && isValidLocale(cookieLocale)) {
    return { locale: cookieLocale, messages: allMessages[cookieLocale] };
  }

  const headerStore = await headers();
  const acceptLanguage = headerStore.get('Accept-Language') || '';
  const detectedLocale = detectLocaleFromHeader(acceptLanguage);
  return { locale: detectedLocale, messages: allMessages[detectedLocale] };
});

function detectLocaleFromHeader(acceptLanguage: string): Locale {
  const enMatch = acceptLanguage.match(/en(?:-\w+)?(?:;q=([\d.]+))?/);
  const zhMatch = acceptLanguage.match(/zh(?:-\w+)?(?:;q=([\d.]+))?/);
  if (enMatch) {
    const enQ = parseFloat(enMatch[1] || '1');
    const zhQ = zhMatch ? parseFloat(zhMatch[1] || '1') : 0;
    if (enQ > zhQ) return 'en';
  }
  return defaultLocale;
}
