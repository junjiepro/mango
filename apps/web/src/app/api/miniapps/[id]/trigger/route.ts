/**
 * MiniApp Trigger Configuration API Route
 * T097: Add MiniApp trigger configuration UI in MiniApp settings
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@mango/shared/utils'

interface TriggerConfig {
  id?: string
  type: 'schedule' | 'event' | 'manual'
  enabled: boolean
  interval?: number
  cron?: string
  eventType?: string
  message?: string
  metadata?: Record<string, any>
}

/**
 * GET /api/miniapps/[id]/trigger
 * 获取小应用的触发器配置
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const miniAppId = params.id

    // 获取当前用户
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 获取用户的安装记录
    const { data: installation, error: installError } = await supabase
      .from('mini_app_installations')
      .select('id')
      .eq('mini_app_id', miniAppId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (installError || !installation) {
      return NextResponse.json(
        { success: false, error: 'Mini app not installed' },
        { status: 404 }
      )
    }

    // 从 mini_app_data 中获取触发器配置
    const { data: triggerData, error: dataError } = await supabase
      .from('mini_app_data')
      .select('value')
      .eq('installation_id', installation.id)
      .eq('key', '_trigger_config')
      .single()

    if (dataError && dataError.code !== 'PGRST116') {
      // PGRST116 是 "not found" 错误,可以忽略
      throw dataError
    }

    const triggerConfig = triggerData?.value as TriggerConfig | null

    return NextResponse.json({
      success: true,
      data: triggerConfig,
    })
  } catch (error) {
    logger.error('Failed to get trigger config', error as Error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/miniapps/[id]/trigger
 * 保存小应用的触发器配置
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const miniAppId = params.id
    const triggerConfig: TriggerConfig = await request.json()

    // 获取当前用户
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 验证触发器配置
    if (!triggerConfig.type) {
      return NextResponse.json(
        { success: false, error: 'Trigger type is required' },
        { status: 400 }
      )
    }

    if (triggerConfig.type === 'schedule') {
      if (!triggerConfig.interval && !triggerConfig.cron) {
        return NextResponse.json(
          { success: false, error: 'Schedule trigger requires interval or cron' },
          { status: 400 }
        )
      }
    }

    if (triggerConfig.type === 'event' && !triggerConfig.eventType) {
      return NextResponse.json(
        { success: false, error: 'Event trigger requires eventType' },
        { status: 400 }
      )
    }

    // 获取用户的安装记录
    const { data: installation, error: installError } = await supabase
      .from('mini_app_installations')
      .select('id')
      .eq('mini_app_id', miniAppId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (installError || !installation) {
      return NextResponse.json(
        { success: false, error: 'Mini app not installed' },
        { status: 404 }
      )
    }

    // 保存触发器配置到 mini_app_data
    const { error: saveError } = await supabase.from('mini_app_data').upsert(
      {
        installation_id: installation.id,
        key: '_trigger_config',
        value: triggerConfig,
        value_type: 'json',
        metadata: {
          updated_at: new Date().toISOString(),
        },
      },
      {
        onConflict: 'installation_id,key',
      }
    )

    if (saveError) {
      throw saveError
    }

    // 记录审计日志
    await supabase.from('audit_logs').insert({
      action: 'miniapp.trigger.update',
      actor_id: user.id,
      actor_type: 'user',
      resource_type: 'miniapp',
      resource_id: miniAppId,
      details: {
        installation_id: installation.id,
        trigger_config: triggerConfig,
      },
    })

    logger.info('Trigger config saved', {
      miniAppId,
      userId: user.id,
      triggerType: triggerConfig.type,
    })

    return NextResponse.json({
      success: true,
      data: triggerConfig,
    })
  } catch (error) {
    logger.error('Failed to save trigger config', error as Error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/miniapps/[id]/trigger
 * 删除小应用的触发器配置
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const miniAppId = params.id

    // 获取当前用户
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 获取用户的安装记录
    const { data: installation, error: installError } = await supabase
      .from('mini_app_installations')
      .select('id')
      .eq('mini_app_id', miniAppId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (installError || !installation) {
      return NextResponse.json(
        { success: false, error: 'Mini app not installed' },
        { status: 404 }
      )
    }

    // 删除触发器配置
    const { error: deleteError } = await supabase
      .from('mini_app_data')
      .delete()
      .eq('installation_id', installation.id)
      .eq('key', '_trigger_config')

    if (deleteError) {
      throw deleteError
    }

    // 记录审计日志
    await supabase.from('audit_logs').insert({
      action: 'miniapp.trigger.delete',
      actor_id: user.id,
      actor_type: 'user',
      resource_type: 'miniapp',
      resource_id: miniAppId,
      details: {
        installation_id: installation.id,
      },
    })

    logger.info('Trigger config deleted', {
      miniAppId,
      userId: user.id,
    })

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    logger.error('Failed to delete trigger config', error as Error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
