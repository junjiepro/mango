import { createBrowserClient } from '@supabase/ssr'
import { env } from '@/lib/env'
import type { Database } from './types'

let client: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  if (!client) {
    client = createBrowserClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
  }
  return client
}

// Export singleton instance for convenience
export const supabase = createClient()
