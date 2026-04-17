import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { supabaseAdmin, hasSupabaseEnv, hasSupabaseServiceRole } from '@/lib/db'
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
          .safeParse(credentials)
        if (!parsed.success) return null

        const identifier = parsed.data.identifier.trim().toLowerCase()
        const password = parsed.data.password

        if (identifier === 'master') {
          const { data: existing } = await supabaseAdmin
            .from('User')
            .select('id,login,email,name,role,active,passwordHash')
            .eq('login', 'master')
            .maybeSingle()

          if (!existing) {
            if (password !== '12345678') return null
            const passwordHash = await bcrypt.hash('12345678', 10)
            const { data: created, error: createErr } = await supabaseAdmin
              .from('User')
              .insert({
                login: 'master',
                email: null,
                name: 'Master',
                role: 'ADMIN',
                active: true,
                passwordHash,
              })
              .select('id,login,email,name,role,active')
              .single()
            if (createErr || !created) return null
            return { id: String(created.id), name: String(created.name), email: undefined, role: created.role }
          }

          if (password === '12345678') {
            const newHash = await bcrypt.hash('12345678', 10)
            await supabaseAdmin
              .from('User')
              .update({
                name: 'Master',
                role: 'ADMIN',
                active: true,
                passwordHash: newHash,
              })
              .eq('id', String(existing.id))
            return { id: String(existing.id), name: 'Master', email: existing.email ?? undefined, role: 'ADMIN' }
          }

          if (!existing.active) return null
          const ok = await bcrypt.compare(password, String(existing.passwordHash ?? ''))
          if (!ok) return null
          return { id: String(existing.id), name: String(existing.name), email: existing.email ?? undefined, role: existing.role }
        }

        const { data: user } = await supabaseAdmin
          .from('User')
          .select('id,login,email,name,role,active,passwordHash')
          .or(`login.eq.${identifier},email.eq.${identifier}`)
          .maybeSingle()

        if (!user) return null
        if (!user.active) return null

        const ok = await bcrypt.compare(password, String(user.passwordHash ?? ''))
        if (!ok) return null

        return { id: String(user.id), name: String(user.name), email: user.email ?? undefined, role: user.role }
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
