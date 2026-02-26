/**
 * HTML Sanitizer
 * T184: XSS prevention - sanitize user-generated HTML
 */

const DANGEROUS_TAGS = /&lt;(script|iframe|object|embed|form|input|textarea|select|button|link|meta|style|base)[^>]*>[\s\S]*?<\/\1>|<(script|iframe|object|embed|form|input|textarea|select|button|link|meta|style|base)[^>]*>/gi

const DANGEROUS_ATTRS = /\s(on\w+|formaction|xlink:href|data-bind)\s*=\s*["'][^"']*["']/gi

const JAVASCRIPT_URI = /(href|src|action)\s*=\s*["']\s*javascript:/gi

export function sanitizeHtml(html: string): string {
  return html
    .replace(DANGEROUS_TAGS, '')
    .replace(DANGEROUS_ATTRS, '')
    .replace(JAVASCRIPT_URI, '$1="')
}
