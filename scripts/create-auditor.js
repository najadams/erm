const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('Creating Auditor account...')
  const password = await bcrypt.hash('auditor123', 10)

  const auditor = await prisma.user.upsert({
    where: { email: 'auditor@example.com' },
    update: {
      password,
      role: 'AUDITOR' // Ensure role is correct even if user exists
    },
    create: {
      email: 'auditor@example.com',
      name: 'Auditor User',
      password,
      role: 'AUDITOR',
    },
  })

  console.log(`Created/Updated Auditor User: ${auditor.email} with role ${auditor.role}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
