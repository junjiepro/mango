import type { User, Session } from '@supabase/supabase-js'

// Supabase types will be auto-generated once database schema is finalized
export interface Database {
  public: {
    Tables: {
      // Tables will be defined here after schema creation
    }
    Views: {
      // Views will be defined here after schema creation
    }
    Functions: {
      // Functions will be defined here after schema creation
    }
    Enums: {
      // Enums will be defined here after schema creation
    }
  }
}

// Auth related types
export interface UserProfile {
  id: string
  email: string
  created_at: string
  updated_at: string
}

export interface AuthError {
  message: string
  status?: number
}

// Auth Context types
export interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<{ error: AuthError | null }>
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>
  confirmPasswordReset: (accessToken: string, newPassword: string) => Promise<{ error: AuthError | null }>
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>
  refreshSession: () => Promise<void>
}

// Auth Hook return type
export interface UseAuthReturn extends AuthContextType {}

// Auth action results
export interface AuthActionResult {
  error: AuthError | null
  data?: any
}