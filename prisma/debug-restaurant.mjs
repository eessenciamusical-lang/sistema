import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const contracts = await prisma.restaurantContract.findMany({
    include: { restaurant: true },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })

  const counts = {
    restaurants: await prisma.restaurant.count(),
    contracts: await prisma.restaurantContract.count(),
    restaurantEvents: await prisma.event.count({ where: { eventType: 'RESTAURANT' } }),
  }

  process.stdout.write(`${JSON.stringify({ counts, contracts }, null, 2)}\n`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    process.stderr.write(String(e) + '\n')
    await prisma.$disconnect()
    process.exit(1)
  })

