import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getUserWorkspaces, createWorkspace } from '../actions/workspace'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const workspaces = await getUserWorkspaces()

  // If user already has a workspace, go straight to it
  if (workspaces && workspaces.length > 0) {
    const validWorkspace = workspaces.find((w: any) => w.workspace !== null)
    if (validWorkspace) {
      const workspace = validWorkspace.workspace as { id: string } | { id: string }[]
      const first = Array.isArray(workspace) ? workspace[0] : workspace
      if (first && first.id) {
        redirect(`/dashboard/${first.id}`)
      }
    }
  }

  // No workspace yet — show create form
  return (
    <div style={{ maxWidth: 480, margin: '100px auto', padding: '0 20px' }}>
      <h1 style={{ marginBottom: 8 }}>Welcome 👋</h1>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 32 }}>
        Create your first workspace to get started.
      </p>
      <form action={createWorkspace}>
        <input
          name="name"
          placeholder="My workspace"
          required
          style={{
            width: '100%',
            padding: 10,
            fontSize: 14,
            boxSizing: 'border-box',
            marginBottom: 12,
            border: '1px solid #e0e0e0',
            borderRadius: 6
          }}
        />
        <button
          type="submit"
          style={{
            width: '100%',
            padding: 10,
            background: '#18181b',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: 14,
            cursor: 'pointer'
          }}
        >
          Create workspace
        </button>
      </form>
    </div>
  )
}
