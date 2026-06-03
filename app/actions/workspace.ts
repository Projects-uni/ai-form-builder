'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function createWorkspace(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const name = formData.get('name') as string

  const { data: workspace, error } = await supabase
    .from('workspaces')
    .insert({ name, owner_id: user.id })
    .select()
    .single()

  if (error) throw new Error(error.message)

  redirect(`/dashboard/${workspace.id}`)
}

export async function getUserWorkspaces() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data, error } = await supabase
    .from('workspace_members')
    .select(`
      role,
      workspace:workspaces (
        id,
        name,
        plan_tier,
        created_at
      )
    `)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)

  return data
}