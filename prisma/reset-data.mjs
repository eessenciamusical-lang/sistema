import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.notificationAck.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.assignment.deleteMany()
  await prisma.contract.deleteMany()
  await prisma.event.deleteMany()
  await prisma.client.deleteMany()
  await prisma.lead.deleteMany()
  await prisma.user.deleteMany({ where: { role: 'MUSICIAN' } })

  const counts = {
    users: await prisma.user.count(),
    musicians: await prisma.musicianProfile.count(),
    events: await prisma.event.count(),
    contracts: await prisma.contract.count(),
    payments: await prisma.payment.count(),
    leads: await prisma.lead.count(),
  }

  process.stdout.write(`RESET_OK ${JSON.stringify(counts)}\n`)
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (e) => {
    process.stderr.write(String(e) + '\n')
    await prisma.$disconnect()
    process.exit(1)
  })

