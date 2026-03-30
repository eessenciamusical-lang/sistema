import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { createContractPdf } from '@/lib/pdf/contract-pdf'
import { renderToBuffer } from '@react-pdf/renderer'

export const runtime = 'nodejs'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') return new Response('Unauthorized', { status: 401 })

  const { id } = await params
  const contract = await prisma.contract.findUnique({
    where: { id },
    include: {
      event: {
        include: {
          client: true,
          assignments: { include: { musician: { include: { user: true } } } },
        },
      },
    },
  })

  if (!contract) return new Response('Not found', { status: 404 })

  const buffer = await renderToBuffer(
    createContractPdf({
      agencyName: 'Essência Musical',
      contract: {
        id: contract.id,
        status: contract.status,
        totalAmount: contract.totalAmount,
        terms: contract.terms,
        event: {
          title: contract.event.title,
          date: contract.event.date,
          locationName: contract.event.locationName,
          address: contract.event.address,
          city: contract.event.city,
          state: contract.event.state,
          client: contract.event.client
            ? { name: contract.event.client.name, email: contract.event.client.email, phone: contract.event.client.phone }
            : null,
          assignments: contract.event.assignments.map((a) => ({
            roleName: a.roleName,
            musician: { user: { name: a.musician.user.name } },
          })),
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
