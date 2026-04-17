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

export function hasSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return Boolean(url && anon)
}

export function hasSupabaseServiceRole() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  return Boolean(key && key.trim())
}

const effectiveSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321'
const effectiveAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'invalid'
const effectiveAdminKey = (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY.trim()) || effectiveAnonKey

export const supabaseAnon = createClient(effectiveSupabaseUrl, effectiveAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

export const supabaseAdmin = createClient(effectiveSupabaseUrl, effectiveAdminKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})
