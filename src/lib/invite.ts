import crypto from 'crypto'

const INVITE_TTL_HOURS = 48

export function generateInviteToken(): { token: string; tokenHash: string; expiresAt: string } {
  const token = crypto.randomBytes(32).toString('hex')
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  const expiresAt = new Date(Date.now() + INVITE_TTL_HOURS * 60 * 60 * 1000).toISOString()
  return { token, tokenHash, expiresAt }
}

export function hashInviteToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function generateBootstrapPassword(): string {
  return crypto.randomBytes(24).toString('hex')
}
