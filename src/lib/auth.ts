import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

declare module 'next-auth' {
  interface User {
    role: string
    restaurantId: number | null
  }
  interface Session {
    user: {
      id: string
      email: string
      role: string
      restaurantId: number | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: string
    restaurantId: number | null
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await db
          .select()
          .from(users)
          .where(eq(users.email, credentials.email as string))
          .get()

        if (!user) return null

        const valid = await bcrypt.compare(credentials.password as string, user.passwordHash)
        if (!valid) return null

        return {
          id: String(user.id),
          email: user.email,
          role: user.role,
          restaurantId: user.restaurantId,
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.restaurantId = user.restaurantId
      }
      return token
    },
    session({ session, token }) {
      session.user.role = token.role
      session.user.restaurantId = token.restaurantId
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: { strategy: 'jwt' },
})
