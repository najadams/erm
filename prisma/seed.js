const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed...')
  const password = await bcrypt.hash('password123', 10)

  // 0. Clean up (Order matters due to FKs)
  // Be careful with deleteMany in production!
  /*
  await prisma.recordMetadata.deleteMany()
  await prisma.recordVersion.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.recordAccess.deleteMany() // Access permissions
  await prisma.record.deleteMany()
  await prisma.recordTypeMetadata.deleteMany()
  await prisma.metadataField.deleteMany()
  await prisma.recordType.deleteMany()
  await prisma.recordCategory.deleteMany()
  await prisma.department.deleteMany()
  await prisma.organization.deleteMany()
  await prisma.user.deleteMany()
  await prisma.group.deleteMany()
  */

  // 1. Create Organization
  const org = await prisma.organization.create({
    data: { name: 'GIPC Enterprise', status: 'ACTIVE' }
  })
  console.log(`Created Organization: ${org.name}`)

  // 2. Create Departments & Groups
  // We keep Groups for legacy user grouping, but also create Departments for Record hierarchy
  const deptsData = [
    { name: 'Human Resources', code: 'HR' },
    { name: 'Information Technology', code: 'IT' },
    { name: 'Finance', code: 'FIN' }
  ]

  const departments = {} // Map code -> ID
  const groups = {}

  for (const d of deptsData) {
    const dept = await prisma.department.create({
      data: {
        name: d.name,
        code: d.code,
        organizationId: org.id
      }
    })
    departments[d.code] = dept

    // Also create a corresponding Group
    const group = await prisma.group.create({
      data: { name: d.code, type: 'DEPARTMENT' }
    })
    groups[d.code] = group
  }

  // 3. Create Users
  const users = []
  
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
  users.push(admin)

  const alice = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      email: 'alice@example.com',
      name: 'Alice (IT)',
      password,
      role: 'USER',
      groups: { connect: { id: groups['IT'].id } }
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
      groups: { connect: { id: groups['HR'].id } }
    },
  })

  // 4. Create Record Categories & Types & Metadata
  
  // Metadata Fields
  const fields = {}
  const metadataDefs = [
    { name: 'invoice_number', label: 'Invoice Number', dataType: 'text', required: true, searchable: true },
    { name: 'invoice_amount', label: 'Amount', dataType: 'number', required: true, searchable: false },
    { name: 'effective_date', label: 'Effective Date', dataType: 'date', required: true, searchable: true },
    { name: 'vendor_name', label: 'Vendor Name', dataType: 'text', required: true, searchable: true },
    { name: 'confidentiality', label: 'Confidentiality Level', dataType: 'enum', enumValues: '["Low", "Medium", "High"]', required: false },
  ]

  for (const f of metadataDefs) {
    const field = await prisma.metadataField.upsert({
      where: { name: f.name },
      update: {},
      create: f
    })
    fields[f.name] = field
  }

  // Categories & Types
  const categoriesData = [
    { 
      name: 'Financial', 
      types: [
        { name: 'Invoice', code: 'INV', fields: ['invoice_number', 'invoice_amount', 'vendor_name'] },
        { name: 'Purchase Order', code: 'PO', fields: ['vendor_name', 'invoice_amount'] }
      ]
    },
    { 
      name: 'Legal', 
      types: [
        { name: 'Contract', code: 'CNT', fields: ['effective_date', 'vendor_name', 'confidentiality'] },
        { name: 'NDA', code: 'NDA', fields: ['effective_date', 'vendor_name'] }
      ]
    },
    {
      name: 'General',
      types: [
        { name: 'Policy', code: 'POL', fields: ['effective_date'] },
        { name: 'Memo', code: 'MEM', fields: [] }
      ]
    }
  ]

  const recordTypes = {} // code -> ID

  for (const c of categoriesData) {
    const cat = await prisma.recordCategory.create({
      data: {
        name: c.name,
        organizationId: org.id,
        defaultVisibility: 'PRIVATE'
      }
    })

    for (const t of c.types) {
      const rType = await prisma.recordType.create({
        data: {
          name: t.name,
          code: t.code,
          categoryId: cat.id
        }
      })
      recordTypes[t.code] = rType

      // Link Fields
      let order = 1
      for (const fname of t.fields) {
        await prisma.recordTypeMetadata.create({
          data: {
            recordTypeId: rType.id,
            metadataFieldId: fields[fname].id,
            displayOrder: order++,
            editable: true
          }
        })
      }
    }
  }

  // 5. Create Sample Records
  
  // Ex 1: Invoice (Alice)
  const invRecord = await prisma.record.create({
    data: {
      title: 'Q4 Server Payment',
      status: 'ACTIVE',
      recordTypeId: recordTypes['INV'].id,
      departmentId: departments['IT'].id,
      ownerUserId: alice.id,
      createdAt: new Date(),
    }
  })
  // Version
  await prisma.recordVersion.create({
    data: {
      recordId: invRecord.id,
      versionNumber: 1,
      filePath: '/uploads/inv-2025-001.pdf',
      fileType: 'application/pdf',
      uploadedById: alice.id,
      createdAt: new Date()
    }
  })
  // Metadata
  await prisma.recordMetadata.createMany({
    data: [
      { recordId: invRecord.id, metadataFieldId: fields['invoice_number'].id, value: 'INV-2025-001' },
      { recordId: invRecord.id, metadataFieldId: fields['invoice_amount'].id, value: '4500.00' },
      { recordId: invRecord.id, metadataFieldId: fields['vendor_name'].id, value: 'AWS Services' }
    ]
  })

  // Ex 2: Contract (Bob - HR)
  const contractRecord = await prisma.record.create({
    data: {
      title: 'Employment Agreement - John Doe',
      status: 'ACTIVE',
      recordTypeId: recordTypes['CNT'].id,
      departmentId: departments['HR'].id,
      ownerUserId: bob.id,
    }
  })
  await prisma.recordVersion.create({
    data: {
      recordId: contractRecord.id,
      versionNumber: 1,
      filePath: '/uploads/contract-jdoe.pdf',
      fileType: 'application/pdf',
      uploadedById: bob.id
    }
  })
  await prisma.recordMetadata.create({
      data: { recordId: contractRecord.id, metadataFieldId: fields['confidentiality'].id, value: 'High' }
  })
  
  // Set explicit permissions (optional, relying on logic otherwise)
  // await prisma.recordAccess.create({...})

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
