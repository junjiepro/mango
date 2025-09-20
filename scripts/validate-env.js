#!/usr/bin/env node

/**
 * 环境变量验证脚本
 * 用于验证部署前的环境变量配置
 */

const fs = require('fs')
const path = require('path')

// ANSI 颜色代码
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
}

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`
}

// 验证 URL 格式
function isValidUrl(string) {
  try {
    new URL(string)
    return true
  } catch (_) {
    return false
  }
}

// 验证 JWT 格式
function isValidJWT(token) {
  const parts = token.split('.')
  return parts.length === 3 && parts.every(part => part.length > 0)
}

// 验证环境变量
function validateEnvironment(env, envName = 'current') {
  console.log(colorize(`\n🔍 验证 ${envName} 环境变量...`, 'cyan'))

  const errors = []
  const warnings = []

  // 检查必需变量
  if (!env.NEXT_PUBLIC_SUPABASE_URL) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL 不能为空')
  } else if (!isValidUrl(env.NEXT_PUBLIC_SUPABASE_URL)) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL 必须是有效的 URL')
  } else if (!env.NEXT_PUBLIC_SUPABASE_URL.includes('supabase.co')) {
    warnings.push('NEXT_PUBLIC_SUPABASE_URL 似乎不是标准的 Supabase URL')
  }

  if (!env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY 不能为空')
  } else if (!isValidJWT(env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
    errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY 必须是有效的 JWT 格式')
  } else if (env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length < 100) {
    warnings.push('NEXT_PUBLIC_SUPABASE_ANON_KEY 长度似乎不正确')
  }

  // 检查可选变量
  if (env.NEXT_PUBLIC_SITE_URL) {
    if (!isValidUrl(env.NEXT_PUBLIC_SITE_URL)) {
      errors.push('NEXT_PUBLIC_SITE_URL 必须是有效的 URL')
    } else {
      // 生产环境检查
      if (env.NODE_ENV === 'production' && env.NEXT_PUBLIC_SITE_URL.includes('localhost')) {
        warnings.push('生产环境不应使用 localhost URL')
      }
      // HTTPS 检查
      if (!env.NEXT_PUBLIC_SITE_URL.startsWith('https://') &&
          !env.NEXT_PUBLIC_SITE_URL.startsWith('http://localhost')) {
        warnings.push('建议在生产环境中使用 HTTPS')
      }
    }
  }

  return {
    success: errors.length === 0,
    errors,
    warnings
  }
}

// 加载环境变量文件
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {}
  }

  const content = fs.readFileSync(filePath, 'utf-8')
  const env = {}

  content.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=')
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim()
      }
    }
  })

  return env
}

// 显示验证结果
function displayResults(result, envName) {
  if (result.success) {
    console.log(colorize(`✅ ${envName} 环境变量验证通过`, 'green'))

    if (result.warnings && result.warnings.length > 0) {
      console.log(colorize('\n⚠️  发现以下警告:', 'yellow'))
      result.warnings.forEach(warning => {
        console.log(`   • ${warning}`)
      })
    }
  } else {
    console.log(colorize(`❌ ${envName} 环境变量验证失败`, 'red'))

    if (result.errors && result.errors.length > 0) {
      console.log(colorize('\n错误详情:', 'red'))
      result.errors.forEach(error => {
        console.log(`   • ${error}`)
      })
    }

    if (result.warnings && result.warnings.length > 0) {
      console.log(colorize('\n警告:', 'yellow'))
      result.warnings.forEach(warning => {
        console.log(`   • ${warning}`)
      })
    }
  }
}

// 显示环境变量摘要
function displaySummary(env) {
  console.log(colorize('\n📋 环境变量摘要:', 'blue'))
  console.log(`   Supabase URL: ${env.NEXT_PUBLIC_SUPABASE_URL || '未设置'}`)
  console.log(`   Site URL: ${env.NEXT_PUBLIC_SITE_URL || '未设置'}`)
  console.log(`   Node 环境: ${env.NODE_ENV || 'development'}`)
  console.log(`   Anon Key: ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '已设置' : '未设置'}`)
}

// 主函数
function main() {
  console.log(colorize('🔧 Mango 环境变量验证工具', 'bright'))
  console.log(colorize('==================================', 'cyan'))

  const envFiles = [
    { name: '.env.local', path: '.env.local' },
    { name: '.env.production', path: '.env.production' },
    { name: '.env.example', path: '.env.example' }
  ]

  let hasErrors = false

  // 验证当前进程环境变量
  console.log(colorize('\n🌍 当前环境变量 (process.env)', 'magenta'))
  const processResult = validateEnvironment(process.env, 'Process')
  displayResults(processResult, 'Process')
  displaySummary(process.env)

  if (!processResult.success) {
    hasErrors = true
  }

  // 验证环境文件
  envFiles.forEach(envFile => {
    if (fs.existsSync(envFile.path)) {
      console.log(colorize(`\n📄 ${envFile.name}`, 'magenta'))
      const env = loadEnvFile(envFile.path)
      const result = validateEnvironment(env, envFile.name)
      displayResults(result, envFile.name)

      if (envFile.name !== '.env.example') {
        displaySummary(env)
      }

      if (!result.success) {
        hasErrors = true
      }
    } else {
      console.log(colorize(`\n📄 ${envFile.name}: 文件不存在`, 'yellow'))
    }
  })

  // 显示建议
  console.log(colorize('\n💡 建议:', 'blue'))
  console.log('   1. 确保 .env.local 包含所有必需的环境变量')
  console.log('   2. 生产环境部署前验证所有配置')
  console.log('   3. 定期检查 Supabase 密钥是否有效')
  console.log('   4. 为不同环境使用不同的 Supabase 项目')

  // 显示相关文档
  console.log(colorize('\n📚 相关文档:', 'blue'))
  console.log('   • 环境配置: docs/AUTHENTICATION.md#设置和配置')
  console.log('   • 部署指南: docs/DEPLOYMENT.md')
  console.log('   • 生产配置: docs/PRODUCTION.md')

  if (hasErrors) {
    console.log(colorize('\n❌ 发现配置错误，请修复后重试', 'red'))
    process.exit(1)
  } else {
    console.log(colorize('\n✅ 所有环境变量配置正确！', 'green'))
    process.exit(0)
  }
}

// 运行脚本
if (require.main === module) {
  main()
}

module.exports = {
  validateEnvironment,
  loadEnvFile
}