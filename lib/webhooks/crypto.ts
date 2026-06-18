import crypto from 'crypto'

/**
 * Generates a secure random 32-byte hex string to be used as a webhook secret key.
 */
export function generateWebhookSecret(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Generates an HMAC-SHA256 signature for a given payload and secret.
 * @param payload The JSON stringified payload
 * @param secret The webhook secret key
 * @returns The hex-encoded signature
 */
export function generateSignature(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex')
}
