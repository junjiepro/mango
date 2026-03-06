/**
 * Supabase Auth Configuration
 * T027: Setup Supabase Auth configuration
 */

/**
 * Supabase Auth 配置
 * 定义认证行为、会话管理和安全策略
 */
export const authConfig = {
  // 自动刷新 token
  autoRefreshToken: true,

  // 持久化会话
  persistSession: true,

  // 检测会话变化
  detectSessionInUrl: true,

  // 流程类型 (PKCE for better security)
  flowType: 'pkce' as const,
};

/**
 * Auth 相关常量
 */
export const AUTH_CONSTANTS = {
  // Cookie 名称
  COOKIE_NAME: 'sb-auth-token',

  // Session 过期时间 (7天)
  SESSION_EXPIRY_SECONDS: 7 * 24 * 60 * 60,

  // Token 刷新阈值 (提前5分钟刷新)
  REFRESH_THRESHOLD_SECONDS: 5 * 60,

  // 重定向路径
  REDIRECT_PATHS: {
    LOGIN: '/auth/login',
    SIGNUP: '/auth/signup',
    CALLBACK: '/auth/callback',
    HOME: '/conversations',
    LOGOUT: '/auth/logout',
  },

  // 公开路径 (不需要认证)
  PUBLIC_PATHS: [
    '/',
    '/auth/login',
    '/auth/signup',
    '/auth/callback',
    '/auth/reset-password',
    '/auth/verify-email',
    '/api/config',
  ],
} as const;

/**
 * Auth 错误消息映射
 */
export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'Invalid login credentials': '用户名或密码错误',
  'Email not confirmed': '邮箱未验证，请检查您的邮箱',
  'User already registered': '该邮箱已被注册',
  'Password should be at least 6 characters': '密码至少需要6个字符',
  'Unable to validate email address': '邮箱格式无效',
  'Signups not allowed for this instance': '当前不允许注册新用户',
  'Email rate limit exceeded': '邮件发送频率过高，请稍后再试',
  'Invalid refresh token': '会话已过期，请重新登录',
};

/**
 * 获取友好的错误消息
 */
export function getAuthErrorMessage(error: string): string {
  return AUTH_ERROR_MESSAGES[error] || '认证失败，请稍后重试';
}

/**
 * 检查路径是否需要认证
 */
export function isProtectedPath(pathname: string): boolean {
  return !AUTH_CONSTANTS.PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

/**
 * 获取重定向 URL
 */
export function getRedirectUrl(type: keyof typeof AUTH_CONSTANTS.REDIRECT_PATHS): string {
  return AUTH_CONSTANTS.REDIRECT_PATHS[type];
}
