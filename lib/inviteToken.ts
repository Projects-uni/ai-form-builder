import crypto from 'crypto'

const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || 'default_secret_for_local_dev_only'

interface InvitePayload {
  workspaceId: string
  role: string
  exp: number
}

/**
 * Generates a signed, base64 encoded invite token containing the workspaceId and role.
 * Token expires in 7 days by default.
 */
export function generateInviteToken(workspaceId: string, role: string, expiresInDays = 7): string {
  const exp = Date.now() + expiresInDays * 24 * 60 * 60 * 1000
  const payload: InvitePayload = { workspaceId, role, exp }
  
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = crypto.createHmac('sha256', SECRET).update(data).digest('base64url')
  
  return `${data}.${signature}`
}

/**
 * Verifies the invite token and returns the payload if valid and not expired.
 * Returns null if invalid or expired.
 */
export function verifyInviteToken(token: string): InvitePayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 2) return null
    
    const [data, signature] = parts
    const expectedSignature = crypto.createHmac('sha256', SECRET).update(data).digest('base64url')
    
    if (signature !== expectedSignature) return null
    
    const payload: InvitePayload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'))
    
    if (Date.now() > payload.exp) return null // Expired
    
    return payload
  } catch (error) {
    return null
  }
}
