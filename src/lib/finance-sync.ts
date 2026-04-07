import { prisma } from '@/lib/db'

export async function syncContractFinance(contractId: string) {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: {
      event: {
        include: {
          assignments: { include: { musician: { include: { user: true } } } },
        },
      },
    },
  })

  if (!contract) return
  if (contract.status !== 'SIGNED') return

  const assignmentIds = contract.event.assignments.map((a) => a.id)

  const existingReceivable = await prisma.payment.findUnique({
    where: { contractId: contract.id },
    select: { id: true, status: true, paidAt: true },
  })

  if (existingReceivable) {
    await prisma.payment.update({
      where: { id: existingReceivable.id },
      data: {
        amount: contract.totalAmount,
        type: 'CONTRACT_RECEIVABLE',
        direction: 'RECEIVABLE',
        dueDate: contract.event.date,
        note: 'Contrato (valor a receber)',
      },
    })
  } else {
    await prisma.payment.create({
      data: {
        eventId: contract.eventId,
        contractId: contract.id,
        type: 'CONTRACT_RECEIVABLE',
        direction: 'RECEIVABLE',
        amount: contract.totalAmount,
        status: 'PENDING',
        dueDate: contract.event.date,
        note: 'Contrato (valor a receber)',
      },
    })
  }

  await prisma.payment.deleteMany({
    where: {
      eventId: contract.eventId,
      type: 'MUSICIAN_PAYABLE',
      assignmentId: { notIn: assignmentIds },
    },
  })

  const existingPayables = await prisma.payment.findMany({
    where: { assignmentId: { in: assignmentIds } },
    select: { id: true, assignmentId: true },
  })
  const payableByAssignment = new Map(existingPayables.map((p) => [p.assignmentId ?? '', p.id]))

  await Promise.all(
    contract.event.assignments.map(async (a) => {
      const existingId = payableByAssignment.get(a.id)
      if (existingId) {
        await prisma.payment.update({
          where: { id: existingId },
          data: {
            amount: a.costCents ?? 0,
            type: 'MUSICIAN_PAYABLE',
            direction: 'PAYABLE',
            dueDate: contract.event.date,
            note: `Cachê: ${a.musician.user.name}`,
          },
        })
        return
      }

      await prisma.payment.create({
        data: {
          eventId: contract.eventId,
          assignmentId: a.id,
          type: 'MUSICIAN_PAYABLE',
          direction: 'PAYABLE',
          amount: a.costCents ?? 0,
          status: 'PENDING',
          dueDate: contract.event.date,
          note: `Cachê: ${a.musician.user.name}`,
        },
      })
    }),
  )
}
