import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'

// Mock Supabase client
const mockSupabase = {
  auth: {
    getSession: jest.fn(),
    getUser: jest.fn(),
    signUp: jest.fn(),
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChange: jest.fn(),
    resetPasswordForEmail: jest.fn(),
    updateUser: jest.fn(),
    refreshSession: jest.fn(),
    setSession: jest.fn(),
  }
}

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase
}))

// Test component that uses auth context
const TestComponent = () => {
  const { user, loading, signIn, signUp, signOut } = useAuth()

  return (
    <div>
      <div data-testid="loading">{loading ? 'loading' : 'loaded'}</div>
      <div data-testid="user">{user ? user.email : 'no user'}</div>
      <button onClick={() => signIn('test@example.com', 'password')} data-testid="signin">
        Sign In
      </button>
      <button onClick={() => signUp('test@example.com', 'password')} data-testid="signup">
        Sign Up
      </button>
      <button onClick={() => signOut()} data-testid="signout">
        Sign Out
      </button>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Default mock implementations
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null
    })

    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: jest.fn()
        }
      }
    })
  })

  it('should render loading state initially', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    expect(screen.getByTestId('loading')).toHaveTextContent('loading')
  })

  it('should initialize with no user when session is null', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
      expect(screen.getByTestId('user')).toHaveTextContent('no user')
    })
  })

  it('should initialize with user when session exists', async () => {
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      email_confirmed_at: '2023-01-01T00:00:00Z'
    }

    const mockSession = {
      user: mockUser,
      access_token: 'token'
    }

    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: mockSession },
      error: null
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
    })
  })

  it('should handle sign in success', async () => {
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      email_confirmed_at: '2023-01-01T00:00:00Z'
    }

    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: mockUser, session: { user: mockUser } },
      error: null
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
    })

    const signInButton = screen.getByTestId('signin')

    await act(async () => {
      signInButton.click()
    })

    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password'
    })
  })

  it('should handle sign in with invalid credentials', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials', status: 400 }
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
    })

    const signInButton = screen.getByTestId('signin')

    await act(async () => {
      signInButton.click()
    })

    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password'
    })
  })

  it('should handle sign in with unconfirmed email', async () => {
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      email_confirmed_at: null // Unconfirmed email
    }

    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: mockUser, session: { user: mockUser } },
      error: null
    })

    mockSupabase.auth.signOut.mockResolvedValue({
      error: null
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
    })

    const signInButton = screen.getByTestId('signin')

    await act(async () => {
      signInButton.click()
    })

    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalled()
    expect(mockSupabase.auth.signOut).toHaveBeenCalled()
  })

  it('should handle sign up success', async () => {
    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: null
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
    })

    const signUpButton = screen.getByTestId('signup')

    await act(async () => {
      signUpButton.click()
    })

    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password',
      options: {
        emailRedirectTo: 'http://localhost/auth/callback'
      }
    })
  })

  it('should handle sign up error', async () => {
    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Email already exists', status: 422 }
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
    })

    const signUpButton = screen.getByTestId('signup')

    await act(async () => {
      signUpButton.click()
    })

    expect(mockSupabase.auth.signUp).toHaveBeenCalled()
  })

  it('should handle sign out', async () => {
    mockSupabase.auth.signOut.mockResolvedValue({
      error: null
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
    })

    const signOutButton = screen.getByTestId('signout')

    await act(async () => {
      signOutButton.click()
    })

    expect(mockSupabase.auth.signOut).toHaveBeenCalled()
  })

  it('should handle auth state changes', async () => {
    const mockCallback = jest.fn()

    mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
      mockCallback.mockImplementation(callback)
      return {
        data: {
          subscription: {
            unsubscribe: jest.fn()
          }
        }
      }
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
    })

    // Simulate auth state change
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      email_confirmed_at: '2023-01-01T00:00:00Z'
    }

    const mockSession = {
      user: mockUser,
      access_token: 'token'
    }

    await act(async () => {
      mockCallback('SIGNED_IN', mockSession)
    })

    expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalled()
  })

  it('should throw error when useAuth is used outside provider', () => {
    // Suppress console.error for this test
    const originalError = console.error
    console.error = jest.fn()

    expect(() => {
      render(<TestComponent />)
    }).toThrow('useAuth must be used within an AuthProvider')

    console.error = originalError
  })

  it('should handle getSession error', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: { message: 'Session error' }
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
      expect(screen.getByTestId('user')).toHaveTextContent('no user')
    })
  })
})