/**
 * MiniApp Scheduler Edge Function
 * T094: Create Supabase Edge Function for scheduled MiniApp triggers
 *
 * 处理小应用的定时触发任务
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ScheduledTrigger {
  installation_id: string
  mini_app_id: string
  user_id: string
  trigger_config: {
    type: 'schedule'
    cron?: string
    interval?: number // 分钟
    next_run?: string
  }
}

serve(async (req) => {
  // 处理 CORS 预检请求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 创建 Supabase 客户端
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 获取当前时间
    const now = new Date()

    // 查询需要触发的小应用
    const { data: installations, error: fetchError } = await supabase
      .from('mini_app_installations')
      .select(`
        id,
        mini_app_id,
        user_id,
        mini_apps (
          id,
          name,
          display_name,
          manifest,
          code
        )
      `)
      .eq('status', 'active')

    if (fetchError) {
      throw new Error(`Failed to fetch installations: ${fetchError.message}`)
    }

    const triggeredApps: any[] = []

    // 遍历所有安装,检查是否需要触发
    for (const installation of installations || []) {
      const miniApp = (installation as any).mini_apps
      if (!miniApp) continue

      const manifest = miniApp.manifest || {}
      const triggers = manifest.triggers || []

      // 检查定时触发器
      for (const trigger of triggers) {
        if (trigger.type !== 'schedule') continue

        const shouldTrigger = await checkScheduleTrigger(
          installation.id,
          trigger,
          now,
          supabase
        )

        if (shouldTrigger) {
          // 执行触发
          await executeTrigger(installation, miniApp, trigger, supabase)
          triggeredApps.push({
            installation_id: installation.id,
            mini_app_name: miniApp.display_name,
            trigger_type: trigger.type,
          })
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        triggered_count: triggeredApps.length,
        triggered_apps: triggeredApps,
        timestamp: now.toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in miniapp-scheduler:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

/**
 * 检查是否应该触发定时任务
 */
async function checkScheduleTrigger(
  installationId: string,
  trigger: any,
  now: Date,
  supabase: any
): Promise<boolean> {
  // 获取上次触发时间
  const { data: lastTrigger } = await supabase
    .from('mini_app_data')
    .select('value')
    .eq('installation_id', installationId)
    .eq('key', `_trigger_last_run_${trigger.id || 'default'}`)
    .single()

  const lastRunTime = lastTrigger?.value
    ? new Date(lastTrigger.value)
    : new Date(0)

  // 基于间隔的触发
  if (trigger.interval) {
    const intervalMs = trigger.interval * 60 * 1000 // 转换为毫秒
    const timeSinceLastRun = now.getTime() - lastRunTime.getTime()

    return timeSinceLastRun >= intervalMs
  }

  // 基于 cron 的触发（简化版，仅支持每小时、每天）
  if (trigger.cron) {
    // 简化的 cron 解析
    if (trigger.cron === '0 * * * *') {
      // 每小时
      return now.getMinutes() === 0 && now.getTime() - lastRunTime.getTime() > 3600000
    } else if (trigger.cron === '0 0 * * *') {
      // 每天
      return (
        now.getHours() === 0 &&
        now.getMinutes() === 0 &&
        now.getTime() - lastRunTime.getTime() > 86400000
      )
    }
  }

  return false
}

/**
 * 执行触发器
 */
async function executeTrigger(
  installation: any,
  miniApp: any,
  trigger: any,
  supabase: any
): Promise<void> {
  const now = new Date()

  try {
    // 创建通知
    await supabase.from('notifications').insert({
      user_id: installation.user_id,
      source_type: 'miniapp',
      source_id: miniApp.id,
      title: `${miniApp.display_name} Reminder`,
      body: trigger.message || 'Scheduled task triggered',
      category: 'reminder',
      priority: 'normal',
      status: 'unread',
      metadata: {
        installation_id: installation.id,
        trigger_id: trigger.id,
        trigger_type: trigger.type,
      },
    })

    // 更新上次触发时间
    await supabase.from('mini_app_data').upsert({
      installation_id: installation.id,
      key: `_trigger_last_run_${trigger.id || 'default'}`,
      value: now.toISOString(),
      value_type: 'string',
      metadata: {
        trigger_type: trigger.type,
        trigger_config: trigger,
      },
    })

    // 记录审计日志
    await supabase.from('audit_logs').insert({
      action: 'miniapp.trigger',
      actor_id: installation.user_id,
      actor_type: 'system',
      resource_type: 'miniapp',
      resource_id: miniApp.id,
      details: {
        installation_id: installation.id,
        trigger_type: trigger.type,
        trigger_config: trigger,
      },
    })

    console.log(`Triggered mini app: ${miniApp.display_name} for user: ${installation.user_id}`)
  } catch (error) {
    console.error(`Failed to execute trigger for ${miniApp.display_name}:`, error)
    throw error
  }
}
