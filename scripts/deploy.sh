#!/usr/bin/env bash
set -euo pipefail

# Mango 本地一键部署脚本
# 用法: bash scripts/deploy.sh [--all|--db|--functions|--web|--cli]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# 加载环境变量文件
load_env_file() {
  local env_file="$PROJECT_ROOT/.env.local"
  if [[ -f "$env_file" ]]; then
    log_info "加载环境变量文件: $env_file"
    set -a
    source "$env_file"
    set +a
  else
    log_warn "未找到环境变量文件: $env_file"
  fi
}

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Supabase CLI wrapper for cross-platform compatibility
supabase_cmd() {
  if command -v supabase &>/dev/null; then
    supabase "$@"
  elif which supabase.exe &>/dev/null; then
    supabase.exe "$@"
  else
    log_error "Supabase CLI not found"
    exit 1
  fi
}

# 部署目标标志
DEPLOY_DB=false
DEPLOY_FUNCTIONS=false
DEPLOY_WEB=false
DEPLOY_CLI=false

# 解析参数
parse_args() {
  if [ $# -eq 0 ] || [ "$1" = "--all" ]; then
    DEPLOY_DB=true
    DEPLOY_FUNCTIONS=true
    DEPLOY_WEB=true
    DEPLOY_CLI=true
    return
  fi

  while [ $# -gt 0 ]; do
    case "$1" in
      --db)        DEPLOY_DB=true ;;
      --functions) DEPLOY_FUNCTIONS=true ;;
      --web)       DEPLOY_WEB=true ;;
      --cli)       DEPLOY_CLI=true ;;
      --all)       DEPLOY_DB=true; DEPLOY_FUNCTIONS=true; DEPLOY_WEB=true; DEPLOY_CLI=true ;;
      *)           log_error "未知参数: $1"; echo "用法: deploy.sh [--all|--db|--functions|--web|--cli]"; exit 1 ;;
    esac
    shift
  done
}

# Node.js version extraction with fallback
extract_version() {
  local package_json="$1"
  
  # Try Node.js first
  if command -v node &>/dev/null; then
    node -p "require('$package_json').version" 2>/dev/null && return 0
  fi
  
  # Fallback: extract version using grep and sed
  if [[ -f "$package_json" ]]; then
    grep '"version"' "$package_json" | sed 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' | head -1
  else
    log_error "Package.json not found: $package_json"
    exit 1
  fi
}

# 前置检查
preflight_check() {
  log_info "运行前置检查..."

  # 检查 supabase CLI
  if [[ "$DEPLOY_DB" == "true" || "$DEPLOY_FUNCTIONS" == "true" ]] && ! command -v supabase &>/dev/null && ! which supabase.exe &>/dev/null; then
    log_error "未安装 supabase CLI，请运行: npm install -g supabase"
    exit 1
  fi

  # 检查环境变量
  if [[ "$DEPLOY_DB" == "true" || "$DEPLOY_FUNCTIONS" == "true" ]] && [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
    log_error "缺少 SUPABASE_ACCESS_TOKEN 环境变量"
    exit 1
  fi

  # 检查 npm 登录状态
  if [[ "$DEPLOY_CLI" == "true" ]] && ! npm whoami &>/dev/null; then
    log_warn "npm 未登录，CLI 发布可能失败"
  fi

  # 检查 Node.js 可用性 (仅用于 CLI 部署)
  if [[ "$DEPLOY_CLI" == "true" ]] && ! command -v node &>/dev/null; then
    log_warn "Node.js 未在 PATH 中找到，将使用备用方法提取版本"
  fi

  # 检查 git 工作区
  cd "$PROJECT_ROOT"
  if [ -n "$(git status --porcelain)" ]; then
    log_warn "git 工作区有未提交的更改"
  fi

  log_ok "前置检查通过"
}

# 数据库迁移
deploy_db() {
  if ! $DEPLOY_DB; then return; fi
  log_info "开始数据库迁移..."
  cd "$PROJECT_ROOT"

  supabase_cmd link --project-ref "${SUPABASE_PROJECT_REF:-}"
  supabase_cmd db push

  log_ok "数据库迁移完成"
}

# Edge Functions 部署
deploy_functions() {
  if ! $DEPLOY_FUNCTIONS; then return; fi
  log_info "开始部署 Edge Functions..."
  cd "$PROJECT_ROOT"

  FUNCTIONS=(
    extract-learning-rules
    generate-skill-embedding
    miniapp-mcp
    miniapp-scheduler
    process-agent-message
    process-task
    rag-search
    update-device-url
  )

  local total=${#FUNCTIONS[@]}
  local current=0

  for fn in "${FUNCTIONS[@]}"; do
    current=$((current + 1))
    log_info "[$current/$total] 部署 $fn..."
    supabase_cmd functions deploy "$fn" --project-ref "${SUPABASE_PROJECT_REF:-}"
    log_ok "$fn 部署成功"
  done

  log_ok "所有 Edge Functions 部署完成"
}

# Web 部署提示
deploy_web() {
  if ! $DEPLOY_WEB; then return; fi
  log_info "Web 应用通过 Vercel GitHub Integration 自动部署"
  log_info "请在 Vercel Dashboard 查看部署状态: https://vercel.com/dashboard"
  log_ok "Web 部署提示完成"
}

# CLI npm 发布
deploy_cli() {
  if ! $DEPLOY_CLI; then return; fi
  log_info "开始构建并发布 CLI..."
  cd "$PROJECT_ROOT"

  pnpm --filter @mango/shared build
  pnpm --filter mango-ai-cli build

  cd "$PROJECT_ROOT/apps/cli"
  local VERSION
  VERSION=$(extract_version "./package.json")

  # 检查版本是否已发布
  if npm view "mango-ai-cli@$VERSION" version &>/dev/null; then
    log_warn "版本 $VERSION 已发布，跳过"
    return
  fi

  log_info "发布 mango-ai-cli@$VERSION..."
  npm publish --access public

  log_ok "CLI v$VERSION 发布成功"
}

# 部署摘要
print_summary() {
  echo ""
  echo "========================================="
  echo "  Mango 部署摘要"
  echo "========================================="
  $DEPLOY_DB        && echo "  数据库迁移:     ✅"
  $DEPLOY_FUNCTIONS && echo "  Edge Functions:  ✅"
  $DEPLOY_WEB       && echo "  Web (Vercel):    ℹ️  请查看 Dashboard"
  $DEPLOY_CLI       && echo "  CLI (npm):       ✅"
  echo "========================================="
  echo ""
}

# 主函数
main() {
  parse_args "$@"

  echo ""
  log_info "Mango 部署开始"
  echo ""

  # 加载环境变量
  load_env_file

  preflight_check
  deploy_db
  deploy_functions
  deploy_web
  deploy_cli
  print_summary

  log_ok "部署流程完成"
}

main "$@"
