import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AgentEngine } from '@/lib/ai-agent/core'
import type {
  AgentSession,
  AgentMessage,
  SessionFilter,
  SessionStats
} from '@/types/ai-agent'

// Initialize services
const agentEngine = new AgentEngine()

// GET /api/sessions - List and search sessions
export async function GET(request: NextRequest) {
  try {
    // Validate authentication
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('id')
    const action = searchParams.get('action')

    // Get specific session
    if (sessionId) {
      const session = await agentEngine.getSession(sessionId)

      if (!session || session.userId !== user.id) {
        return NextResponse.json(
          { error: 'Session not found or access denied' },
          { status: 404 }
        )
      }

      // Include messages if requested
      const includeMessages = searchParams.get('include_messages') === 'true'
      const limit = parseInt(searchParams.get('limit') || '50')
      const offset = parseInt(searchParams.get('offset') || '0')

      let messages: AgentMessage[] = []
      if (includeMessages) {
        messages = await agentEngine.getMessages(sessionId, { limit, offset })
      }

      return NextResponse.json({
        success: true,
        session: {
          ...session,
          ...(includeMessages && { messages })
        }
      })
    }

    // Handle special actions
    switch (action) {
      case 'stats': {
        // Get session statistics
        const stats = await getSessionStats(user.id)
        return NextResponse.json({
          success: true,
          stats
        })
      }

      case 'recent': {
        // Get recent sessions
        const limit = parseInt(searchParams.get('limit') || '10')
        const sessions = await agentEngine.getUserSessions(user.id, {
          orderBy: 'lastActivity',
          order: 'desc',
          limit
        })

        return NextResponse.json({
          success: true,
          sessions,
          totalCount: sessions.length
        })
      }

      default: {
        // List all sessions with filtering
        const filter: SessionFilter = {
          status: searchParams.get('status') as any,
          mode: searchParams.get('mode') as any,
          search: searchParams.get('search') || undefined,
          dateFrom: searchParams.get('date_from') || undefined,
          dateTo: searchParams.get('date_to') || undefined,
          orderBy: (searchParams.get('order_by') as any) || 'lastActivity',
          order: (searchParams.get('order') as any) || 'desc',
          limit: parseInt(searchParams.get('limit') || '20'),
          offset: parseInt(searchParams.get('offset') || '0')
        }

        const sessions = await agentEngine.getUserSessions(user.id, filter)
        const totalCount = await agentEngine.getUserSessionCount(user.id, filter)

        return NextResponse.json({
          success: true,
          sessions,
          totalCount,
          pagination: {
            limit: filter.limit,
            offset: filter.offset,
            hasMore: (filter.offset! + filter.limit!) < totalCount
          }
        })
      }
    }

  } catch (error) {
    console.error('Sessions API GET Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve sessions',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST /api/sessions - Create new session
export async function POST(request: NextRequest) {
  try {
    // Validate authentication
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { title, mode = 'simple', context, plugins, mcpConfig } = body

    // Create new session
    const session = await agentEngine.createSession(title, mode)

    // Set up initial context if provided
    if (context) {
      await agentEngine.updateSession(session.id, {
        context: {
          ...session.context,
          ...context
        }
      })
    }

    // Configure plugins if provided
    if (plugins && plugins.length > 0) {
      await agentEngine.updateSession(session.id, {
        plugins: plugins.map((plugin: any) => ({
          id: plugin.id,
          enabled: plugin.enabled !== false,
          config: plugin.config || {}
        }))
      })
    }

    // Configure MCP if provided
    if (mcpConfig) {
      await agentEngine.updateSession(session.id, {
        mcpConfig
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Session created successfully',
      session
    })

  } catch (error) {
    console.error('Sessions API POST Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create session',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// PUT /api/sessions - Update session
export async function PUT(request: NextRequest) {
  try {
    // Validate authentication
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { sessionId, updates, action } = body

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    // Verify session ownership
    const session = await agentEngine.getSession(sessionId)
    if (!session || session.userId !== user.id) {
      return NextResponse.json(
        { error: 'Session not found or access denied' },
        { status: 404 }
      )
    }

    switch (action) {
      case 'pause': {
        // Pause session
        await agentEngine.updateSession(sessionId, {
          status: 'paused',
          lastActivity: new Date().toISOString()
        })

        return NextResponse.json({
          success: true,
          message: 'Session paused successfully'
        })
      }

      case 'resume': {
        // Resume session
        await agentEngine.updateSession(sessionId, {
          status: 'active',
          lastActivity: new Date().toISOString()
        })

        return NextResponse.json({
          success: true,
          message: 'Session resumed successfully'
        })
      }

      case 'archive': {
        // Archive session
        await agentEngine.updateSession(sessionId, {
          status: 'completed',
          archivedAt: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        })

        return NextResponse.json({
          success: true,
          message: 'Session archived successfully'
        })
      }

      case 'clear_messages': {
        // Clear session messages
        await agentEngine.clearMessages(sessionId)

        return NextResponse.json({
          success: true,
          message: 'Session messages cleared successfully'
        })
      }

      case 'export': {
        // Export session data
        const messages = await agentEngine.getMessages(sessionId)
        const exportData = {
          session: {
            ...session,
            exportedAt: new Date().toISOString()
          },
          messages,
          metadata: {
            version: '1.0',
            format: 'json',
            totalMessages: messages.length
          }
        }

        return NextResponse.json({
          success: true,
          exportData
        })
      }

      default: {
        // Standard update
        if (!updates || Object.keys(updates).length === 0) {
          return NextResponse.json(
            { error: 'No updates provided' },
            { status: 400 }
          )
        }

        // Validate updates
        const allowedFields = [
          'title', 'mode', 'context', 'plugins', 'mcpConfig',
          'preferences', 'tags', 'metadata'
        ]

        const filteredUpdates = Object.keys(updates)
          .filter(key => allowedFields.includes(key))
          .reduce((obj, key) => {
            obj[key] = updates[key]
            return obj
          }, {} as any)

        if (Object.keys(filteredUpdates).length === 0) {
          return NextResponse.json(
            { error: 'No valid updates provided' },
            { status: 400 }
          )
        }

        // Add system fields
        filteredUpdates.lastActivity = new Date().toISOString()

        await agentEngine.updateSession(sessionId, filteredUpdates)

        return NextResponse.json({
          success: true,
          message: 'Session updated successfully'
        })
      }
    }

  } catch (error) {
    console.error('Sessions API PUT Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update session',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// DELETE /api/sessions - Delete session
export async function DELETE(request: NextRequest) {
  try {
    // Validate authentication
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('id')
    const permanent = searchParams.get('permanent') === 'true'

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    // Verify session ownership
    const session = await agentEngine.getSession(sessionId)
    if (!session || session.userId !== user.id) {
      return NextResponse.json(
        { error: 'Session not found or access denied' },
        { status: 404 }
      )
    }

    if (permanent) {
      // Permanently delete session and all associated data
      await agentEngine.deleteSession(sessionId, true)

      return NextResponse.json({
        success: true,
        message: 'Session permanently deleted'
      })
    } else {
      // Soft delete (move to deleted status)
      await agentEngine.updateSession(sessionId, {
        status: 'deleted',
        deletedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      })

      return NextResponse.json({
        success: true,
        message: 'Session deleted successfully'
      })
    }

  } catch (error) {
    console.error('Sessions API DELETE Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete session',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Helper function to get session statistics
async function getSessionStats(userId: string): Promise<SessionStats> {
  try {
    const sessions = await agentEngine.getUserSessions(userId)

    const stats: SessionStats = {
      totalSessions: sessions.length,
      activeSessions: sessions.filter(s => s.status === 'active').length,
      pausedSessions: sessions.filter(s => s.status === 'paused').length,
      completedSessions: sessions.filter(s => s.status === 'completed').length,
      totalMessages: sessions.reduce((sum, s) => sum + (s.messageCount || 0), 0),
      totalTokens: sessions.reduce((sum, s) => sum + (s.usage?.totalTokens || 0), 0),
      averageSessionLength: 0,
      mostUsedMode: 'simple',
      lastActivityDate: new Date().toISOString()
    }

    // Calculate average session length
    const sessionLengths = sessions
      .filter(s => s.createdAt && s.lastActivity)
      .map(s => new Date(s.lastActivity!).getTime() - new Date(s.createdAt).getTime())

    if (sessionLengths.length > 0) {
      stats.averageSessionLength = sessionLengths.reduce((sum, len) => sum + len, 0) / sessionLengths.length
    }

    // Find most used mode
    const modeCounts = sessions.reduce((counts, s) => {
      counts[s.mode] = (counts[s.mode] || 0) + 1
      return counts
    }, {} as Record<string, number>)

    stats.mostUsedMode = Object.entries(modeCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] as any || 'simple'

    // Get latest activity date
    const latestActivity = sessions
      .map(s => s.lastActivity)
      .filter(Boolean)
      .sort()
      .reverse()[0]

    if (latestActivity) {
      stats.lastActivityDate = latestActivity
    }

    return stats
  } catch (error) {
    console.error('Error calculating session stats:', error)
    throw error
  }
}

// Handle CORS preflight requests
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  })
}