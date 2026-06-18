import { describe, it, expect } from 'vitest'
import { generateWebhookSecret, generateSignature } from './crypto'

describe('Webhook Crypto', () => {
  it('should generate a 64-character hex secret', () => {
    const secret = generateWebhookSecret()
    expect(secret).toBeTypeOf('string')
    expect(secret.length).toBe(64)
    expect(/^[0-9a-f]{64}$/.test(secret)).toBe(true)
  })

  it('should generate correct HMAC-SHA256 signature', () => {
    const secret = 'my-super-secret-key'
    const payload = JSON.stringify({ event_type: 'test', data: 123 })
    
    const signature = generateSignature(payload, secret)
    
    // Expected signature computed with standard crypto
    // crypto.createHmac('sha256', 'my-super-secret-key').update('{"event_type":"test","data":123}').digest('hex')
    const expected = '7c0658efe5302152afb5803844b30d7eda97aca53bfc7f783bb39ef6689c88a4'
    
    expect(signature).toBe(expected)
  })

  it('should generate different signatures for different payloads', () => {
    const secret = 'secret'
    const sig1 = generateSignature('payload1', secret)
    const sig2 = generateSignature('payload2', secret)
    expect(sig1).not.toBe(sig2)
  })

  it('should generate different signatures for different secrets', () => {
    const payload = 'same-payload'
    const sig1 = generateSignature(payload, 'secret1')
    const sig2 = generateSignature(payload, 'secret2')
    expect(sig1).not.toBe(sig2)
  })
})
