import 'server-only'

import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

function supabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
  if (!url) throw new Error('SUPABASE_URL missing')
  return url
}

function supabaseAnonKey() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY missing')
  return key
}

function supabaseServiceRoleKeyOrNull() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  return key && key.trim() ? key : null
}

export const supabaseAnon = createClient(supabaseUrl(), supabaseAnonKey(), {
  auth: { persistSession: false, autoRefreshToken: false },
})

export const supabaseAdmin = createClient(supabaseUrl(), supabaseServiceRoleKeyOrNull() ?? supabaseAnonKey(), {
  auth: { persistSession: false, autoRefreshToken: false },
})
