/**
 * Error Tracking (Sentry-compatible)
 * T205: 错误追踪集成
 */

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN

export function initErrorTracking() {
  if (!SENTRY_DSN || typeof window === 'undefined') return

  window.addEventListener('error', (event) => {
    reportError({ message: event.message, stack: event.error?.stack, type: 'uncaught' })
  })

  window.addEventListener('unhandledrejection', (event) => {
    reportError({ message: String(event.reason), type: 'unhandled_rejection' })
  })
}

export function captureException(error: unknown, context?: Record<string, unknown>) {
  const normalized = error instanceof Error
    ? { message: error.message, stack: error.stack, name: error.name }
    : { message: String(error) }

  reportError({ ...normalized, type: 'captured', context })
}

function reportError(payload: Record<string, unknown>) {
  if (!SENTRY_DSN) {
    console.error('[ErrorTracking]', payload)
    return
  }

  fetch(SENTRY_DSN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, timestamp: Date.now(), url: window.location.href }),
  }).catch(() => {})
}
