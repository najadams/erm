const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const password = await bcrypt.hash('password123', 10)

  // Clean up existing data (optional, but good for idempotent seeds if not using reset)
  // await prisma.record.deleteMany()
  // await prisma.user.deleteMany()
  // await prisma.group.deleteMany()

  // 1. Create Groups
  const itGroup = await prisma.group.create({
    data: { name: 'IT', type: 'DEPARTMENT' }
  })
  const hrGroup = await prisma.group.create({
    data: { name: 'HR', type: 'DEPARTMENT' }
  })
  const financeGroup = await prisma.group.create({
    data: { name: 'Finance', type: 'DEPARTMENT' }
  })

  // 2. Create Users
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      password,
      role: 'ADMIN',
    },
  })

  const alice = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      email: 'alice@example.com',
      name: 'Alice (IT)',
      password,
      role: 'USER',
      groups: {
        connect: { id: itGroup.id }
      }
    },
  })

  const bob = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: {
      email: 'bob@example.com',
      name: 'Bob (HR)',
      password,
      role: 'USER',
      groups: {
        connect: { id: hrGroup.id }
      }
    },
  })
  
  // Connect Bob to HR if upsert didn't handle it (upsert create handles it, update doesn't here)
  await prisma.user.update({
      where: { email: 'bob@example.com' },
      data: { groups: { connect: { id: hrGroup.id } } }
  })
  await prisma.user.update({
      where: { email: 'alice@example.com' },
      data: { groups: { connect: { id: itGroup.id } } }
  })

  // 3. Create Records
  // Public Record
  await prisma.record.create({
    data: {
      title: 'Company Policy',
      description: 'Public policy document for everyone.',
      fileUrl: '/uploads/policy.pdf',
      fileType: 'application/pdf',
      category: 'Policy',
      tags: JSON.stringify(['policy', 'public']),
      status: 'ACTIVE',
      visibility: 'PUBLIC',
      userId: admin.id,
    }
  })

  // Group Record (IT)
  await prisma.record.create({
    data: {
      title: 'IT Infrastructure Guide',
      description: 'Internal IT documentation.',
      fileUrl: '/uploads/it-guide.pdf',
      fileType: 'application/pdf',
      category: 'Technical',
      tags: JSON.stringify(['it', 'guide']),
      status: 'ACTIVE',
      visibility: 'GROUP',
      groupId: itGroup.id,
      userId: alice.id,
    }
  })

  // Group Record (HR)
  await prisma.record.create({
    data: {
      title: 'Employee Handbook',
      description: 'Confidential HR handbook.',
      fileUrl: '/uploads/hr-handbook.pdf',
      fileType: 'application/pdf',
      category: 'HR',
      tags: JSON.stringify(['hr', 'handbook']),
      status: 'ACTIVE',
      visibility: 'GROUP',
      groupId: hrGroup.id,
      userId: bob.id,
    }
  })

  // Private Record
  await prisma.record.create({
    data: {
      title: 'Alice Private Draft',
      description: 'Draft document only for Alice.',
      fileUrl: '/uploads/draft.pdf',
      fileType: 'application/pdf',
      category: 'Personal',
      tags: JSON.stringify(['draft', 'private']),
      status: 'PENDING',
      visibility: 'PRIVATE',
      userId: alice.id,
    }
  })

  console.log('Seeding finished.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
