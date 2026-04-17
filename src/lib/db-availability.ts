import { supabaseAdmin } from '@/lib/db'

const globalForDb = globalThis as unknown as {
  __dbOkCache?: { value: boolean; at: number }
}

export async function isDbAvailable() {
  const cached = globalForDb.__dbOkCache
  const now = Date.now()
  if (cached && now - cached.at < 30_000) return cached.value

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) {
    globalForDb.__dbOkCache = { value: false, at: now }
    return false
  }

  try {
    const { error } = await supabaseAdmin.from('User').select('id').limit(1)
    const ok = !error
    globalForDb.__dbOkCache = { value: ok, at: now }
    return ok
  } catch {
    globalForDb.__dbOkCache = { value: false, at: now }
    return false
  }
}
