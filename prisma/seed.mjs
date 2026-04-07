import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function upsertUserByLogin({ login, name, role }) {
  const passwordHash = await bcrypt.hash(`${login}-${Date.now()}`, 10)
  return prisma.user.upsert({
    where: { login },
    update: { name, role, passwordHash, email: null },
    create: { login, email: null, name, role, passwordHash },
  })
}

async function main() {
  const admin = await upsertUserByLogin({ login: 'public', name: 'Público', role: Role.ADMIN })
  const musician = await upsertUserByLogin({ login: 'musico', name: 'Músico', role: Role.MUSICIAN })

  await prisma.musicianProfile.upsert({
    where: { userId: musician.id },
    update: {
      phone: '(00) 00000-0000',
      instrument: 'Voz',
      bio: 'Perfil inicial (ajuste depois).',
    },
    create: {
      userId: musician.id,
      phone: '(00) 00000-0000',
      instrument: 'Voz',
      bio: 'Perfil inicial (ajuste depois).',
    },
  })

  const existingClient = await prisma.client.findFirst({ where: { name: 'Noivos (Exemplo)' } })
  const client =
    existingClient ??
    (await prisma.client.create({
      data: { name: 'Noivos (Exemplo)', email: null, phone: '(00) 00000-0000' },
    }))

  const existingEvent = await prisma.event.findFirst({ where: { title: 'Casamento (Exemplo)' } })
  const createdOrExistingEventId =
    existingEvent?.id ??
    (
      await prisma.event.create({
        data: {
          title: 'Casamento (Exemplo)',
          date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
          locationName: 'Espaço do Evento',
          address: 'Rua Exemplo, 123',
          city: 'Cidade',
          state: 'UF',
          mapUrl: 'https://www.google.com/maps/search/?api=1&query=Rua%20Exemplo%2C%20123%2C%20Cidade%20UF',
          notes: 'Anotações do evento.',
          timeline: '19:00 Chegada\n19:30 Cerimônia\n20:30 Recepção',
          repertoire: 'Entrada: Música 1\nAssinatura: Música 2\nSaída: Música 3',
          clientId: client.id,
        },
      })
    ).id

  const event = await prisma.event.findUniqueOrThrow({
    where: { id: createdOrExistingEventId },
    include: { contract: true },
  })

  const contract =
    event.contract ??
    (await prisma.contract.create({
      data: {
        eventId: event.id,
        totalAmount: 500000,
        terms: 'Condições básicas do contrato (edite conforme necessário).',
        status: 'SIGNED',
        signedAt: new Date(),
      },
    }))

  const musicianProfile = await prisma.musicianProfile.findUniqueOrThrow({ where: { userId: musician.id } })

  const assignment =
    (await prisma.assignment.findFirst({ where: { eventId: event.id, musicianId: musicianProfile.id } })) ??
    (await prisma.assignment.create({
      data: {
        eventId: event.id,
        musicianId: musicianProfile.id,
        status: 'CONFIRMED',
        roleName: 'Voz',
        costCents: 80000,
      },
    }))

  await prisma.payment.upsert({
    where: { contractId: contract.id },
    update: {
      eventId: event.id,
      type: 'CONTRACT_RECEIVABLE',
      direction: 'RECEIVABLE',
      amount: contract.totalAmount,
      status: 'PENDING',
      dueDate: event.date,
      note: 'Contrato (valor a receber)',
    },
    create: {
      eventId: event.id,
      type: 'CONTRACT_RECEIVABLE',
      direction: 'RECEIVABLE',
      contractId: contract.id,
      amount: contract.totalAmount,
      status: 'PENDING',
      dueDate: event.date,
      note: 'Contrato (valor a receber)',
    },
  })

  await prisma.payment.upsert({
    where: { assignmentId: assignment.id },
    update: {
      eventId: event.id,
      type: 'MUSICIAN_PAYABLE',
      direction: 'PAYABLE',
      amount: assignment.costCents ?? 0,
      status: 'PENDING',
      dueDate: event.date,
      note: `Cachê: ${musician.name}`,
    },
    create: {
      eventId: event.id,
      type: 'MUSICIAN_PAYABLE',
      direction: 'PAYABLE',
      assignmentId: assignment.id,
      amount: assignment.costCents ?? 0,
      status: 'PENDING',
      dueDate: event.date,
      note: `Cachê: ${musician.name}`,
    },
  })

  await prisma.user.update({
    where: { id: admin.id },
    data: { name: 'Público' },
  })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
