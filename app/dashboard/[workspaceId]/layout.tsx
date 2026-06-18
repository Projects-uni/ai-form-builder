import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/app/components/ui/Sidebar'
import { getServerTranslations } from '@/lib/i18n/server'

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{ workspaceId: string }>
}

export default async function WorkspaceLayout({ children, params }: LayoutProps) {
  const { workspaceId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: member } = await supabase
    .from('workspace_members')
    .select('role, workspaces(name)')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()

  if (!member) redirect('/dashboard')

  const workspaceName = (member.workspaces as any)?.name ?? 'Workspace'
  const { t } = await getServerTranslations()

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans">
      <Sidebar 
        workspaceId={workspaceId} 
        workspaceName={workspaceName} 
        userEmail={user.email ?? ''} 
        userRole={member.role}
        t={t}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  )
}
