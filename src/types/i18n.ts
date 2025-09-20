/**
 * TypeScript 类型定义：国际化翻译消息
 * 基于 messages/zh.json 和 messages/en.json 的实际结构生成
 */

// 支持的语言代码
export type Locale = 'zh' | 'en';

// 翻译键路径类型 - 基于实际翻译文件
export type TranslationKey =
  // Auth 认证相关
  | 'auth.forgotPassword.backToLogin'
  | 'auth.forgotPassword.button'
  | 'auth.forgotPassword.emailPlaceholder'
  | 'auth.forgotPassword.error'
  | 'auth.forgotPassword.loadingButton'
  | 'auth.forgotPassword.success'
  | 'auth.forgotPassword.title'
  | 'auth.login.button'
  | 'auth.login.contactSupport'
  | 'auth.login.emailPlaceholder'
  | 'auth.login.errors.accountLocked'
  | 'auth.login.errors.emailNotConfirmed'
  | 'auth.login.errors.generic'
  | 'auth.login.errors.invalidCredentials'
  | 'auth.login.errors.rateLimit'
  | 'auth.login.errors.tooManyRequests'
  | 'auth.login.forgotPassword'
  | 'auth.login.loadingButton'
  | 'auth.login.needHelp'
  | 'auth.login.noAccount'
  | 'auth.login.passwordPlaceholder'
  | 'auth.login.registerLink'
  | 'auth.login.rememberMe'
  | 'auth.login.success'
  | 'auth.login.title'
  | 'auth.register.button'
  | 'auth.register.confirmPasswordPlaceholder'
  | 'auth.register.emailPlaceholder'
  | 'auth.register.error'
  | 'auth.register.hasAccount'
  | 'auth.register.loadingButton'
  | 'auth.register.loginLink'
  | 'auth.register.passwordPlaceholder'
  | 'auth.register.passwordRequirements.lowercase'
  | 'auth.register.passwordRequirements.minLength'
  | 'auth.register.passwordRequirements.number'
  | 'auth.register.passwordRequirements.title'
  | 'auth.register.passwordRequirements.uppercase'
  | 'auth.register.success'
  | 'auth.register.title'
  | 'auth.resetPassword.button'
  | 'auth.resetPassword.confirmPasswordPlaceholder'
  | 'auth.resetPassword.error'
  | 'auth.resetPassword.loadingButton'
  | 'auth.resetPassword.passwordPlaceholder'
  | 'auth.resetPassword.success'
  | 'auth.resetPassword.title'

  // Common 通用消息
  | 'common.back'
  | 'common.cancel'
  | 'common.close'
  | 'common.confirmPassword'
  | 'common.delete'
  | 'common.edit'
  | 'common.email'
  | 'common.error'
  | 'common.help'
  | 'common.info'
  | 'common.loading'
  | 'common.next'
  | 'common.or'
  | 'common.password'
  | 'common.previous'
  | 'common.save'
  | 'common.submit'
  | 'common.success'
  | 'common.warning'

  // Messages 系统消息
  | 'messages.confirmDelete'
  | 'messages.deleteSuccess'
  | 'messages.networkError'
  | 'messages.permissionDenied'
  | 'messages.saveSuccess'
  | 'messages.serverError'
  | 'messages.updateSuccess'

  // Navigation 导航
  | 'navigation.dashboard'
  | 'navigation.home'
  | 'navigation.login'
  | 'navigation.logout'
  | 'navigation.profile'
  | 'navigation.register'
  | 'navigation.settings'
  | 'navigation.welcome'

  // Pages 页面
  | 'pages.dashboard.recentActivity'
  | 'pages.dashboard.statistics'
  | 'pages.dashboard.title'
  | 'pages.dashboard.welcome'
  | 'pages.home.dashboard.description'
  | 'pages.home.dashboard.title'
  | 'pages.home.featuresTitle'
  | 'pages.home.getStarted.description'
  | 'pages.home.getStarted.loginButton'
  | 'pages.home.getStarted.registerButton'
  | 'pages.home.getStarted.title'
  | 'pages.home.profile.description'
  | 'pages.home.profile.title'
  | 'pages.home.subtitle'
  | 'pages.home.title'
  | 'pages.profile.accountSettings'
  | 'pages.profile.personalInfo'
  | 'pages.profile.title'
  | 'pages.profile.updateProfile'

  // Validation 验证消息
  | 'validation.emailInvalid'
  | 'validation.passwordMismatch'
  | 'validation.passwordTooShort'
  | 'validation.passwordWeak'
  | 'validation.required';

// 翻译消息的嵌套对象结构类型 - 使用更灵活的定义
export interface TranslationMessages {
  [key: string]: string | TranslationMessages;
}

// 语言切换器选项类型
export interface LanguageOption {
  code: Locale;
  name: string;
  flag: string;
  displayName: string;
}

// 国际化配置类型
export interface I18nConfig {
  defaultLocale: Locale;
  locales: readonly Locale[];
  fallbackLocale: Locale;
}

// 翻译函数参数类型
export interface TranslationParams {
  [key: string]: string | number | boolean | undefined;
}

// 翻译函数类型
export type TranslationFunction = (
  key: TranslationKey,
  params?: TranslationParams
) => string;

// 本地化格式化选项
export interface LocalizedFormatOptions {
  number?: Intl.NumberFormatOptions;
  date?: Intl.DateTimeFormatOptions;
  currency?: {
    currency: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  };
  percent?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  };
}

// 语言信息类型
export interface LocaleInfo {
  locale: Locale;
  displayName: string;
  flag: string;
  isRTL: boolean;
  availableLocales: LanguageOption[];
}

// 路由国际化类型
export interface LocalizedRouter {
  push: (path: string) => void;
  replace: (path: string) => void;
  prefetch: (path: string) => void;
  back: () => void;
  forward: () => void;
  refresh: () => void;
}

// 语言切换器 Hook 返回类型
export interface LanguageSwitcherHook {
  currentLocale: Locale;
  availableLocales: readonly Locale[];
  switchLanguage: (locale: Locale) => void;
  isPending: boolean;
}

// 本地化格式化 Hook 返回类型
export interface LocalizedFormatHook {
  formatNumber: (number: number, options?: Intl.NumberFormatOptions) => string;
  formatDate: (date: Date, options?: Intl.DateTimeFormatOptions) => string;
  formatCurrency: (amount: number, currency?: string) => string;
  formatPercent: (value: number, fractionDigits?: number) => string;
  formatRelativeTime: (value: number, unit: Intl.RelativeTimeFormatUnit) => string;
}

// 验证消息 Hook 返回类型
export interface LocalizedValidationHook {
  getValidationMessage: (key: string, params?: Record<string, string | number>) => string;
}

// 全局类型声明扩展 - 移除模块扩展以避免编译错误
declare global {
  namespace NextIntl {
    interface Messages extends TranslationMessages {}
  }
}