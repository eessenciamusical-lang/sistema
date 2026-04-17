import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/db'
import { createContractPdf } from '@/lib/pdf/contract-pdf'
import { renderToBuffer } from '@react-pdf/renderer'

export const runtime = 'nodejs'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') return new Response('Unauthorized', { status: 401 })

  const { id } = await params
  const { data: contract, error: cErr } = await supabaseAdmin
    .from('Contract')
    .select('id,status,totalAmount,terms,eventId')
    .eq('id', id)
    .maybeSingle()
  if (cErr || !contract) return new Response('Not found', { status: 404 })

  const { data: event, error: evErr } = await supabaseAdmin
    .from('Event')
    .select('id,title,date,locationName,address,city,state,clientId')
    .eq('id', contract.eventId)
    .single()
  if (evErr || !event) return new Response('Not found', { status: 404 })

  const { data: client } = event.clientId
    ? await supabaseAdmin.from('Client').select('name,email,phone').eq('id', event.clientId).maybeSingle()
    : { data: null as null | { name: string; email: string | null; phone: string | null } }

  const { data: assignments } = await supabaseAdmin
    .from('Assignment')
    .select('id,musicianId,costCents,roleName')
    .eq('eventId', event.id)
    .order('createdAt', { ascending: true })

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

  const buffer = await renderToBuffer(
    createContractPdf({
      agencyName: 'Essência Musical',
      contract: {
        id: String(contract.id),
        status: contract.status as 'DRAFT' | 'SENT' | 'SIGNED' | 'CANCELLED',
        totalAmount: Number(contract.totalAmount) || 0,
        terms: (contract.terms as string | null) ?? '',
        event: {
          title: String(event.title),
          date: new Date(String(event.date)),
          locationName: (event.locationName as string | null) ?? null,
          address: (event.address as string | null) ?? null,
          city: (event.city as string | null) ?? null,
          state: (event.state as string | null) ?? null,
          client: client ? { name: String(client.name), email: client.email ?? null, phone: client.phone ?? null } : null,
          assignments: (assignments ?? []).map((a) => {
            const userId = userIdByMusicianId.get(String(a.musicianId)) ?? ''
            return {
              costCents: (a.costCents as number | null) ?? null,
              roleName: (a.roleName as string | null) ?? null,
              musician: { user: { name: userNameById.get(userId) ?? 'Músico' } },
            }
          }),
        },
      },
    }),
  )

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="contrato-${contract.id}.pdf"`,
      'Cache-Control': 'no-store',
    },
  })
}
