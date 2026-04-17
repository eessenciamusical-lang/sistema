import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { hasSupabaseEnv, hasSupabaseServiceRole, supabaseAdmin } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

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
        if (!hasSupabaseEnv()) return null
        if (!hasSupabaseServiceRole()) return null

        const parsed = z
          .object({
            identifier: z.string().min(1),
            password: z.string().regex(/^\d{4,8}$/),
          })
          .safeParse({
            identifier: String(credentials?.identifier ?? '').trim(),
            password: String(credentials?.password ?? '').trim(),
          })

        if (!parsed.success) return null

        const identifier = parsed.data.identifier.toLowerCase()

        const { data: user, error } = await supabaseAdmin
          .from('User')
          .select('*')
          .or(`email.eq.${identifier},login.eq.${identifier}`)
          .maybeSingle()

        if (error || !user) return null
        if ((user as unknown as { active?: boolean | null }).active === false) return null

        const hash = (user as unknown as { passwordHash?: string | null }).passwordHash ?? ''
        if (!hash) return null

        const ok = await bcrypt.compare(parsed.data.password, hash)
        if (!ok) return null

        const role = (user as unknown as { role?: 'ADMIN' | 'MUSICIAN' }).role
        if (role !== 'ADMIN' && role !== 'MUSICIAN') return null

        return {
          id: String((user as unknown as { id: string }).id),
          name: String((user as unknown as { name: string }).name ?? ''),
          email: (user as unknown as { email?: string | null }).email ?? undefined,
          role,
        }
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

export const { handlers, signIn, signOut, auth } = next
