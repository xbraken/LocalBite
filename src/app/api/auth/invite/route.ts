import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { userInvites, users } from '@/db/schema'
import { and, eq, isNull } from 'drizzle-orm'
import { hashInviteToken } from '@/lib/invite'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const tokenSchema = z.object({
  token: z.string().min(32),
})

const completeInviteSchema = z.object({
  token: z.string().min(32),
  password: z.string().min(8).max(128),
})

async function findActiveInvite(rawToken: string) {
  const tokenHash = hashInviteToken(rawToken)
  const invite = await db
    .select()
    .from(userInvites)
    .where(and(eq(userInvites.tokenHash, tokenHash), isNull(userInvites.usedAt)))
    .get()

  if (!invite) return null
  if (new Date(invite.expiresAt).getTime() <= Date.now()) return null
  return invite
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  const parsed = tokenSchema.safeParse({ token })
  if (!parsed.success) return NextResponse.json({ error: 'Invalid token' }, { status: 400 })

  const invite = await findActiveInvite(parsed.data.token)
  if (!invite) return NextResponse.json({ error: 'Invite is invalid or expired' }, { status: 404 })

  return NextResponse.json({
    email: invite.email,
    expiresAt: invite.expiresAt,
  })
}

export async function POST(req: NextRequest) {
  const parsed = completeInviteSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  const invite = await findActiveInvite(parsed.data.token)
  if (!invite) return NextResponse.json({ error: 'Invite is invalid or expired' }, { status: 404 })

  const passwordHash = await bcrypt.hash(parsed.data.password, 10)
  await db
    .update(users)
    .set({ passwordHash })
    .where(eq(users.id, invite.userId))

  await db
    .update(userInvites)
    .set({ usedAt: new Date().toISOString() })
    .where(eq(userInvites.id, invite.id))

  return NextResponse.json({ ok: true })
}
