import 'server-only'

import { supabaseAdmin } from '@/lib/db'
import { newId } from '@/lib/ids'

export async function auditLog(input: {
  actorUserId: string
  action: string
  targetUserId?: string | null
  targetType?: string | null
  metadata?: Record<string, unknown> | null
}) {
  try {
    await supabaseAdmin.from('AuditLog').insert({
      id: newId(),
      actorUserId: input.actorUserId,
      action: input.action,
      targetUserId: input.targetUserId ?? null,
      targetType: input.targetType ?? null,
      metadata: input.metadata ?? null,
      createdAt: new Date().toISOString(),
    })
  } catch {}
}
