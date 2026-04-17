import 'server-only'

import { supabaseAdmin } from '@/lib/db'

export async function auditLog(input: {
  actorUserId: string
  action: string
  targetUserId?: string | null
  targetType?: string | null
  metadata?: Record<string, unknown> | null
}) {
  try {
    await supabaseAdmin.from('AuditLog').insert({
      actorUserId: input.actorUserId,
      action: input.action,
      targetUserId: input.targetUserId ?? null,
      targetType: input.targetType ?? null,
      metadata: input.metadata ?? null,
      createdAt: new Date().toISOString(),
    })
  } catch {}
}

