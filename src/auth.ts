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

        const { data: anyUser } = await supabaseAdmin.from('User').select('id').limit(1)
        const hasAnyUser = Array.isArray(anyUser) ? anyUser.length > 0 : Boolean(anyUser)
        if (!hasAnyUser) {
          const bootstrapEmail = (process.env.BOOTSTRAP_ADMIN_EMAIL ?? '').trim().toLowerCase()
          const bootstrapLogin = (process.env.BOOTSTRAP_ADMIN_LOGIN ?? '').trim().toLowerCase()
          const bootstrapPin = (process.env.BOOTSTRAP_ADMIN_PIN ?? '').trim()
          if (bootstrapEmail && bootstrapPin && /^\d{4,8}$/.test(bootstrapPin) && identifier === bootstrapEmail && parsed.data.password === bootstrapPin) {
            const passwordHash = await bcrypt.hash(bootstrapPin, 10)
            const { data: created } = await supabaseAdmin
              .from('User')
              .insert({ name: 'Admin', email: bootstrapEmail, login: null, role: 'ADMIN', passwordHash, active: true })
              .select('id,name,email,role')
              .single()
            if (created) {
              return {
                id: String((created as unknown as { id: string }).id),
                name: String((created as unknown as { name: string }).name ?? ''),
                email: (created as unknown as { email?: string | null }).email ?? undefined,
                role: 'ADMIN',
              }
            }
          }

          if (bootstrapLogin && bootstrapPin && /^\d{4,8}$/.test(bootstrapPin) && identifier === bootstrapLogin && parsed.data.password === bootstrapPin) {
            const passwordHash = await bcrypt.hash(bootstrapPin, 10)
            const { data: created } = await supabaseAdmin
              .from('User')
              .insert({ name: bootstrapLogin, email: null, login: bootstrapLogin, role: 'ADMIN', passwordHash, active: true })
              .select('id,name,email,role')
              .single()
            if (created) {
              return {
                id: String((created as unknown as { id: string }).id),
                name: String((created as unknown as { name: string }).name ?? ''),
                email: (created as unknown as { email?: string | null }).email ?? undefined,
                role: 'ADMIN',
              }
            }
          }
        }

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
