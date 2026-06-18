import { supabaseAdmin } from '@/lib/supabase/admin'
import { generateSignature } from './crypto'

export interface WebhookPayload {
  event_type: string
  form_id: string
  workspace_id: string
  submitted_at: string
  respondent_meta: unknown
  answers: unknown
}

export async function triggerWebhooks(workspaceId: string, payload: WebhookPayload) {
  // Fetch active webhooks for this workspace
  const { data: webhooks, error } = await supabaseAdmin
    .from('webhooks')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('event_type', payload.event_type)
    .eq('is_active', true)

  if (error || !webhooks || webhooks.length === 0) {
    return
  }

  const payloadString = JSON.stringify(payload)

  // Fire requests asynchronously without blocking
  webhooks.forEach((webhook) => {
    const signature = generateSignature(payloadString, webhook.secret_key)

    fetch(webhook.target_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
      },
      body: payloadString,
    }).catch((err) => {
      console.error(`Failed to trigger webhook ${webhook.id}:`, err)
      // In a production system, you might record failures to a logs table here.
    })
  })
}
