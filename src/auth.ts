import NextAuth from 'next-auth'
import type { Session } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/db'

const next = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET ?? 'open-access',
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      name: 'Credenciais',
      credentials: {
        identifier: { label: 'Login ou Email', type: 'text' },
        password: { label: 'Senha / PIN', type: 'password' },
      },
      authorize: async (credentials) => {
        const parsed = z
          .object({
            identifier: z.string().min(1),
            password: z.string().min(1),
          })
          .safeParse(credentials)

        if (!parsed.success) return null

        const identifier = parsed.data.identifier.trim().toLowerCase()
        const user = await prisma.user.findFirst({
          where: {
            OR: [{ email: identifier }, { login: identifier }],
          },
        })

        if (!user) return null
        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash)
        if (!ok) return null

        return { id: user.id, email: user.email ?? undefined, name: user.name, role: user.role }
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) token.role = (user as unknown as { role: string }).role
      return token
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.sub ?? ''
        session.user.role = token.role as 'ADMIN' | 'MUSICIAN'
      }
      return session
    },
  },
})

export const { handlers, signIn, signOut } = next

export const auth = async (): Promise<Session> => {
  return {
    user: {
      id: 'public',
      role: 'ADMIN',
      name: 'Público',
      email: 'public@local',
    },
    expires: '2099-01-01T00:00:00.000Z',
  }
}
