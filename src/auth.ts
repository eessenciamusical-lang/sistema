import NextAuth from 'next-auth'
import type { Session } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'

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
      authorize: async () => null,
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
