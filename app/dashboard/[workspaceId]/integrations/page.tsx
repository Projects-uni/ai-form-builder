import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getServerTranslations } from '@/lib/i18n/server'
import LanguageToggle from '@/app/components/LanguageToggle'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/Card'
import { Button } from '@/app/components/ui/Button'
import { Badge } from '@/app/components/ui/Badge'
import { LayoutDashboard, Webhook, ArrowRight, Table as TableIcon, MessageSquare, BookOpen } from 'lucide-react'

interface Props {
  params: Promise<{ workspaceId: string }>
}

export default async function WorkspaceIntegrationsPage({ params }: Props) {
  const { workspaceId } = await params
  const supabase = await createClient()
  const { t } = await getServerTranslations()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Check if they have any active webhooks (for the badge)
  const { count: webhookCount } = await supabase
    .from('webhooks')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)

  const integrations = [
    {
      id: 'webhooks',
      name: 'Webhooks',
      description: 'Send real-time form submission data to any external URL via HTTP POST.',
      icon: Webhook,
      color: 'text-indigo-500',
      bg: 'bg-indigo-100',
      status: webhookCount && webhookCount > 0 ? 'connected' : 'available',
      actionText: 'Manage Webhooks',
      href: `/dashboard/${workspaceId}/settings`, // Re-routing to settings since webhooks are managed there
    },
    {
      id: 'google-sheets',
      name: 'Google Sheets',
      description: 'Automatically sync all your form responses to a Google Sheet row by row.',
      icon: TableIcon,
      color: 'text-emerald-500',
      bg: 'bg-emerald-100',
      status: 'coming_soon',
      actionText: 'Connect',
      href: '#',
    },
    {
      id: 'slack',
      name: 'Slack',
      description: 'Get notified in a specific Slack channel every time a new response is submitted.',
      icon: MessageSquare,
      color: 'text-pink-500',
      bg: 'bg-pink-100',
      status: 'coming_soon',
      actionText: 'Connect',
      href: '#',
    },
    {
      id: 'notion',
      name: 'Notion',
      description: 'Send form responses straight into a Notion database for your team to manage.',
      icon: BookOpen,
      color: 'text-slate-700',
      bg: 'bg-slate-200',
      status: 'coming_soon',
      actionText: 'Connect',
      href: '#',
    }
  ]

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 font-sans">
      <header className="sticky top-0 z-20 flex h-24 items-center justify-between border-b-2 border-slate-200 bg-white/90 px-8 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <Link
            href={`/dashboard/${workspaceId}`}
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-black transition-colors shadow-sm"
          >
            <LayoutDashboard size={24} strokeWidth={3} />
          </Link>
          <div className="h-8 w-1 bg-slate-200 rounded-full"></div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">{t.sidebar?.integrations || 'Integrations'}</h1>
            <p className="text-lg font-bold text-slate-500">Connect your forms to third-party services</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <LanguageToggle />
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-8">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
          {integrations.map((integration) => {
            const Icon = integration.icon
            const isComingSoon = integration.status === 'coming_soon'
            const isConnected = integration.status === 'connected'

            return (
              <Card 
                key={integration.id} 
                className={`relative overflow-hidden border-2 transition-all duration-300 flex flex-col h-full
                  ${isComingSoon ? 'border-slate-100 bg-slate-50/50 opacity-80' : 'border-slate-200 bg-white hover:-translate-y-1 hover:shadow-xl hover:border-slate-300 shadow-sm'}
                `}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className={`flex size-14 items-center justify-center rounded-2xl ${integration.bg} shadow-sm`}>
                      <Icon className={`h-7 w-7 ${integration.color}`} strokeWidth={2.5} />
                    </div>
                    {isComingSoon && (
                      <Badge variant="secondary" className="font-bold text-xs uppercase tracking-widest bg-slate-200 text-slate-500">
                        Coming Soon
                      </Badge>
                    )}
                    {isConnected && (
                      <Badge variant="success" className="font-bold text-xs uppercase tracking-widest">
                        Connected
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-2xl font-black text-slate-900 mt-2">{integration.name}</CardTitle>
                </CardHeader>
                
                <CardContent className="flex flex-col flex-1">
                  <CardDescription className="text-base font-medium text-slate-500 mb-8 flex-1 leading-relaxed">
                    {integration.description}
                  </CardDescription>
                  
                  {isComingSoon ? (
                    <Button variant="secondary" className="w-full font-bold opacity-50 cursor-not-allowed" disabled>
                      Available Soon
                    </Button>
                  ) : (
                    <Link href={integration.href} className="w-full block">
                      <Button 
                        variant={isConnected ? "outline" : "default"} 
                        className={`w-full font-bold ${!isConnected && 'bg-black hover:bg-slate-800'}`}
                        rightIcon={!isConnected ? <ArrowRight size={18} strokeWidth={3} /> : undefined}
                      >
                        {integration.actionText}
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </main>
    </div>
  )
}
