import { supabaseAdmin } from '@/lib/db'
import { newId } from '@/lib/ids'

export async function syncContractFinance(contractId: string) {
  const { data: contract, error: contractErr } = await supabaseAdmin
    .from('Contract')
    .select('id,eventId,totalAmount,status')
    .eq('id', contractId)
    .maybeSingle()
  if (contractErr || !contract) return
  if (contract.status !== 'SIGNED') return

  const { data: event, error: eventErr } = await supabaseAdmin.from('Event').select('id,date').eq('id', contract.eventId).single()
  if (eventErr || !event) return

  const { data: assignments, error: assignmentsErr } = await supabaseAdmin
    .from('Assignment')
    .select('id,musicianId,costCents')
    .eq('eventId', contract.eventId)
  if (assignmentsErr) return

  const assignmentIds = (assignments ?? []).map((a) => String(a.id))
  const musicianIds = Array.from(new Set((assignments ?? []).map((a) => String(a.musicianId)).filter(Boolean)))

  const { data: musicianProfiles } =
    musicianIds.length === 0
      ? { data: [] as Array<{ id: string; userId: string }> }
      : await supabaseAdmin.from('MusicianProfile').select('id,userId').in('id', musicianIds)

  const userIds = Array.from(new Set((musicianProfiles ?? []).map((m) => String(m.userId)).filter(Boolean)))
  const { data: users } =
    userIds.length === 0 ? { data: [] as Array<{ id: string; name: string }> } : await supabaseAdmin.from('User').select('id,name').in('id', userIds)

  const userNameById = new Map((users ?? []).map((u) => [String(u.id), String(u.name)]))
  const userIdByMusicianId = new Map((musicianProfiles ?? []).map((m) => [String(m.id), String(m.userId)]))

  const { data: existingReceivable } = await supabaseAdmin
    .from('Payment')
    .select('id,status,paidAt')
    .eq('contractId', contract.id)
    .maybeSingle()

  if (existingReceivable?.id) {
    await supabaseAdmin
      .from('Payment')
      .update({
        amount: contract.totalAmount,
        type: 'CONTRACT_RECEIVABLE',
        direction: 'RECEIVABLE',
        dueDate: event.date,
        note: 'Contrato (valor a receber)',
      })
      .eq('id', existingReceivable.id)
  } else {
    await supabaseAdmin.from('Payment').insert({
      id: newId(),
      eventId: contract.eventId,
      contractId: contract.id,
      type: 'CONTRACT_RECEIVABLE',
      direction: 'RECEIVABLE',
      amount: contract.totalAmount,
      status: 'PENDING',
      dueDate: event.date,
      note: 'Contrato (valor a receber)',
    })
  }

  if (assignmentIds.length === 0) {
    await supabaseAdmin.from('Payment').delete().eq('eventId', contract.eventId).eq('type', 'MUSICIAN_PAYABLE')
    return
  }

  await supabaseAdmin
    .from('Payment')
    .delete()
    .eq('eventId', contract.eventId)
    .eq('type', 'MUSICIAN_PAYABLE')
    .not('assignmentId', 'in', `(${assignmentIds.map((x) => `"${x}"`).join(',')})`)

  const { data: existingPayables } = await supabaseAdmin.from('Payment').select('id,assignmentId').in('assignmentId', assignmentIds)
  const payableByAssignment = new Map((existingPayables ?? []).map((p) => [String(p.assignmentId ?? ''), String(p.id)]))

  for (const a of assignments ?? []) {
    const assignmentId = String(a.id)
    const existingId = payableByAssignment.get(assignmentId)
    const musicianId = String(a.musicianId)
    const userId = userIdByMusicianId.get(musicianId) ?? ''
    const musicianName = userNameById.get(userId) ?? 'Músico'

    if (existingId) {
      await supabaseAdmin
        .from('Payment')
        .update({
          amount: a.costCents ?? 0,
          type: 'MUSICIAN_PAYABLE',
          direction: 'PAYABLE',
          dueDate: event.date,
          note: `Cachê: ${musicianName}`,
        })
        .eq('id', existingId)
      continue
    }

    await supabaseAdmin.from('Payment').insert({
      id: newId(),
      eventId: contract.eventId,
      assignmentId,
      type: 'MUSICIAN_PAYABLE',
      direction: 'PAYABLE',
      amount: a.costCents ?? 0,
      status: 'PENDING',
      dueDate: event.date,
      note: `Cachê: ${musicianName}`,
    })
  }
}
