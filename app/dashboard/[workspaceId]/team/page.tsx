import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getServerTranslations } from '@/lib/i18n/server'
import LanguageToggle from '@/app/components/LanguageToggle'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/Card'
import { Button } from '@/app/components/ui/Button'
import { Badge } from '@/app/components/ui/Badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/Table'
import { LayoutDashboard, Users, Shield, Mail } from 'lucide-react'
import { InviteButtonClient } from './InviteButtonClient'

interface Props {
  params: Promise<{ workspaceId: string }>
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Unknown'
  try {
    return new Intl.DateTimeFormat('en', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(value))
  } catch (e) {
    return 'Unknown'
  }
}

// Generate consistent colors for avatars based on string
function getAvatarClass(id: string) {
  const gradients = [
    'bg-indigo-100 text-indigo-700',
    'bg-emerald-100 text-emerald-700',
    'bg-rose-100 text-rose-700',
    'bg-blue-100 text-blue-700',
    'bg-amber-100 text-amber-700',
    'bg-purple-100 text-purple-700',
  ]
  let sum = 0
  for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i)
  return gradients[sum % gradients.length]
}

export default async function WorkspaceTeamPage({ params }: Props) {
  const { workspaceId } = await params
  const supabase = await createClient()
  const { t } = await getServerTranslations()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Fetch all members in the workspace
  const { data: members, error } = await supabase
    .from('workspace_members')
    .select('*')
    .eq('workspace_id', workspaceId)

  if (error || !members) {
    console.error('Error fetching members:', error)
    // Don't redirect immediately so we can see the error in the server console,
    // or we can just render an error state.
    // redirect('/dashboard')
  }

  // Generate placeholder mock details for members since auth.users isn't joinable via public API
  const safeMembers = members || []
  const enrichedMembers = safeMembers.map((member) => {
    // If it's the current user, use their real email
    const isCurrentUser = member.user_id === user.id
    const email = isCurrentUser ? user.email : `member_${member.user_id.substring(0, 5)}@example.com`
    const name = isCurrentUser ? "You" : `Team Member ${member.user_id.substring(0, 3)}`
    
    return {
      ...member,
      email,
      name,
      isCurrentUser
    }
  })

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
            <h1 className="text-2xl font-black text-slate-900">{t.sidebar?.team || 'Team'}</h1>
            <p className="text-lg font-bold text-slate-500">Manage who has access to this workspace</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <LanguageToggle />
          <InviteButtonClient workspaceId={workspaceId} />
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-8 space-y-8">
        
        {/* KPI Cards */}
        <section className="grid gap-8 md:grid-cols-3">
          <Card className="border-2 border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-400">Total Members</CardTitle>
              <Users className="h-6 w-6 text-indigo-400" />
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-black text-slate-900">{safeMembers.length}</div>
            </CardContent>
          </Card>
          
          <Card className="border-2 border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-400">Owners</CardTitle>
              <Shield className="h-6 w-6 text-amber-400" />
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-black text-slate-900">
                {safeMembers.filter(m => m.role === 'owner').length}
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-indigo-400">Pending Invites</CardTitle>
              <Mail className="h-6 w-6 text-indigo-500" strokeWidth={2.5} />
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-black text-indigo-600">0</div>
            </CardContent>
          </Card>
        </section>

        {/* Team Members List */}
        <Card className="border-2 border-slate-100 shadow-sm flex flex-col">
          <CardHeader className="border-b-2 border-slate-50 bg-white pb-6">
            <CardTitle className="text-2xl font-black text-slate-900 flex items-center gap-3">
              <Users className="text-indigo-500" size={24} />
              Active Members
            </CardTitle>
            <CardDescription className="text-base font-medium mt-2 text-slate-500">
              Users who currently have access to this workspace and its forms.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="pl-6 font-bold text-slate-500">User</TableHead>
                  <TableHead className="font-bold text-slate-500">Role</TableHead>
                  <TableHead className="font-bold text-slate-500">Joined</TableHead>
                  <TableHead className="text-right pr-6 font-bold text-slate-500">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrichedMembers.map((member) => (
                  <TableRow key={member.user_id}>
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-4">
                        <div className={`flex size-10 shrink-0 items-center justify-center rounded-full font-bold ${getAvatarClass(member.user_id)}`}>
                          {member.email?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-2">
                            {member.name}
                            {member.isCurrentUser && (
                              <Badge variant="secondary" className="text-[10px] py-0 px-2 h-5">You</Badge>
                            )}
                          </div>
                          <p className="text-sm font-medium text-slate-500">{member.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={member.role === 'owner' ? 'default' : 'secondary'} className={member.role === 'owner' ? 'bg-amber-100 text-amber-900 hover:bg-amber-200' : ''}>
                        {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-600 font-medium">
                      {formatDate(member.created_at)}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button variant="ghost" size="sm" disabled={member.isCurrentUser}>
                        Manage
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
