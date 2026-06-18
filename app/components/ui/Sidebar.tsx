'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ClipboardList,
  BarChart3,
  Settings,
  CreditCard,
  LogOut,
  Sparkles,
  Users,
  Webhook,
  Activity
} from 'lucide-react'

interface SidebarProps {
  workspaceId: string
  workspaceName: string
  userEmail: string
  userRole: string
  t: any
}

export function Sidebar({ workspaceId, workspaceName, userEmail, userRole, t }: SidebarProps) {
  const pathname = usePathname()

  const navGroups = [
    {
      title: t.sidebar?.platform || 'Platform',
      items: [
        { label: t.sidebar?.dashboard || 'Dashboard', icon: LayoutDashboard, href: `/dashboard/${workspaceId}`, exact: true },
        { label: t.sidebar?.forms || 'Forms', icon: ClipboardList, href: `/dashboard/${workspaceId}/forms`, exact: false },
        { label: t.sidebar?.analytics || 'Analytics', icon: BarChart3, href: `/dashboard/${workspaceId}/analytics`, exact: false },
      ]
    },
    {
      title: t.sidebar?.workspace || 'Workspace',
      items: [
        { label: t.sidebar?.team || 'Team', icon: Users, href: `/dashboard/${workspaceId}/team`, exact: false },
        { label: t.sidebar?.integrations || 'Integrations', icon: Webhook, href: `/dashboard/${workspaceId}/integrations`, exact: false },
        { label: t.sidebar?.activityLog || 'Activity Log', icon: Activity, href: `/dashboard/${workspaceId}/activity`, exact: false },
        { label: t.sidebar?.settings || 'Settings', icon: Settings, href: `/dashboard/${workspaceId}/settings`, exact: false },
      ]
    }
  ]

  return (
    <aside className="hidden w-72 shrink-0 border-r-2 border-slate-200 bg-slate-50 px-6 py-8 lg:flex lg:flex-col">
      <Link href="/" className="mb-10 px-2 flex items-center gap-4 hover:opacity-80 transition-opacity">
        <div className="flex size-10 items-center justify-center rounded-xl bg-black text-white shadow-md">
          <Sparkles size={20} strokeWidth={3} />
        </div>
        <span className="text-xl font-black tracking-tight text-slate-900">FormBuilder</span>
      </Link>

      <div className="mb-8">
        <div className="flex items-center gap-4 rounded-2xl border-2 border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-100 text-lg font-bold text-indigo-900">
            {workspaceName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-base font-bold text-slate-900">{workspaceName}</p>
            <p className="truncate text-sm font-medium text-slate-500 capitalize">{userRole}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-8 overflow-y-auto">
        {navGroups.map((group, idx) => (
          <div key={idx}>
            <p className="px-2 text-sm font-bold uppercase tracking-widest text-slate-400 mb-3">
              {group.title}
            </p>
            <div className="space-y-2">
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive = item.exact 
                  ? pathname === item.href 
                  : pathname.startsWith(item.href)

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`flex items-center gap-4 rounded-xl px-4 py-3 text-base font-bold transition-all ${
                      isActive
                        ? 'bg-black text-white shadow-md'
                        : 'text-slate-600 hover:bg-slate-200 hover:text-black'
                    }`}
                  >
                    <Icon size={20} strokeWidth={isActive ? 3 : 2} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-black'} />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-auto pt-8">
        <div className="flex items-center justify-between px-2">
          <div className="overflow-hidden">
            <p className="truncate text-base font-bold text-slate-900">{userEmail}</p>
            <Link href="/auth/logout" className="text-sm font-semibold text-slate-500 hover:text-black transition-colors flex items-center gap-2 mt-2">
              <LogOut size={16} strokeWidth={3} />
              {t.sidebar?.signOut || 'Sign out'}
            </Link>
          </div>
        </div>
      </div>
    </aside>
  )
}
