'use client'

import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface MCPPluginButtonProps {
  className?: string
}

export function MCPPluginButton({ className }: MCPPluginButtonProps) {
  const params = useParams()

  const handlePluginNavigation = () => {
    window.location.href = `/${params.locale}/ai-agent/plugins`
  }

  return (
    <Button className={className} onClick={handlePluginNavigation}>
      管理MCP插件
    </Button>
  )
}