/**
 * MiniApp Permission Dialog Component
 * T090: Create MiniAppPermissionDialog component
 *
 * 小应用权限授予对话框
 */

'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// 权限目录
const PERMISSION_CATALOG: Record<string, { label: string; description: string; risk: 'low' | 'medium' | 'high' }> = {
  'user:read': {
    label: 'Read user information',
    description: 'Access your basic profile information',
    risk: 'low',
  },
  'user:write': {
    label: 'Modify user information',
    description: 'Update your profile settings',
    risk: 'medium',
  },
  'api:analytics': {
    label: 'Analytics API',
    description: 'Send analytics and usage data',
    risk: 'low',
  },
  'api:storage': {
    label: 'Storage API',
    description: 'Store and retrieve data locally',
    risk: 'low',
  },
  'system:notification': {
    label: 'Send notifications',
    description: 'Display system notifications',
    risk: 'medium',
  },
  'system:navigation': {
    label: 'Navigate pages',
    description: 'Navigate to other pages in the app',
    risk: 'low',
  },
  'network:external': {
    label: 'External network access',
    description: 'Make requests to external APIs',
    risk: 'high',
  },
  'storage:local': {
    label: 'Local storage',
    description: 'Access browser local storage',
    risk: 'low',
  },
}

interface PermissionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  miniAppName: string
  requiredPermissions: string[]
  onApprove: (grantedPermissions: string[]) => void
  onDeny: () => void
}

/**
 * PermissionDialog 组件
 * 展示小应用请求的权限并让用户授予
 */
export function PermissionDialog({
  open,
  onOpenChange,
  miniAppName,
  requiredPermissions,
  onApprove,
  onDeny,
}: PermissionDialogProps) {
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(
    new Set(requiredPermissions)
  )

  const togglePermission = (permission: string) => {
    const newSelected = new Set(selectedPermissions)
    if (newSelected.has(permission)) {
      newSelected.delete(permission)
    } else {
      newSelected.add(permission)
    }
    setSelectedPermissions(newSelected)
  }

  const handleApprove = () => {
    // 确保所有必需权限都被授予
    const allRequiredGranted = requiredPermissions.every((perm) =>
      selectedPermissions.has(perm)
    )

    if (!allRequiredGranted) {
      alert('Please grant all required permissions to install this mini app')
      return
    }

    onApprove(Array.from(selectedPermissions))
    onOpenChange(false)
  }

  const handleDeny = () => {
    onDeny()
    onOpenChange(false)
  }

  const getRiskColor = (risk: 'low' | 'medium' | 'high') => {
    switch (risk) {
      case 'low':
        return 'text-green-600 bg-green-50'
      case 'medium':
        return 'text-yellow-600 bg-yellow-50'
      case 'high':
        return 'text-red-600 bg-red-50'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Grant Permissions</DialogTitle>
          <DialogDescription>
            <strong>{miniAppName}</strong> is requesting the following permissions.
            Review and approve to continue installation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[400px] overflow-y-auto py-4">
          {requiredPermissions.map((permission) => {
            const info = PERMISSION_CATALOG[permission] || {
              label: permission,
              description: 'Unknown permission',
              risk: 'medium' as const,
            }

            const isSelected = selectedPermissions.has(permission)
            const isRequired = requiredPermissions.includes(permission)

            return (
              <div
                key={permission}
                className={cn(
                  'flex items-start gap-3 rounded-lg border p-4 transition-colors',
                  isSelected ? 'border-primary bg-primary/5' : 'border-border'
                )}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => togglePermission(permission)}
                  disabled={isRequired}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-50"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{info.label}</p>
                    {isRequired && (
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        Required
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {info.description}
                  </p>
                  <div className="mt-2">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                        getRiskColor(info.risk)
                      )}
                    >
                      {info.risk.charAt(0).toUpperCase() + info.risk.slice(1)} risk
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleDeny}>
            Deny
          </Button>
          <Button onClick={handleApprove}>
            Approve & Install
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
