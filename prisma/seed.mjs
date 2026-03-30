import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

function required(name) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing env var: ${name}`)
  return value
}

async function upsertUser({ email, password, name, role }) {
  const passwordHash = await bcrypt.hash(password, 10)
  return prisma.user.upsert({
    where: { email },
    update: { name, role, passwordHash },
    create: { email, name, role, passwordHash },
  })
}

async function main() {
  const admin = await upsertUser({
    email: required('SEED_ADMIN_EMAIL'),
    password: required('SEED_ADMIN_PASSWORD'),
    name: 'Admin',
    role: Role.ADMIN,
  })

  const musician = await upsertUser({
    email: required('SEED_MUSICIAN_EMAIL'),
    password: required('SEED_MUSICIAN_PASSWORD'),
    name: 'Músico',
    role: Role.MUSICIAN,
  })

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
      data: { name: 'Noivos (Exemplo)', email: 'noivos@exemplo.com', phone: '(00) 00000-0000' },
    }))

  const event = await prisma.event.create({
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
      contract: {
        create: {
          totalAmount: 500000,
          terms: 'Condições básicas do contrato (edite conforme necessário).',
        },
      },
      payments: {
        createMany: {
          data: [
            {
              direction: 'RECEIVABLE',
              amount: 250000,
              status: 'PENDING',
              note: 'Sinal',
            },
            {
              direction: 'PAYABLE',
              amount: 80000,
              status: 'PENDING',
              note: 'Cachê músico (exemplo)',
            },
          ],
        },
      },
    },
  })

  const musicianProfile = await prisma.musicianProfile.findUniqueOrThrow({ where: { userId: musician.id } })

  await prisma.assignment.create({
    data: {
      eventId: event.id,
      musicianId: musicianProfile.id,
      status: 'CONFIRMED',
      roleName: 'Voz',
    },
  })

  await prisma.user.update({
    where: { id: admin.id },
    data: { name: 'Admin' },
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
