'use server'

import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { generateInviteToken, verifyInviteToken } from '@/lib/inviteToken'
import { headers } from 'next/headers'

import nodemailer from 'nodemailer'
import { InviteEmail } from '@/app/components/emails/InviteEmail'
import { render } from '@react-email/render'

export async function sendInviteEmail(workspaceId: string, role: string, email: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  // Check if current user is an owner/admin of this workspace
  const { data: member } = await supabase
    .from('workspace_members')
    .select('role, workspaces(name)')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()

  if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
    throw new Error('Only owners and admins can invite members.')
  }

  const workspaceName = (member.workspaces as any)?.name || 'a workspace'

  const token = generateInviteToken(workspaceId, role)
  
  // Create full absolute URL
  const headersList = await headers()
  const host = headersList.get('host') || 'localhost:3000'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  
  const inviteUrl = `${protocol}://${host}/invite?token=${token}`

  // Send Email via Nodemailer
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error('Email provider not configured. Please add GMAIL_USER and GMAIL_APP_PASSWORD to your .env.local')
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })

  // Render the React component to an HTML string
  const emailHtml = await render(
    InviteEmail({
      inviterEmail: user.email || 'Admin',
      workspaceName: workspaceName,
      role: role,
      inviteLink: inviteUrl
    })
  )

  try {
    const info = await transporter.sendMail({
      from: `"AI Form Builder" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: `You've been invited to join ${workspaceName}`,
      html: emailHtml,
    })
    
    return { success: true, id: info.messageId }
  } catch (error: any) {
    throw new Error(error.message || 'Failed to send email.')
  }
}

export async function acceptInvite(token: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'unauthorized', redirectUrl: `/auth/login?next=/invite?token=${token}` }
  }

  const payload = verifyInviteToken(token)
  if (!payload) {
    return { success: false, error: 'invalid_or_expired' }
  }

  // Check if already a member
  const { data: existingMember } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', payload.workspaceId)
    .eq('user_id', user.id)
    .single()

  if (existingMember) {
    return { success: true, redirectUrl: `/dashboard/${payload.workspaceId}` }
  }

  // Insert into workspace_members using the Admin client to bypass RLS
  // because the current user is not yet part of the workspace.
  const { error } = await supabaseAdmin
    .from('workspace_members')
    .insert({
      workspace_id: payload.workspaceId,
      user_id: user.id,
      role: payload.role
    })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, redirectUrl: `/dashboard/${payload.workspaceId}` }
}
