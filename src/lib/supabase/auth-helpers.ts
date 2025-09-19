import { createClient } from './server'
import { redirect } from 'next/navigation'

// Server action to require authentication
export async function requireAuth() {
  const user = await getUser()

  if (!user) {
    redirect('/login')
  }

  return user
}

// Server action to get authenticated user or redirect
export async function getUser() {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return user
}

// Server action to check if user is authenticated
export async function isAuthenticated(): Promise<boolean> {
  const user = await getUser()
  return !!user
}

// Server action to get user profile with error handling
export async function getUserProfile() {
  const supabase = await createClient()
  const user = await getUser()

  if (!user) {
    return null
  }

  try {
    // This would fetch additional profile data from a profiles table
    // For now, return basic user info
    return {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      updated_at: user.updated_at
    }
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return null
  }
}