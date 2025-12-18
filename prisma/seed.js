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
  // ─────────────────────
  // Core business metadata
  // ─────────────────────
  { name: 'invoice_number', label: 'Invoice Number', dataType: 'text', required: true, searchable: true },
  { name: 'invoice_amount', label: 'Amount', dataType: 'number', required: true, searchable: false },
  { name: 'currency', label: 'Currency', dataType: 'enum', enumValues: '["GHS", "USD", "EUR"]', required: true, searchable: true },
  { name: 'vendor_name', label: 'Vendor Name', dataType: 'text', required: true, searchable: true },
  { name: 'vendor_tax_id', label: 'Vendor Tax ID', dataType: 'text', required: false, searchable: true },

  // ─────────────────────
  // Date & financial context
  // ─────────────────────
  { name: 'issue_date', label: 'Issue Date', dataType: 'date', required: true, searchable: true },
  { name: 'effective_date', label: 'Effective Date', dataType: 'date', required: true, searchable: true },
  { name: 'due_date', label: 'Payment Due Date', dataType: 'date', required: false, searchable: true },
  { name: 'tax_amount', label: 'Tax Amount', dataType: 'number', required: false, searchable: false },

  // ─────────────────────
  // Classification & linkage
  // ─────────────────────
  { name: 'department', label: 'Department', dataType: 'enum', enumValues: '["Finance", "Procurement", "Operations"]', required: true, searchable: true },
  { name: 'cost_center', label: 'Cost Center', dataType: 'text', required: false, searchable: true },
  { name: 'purchase_order_number', label: 'PO Number', dataType: 'text', required: false, searchable: true },
  { name: 'related_contract_id', label: 'Related Contract', dataType: 'text', required: false, searchable: false },

  // ─────────────────────
  // Record management (ERM-specific)
  // ─────────────────────
  { name: 'record_owner', label: 'Record Owner', dataType: 'user', required: true, searchable: false },
  { name: 'record_status', label: 'Record Status', dataType: 'enum', enumValues: '["Draft", "Active", "Paid", "Archived"]', required: true, searchable: true },
  { name: 'retention_category', label: 'Retention Category', dataType: 'enum', enumValues: '["Financial-7Y", "Tax-10Y"]', required: true, searchable: false },
  { name: 'review_date', label: 'Review Date', dataType: 'date', required: false, searchable: false },

  // ─────────────────────
  // Security & compliance
  // ─────────────────────
  { name: 'confidentiality', label: 'Confidentiality Level', dataType: 'enum', enumValues: '["Low", "Medium", "High"]', required: false, searchable: true },
  { name: 'legal_hold', label: 'Legal Hold', dataType: 'boolean', required: false, searchable: false },
  { name: 'compliance_tags', label: 'Compliance Tags', dataType: 'multiselect', enumValues: '["VAT", "GRA", "Audit"]', required: false, searchable: true },

  // ─────────────────────
  // Search & usability
  // ─────────────────────
  { name: 'keywords', label: 'Keywords', dataType: 'text', required: false, searchable: true },
  { name: 'notes', label: 'Notes / Remarks', dataType: 'text', required: false, searchable: false },
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

  // 5. Create Dynamic 3-Level Hierarchy & Templates
  console.log('Creating Classification Hierarchy...')

  // Helper to create node
  async function createNode(name, level, code, parentId, isLeaf = false) {
    return prisma.classificationNode.create({
      data: {
        organizationId: org.id,
        name,
        level,
        code,
        parentId,
        isLeaf,
        createdById: admin.id
      }
    })
  }

  // Hierarchy Definition
  const hierarchy = [
    {
      name: 'Finance', code: 'FIN',
      children: [
        {
          name: 'Accounts Payable', code: 'AP',
          children: [
            { name: 'Vendor Invoice', code: 'INV', fields: ['invoice_number', 'invoice_amount', 'vendor_name', 'currency'] },
            { name: 'Expense Report', code: 'EXP', fields: ['invoice_amount', 'department'] }
          ]
        },
        {
          name: 'Taxation', code: 'TAX',
          children: [
            { name: 'Tax Return', code: 'RET', fields: ['tax_amount', 'issue_date'] },
            { name: 'VAT Filing', code: 'VAT', fields: ['tax_amount', 'effective_date', 'compliance_tags'] }
          ]
        }
      ]
    },
    {
      name: 'Human Resources', code: 'HR',
      children: [
        {
          name: 'Recruitment', code: 'REC',
          children: [
            { name: 'Resume / CV', code: 'CV', fields: ['keywords'] },
            { name: 'Offer Letter', code: 'OFF', fields: ['effective_date', 'confidentiality'] }
          ]
        },
        {
          name: 'Employee Files', code: 'EMP',
          children: [
            { name: 'Contract', code: 'CNT', fields: ['effective_date', 'renewal_date'] },
            { name: 'Performance Review', code: 'REV', fields: ['review_date', 'manager_name'] }
          ]
        }
      ]
    },
    {
      name: 'Legal', code: 'LEG',
      children: [
        {
          name: 'Corporate', code: 'CORP',
          children: [
            { name: 'Board Resolution', code: 'RES', fields: ['issue_date', 'description'] },
            { name: 'Power of Attorney', code: 'POA', fields: ['effective_date'] }
          ]
        }
      ]
    }
  ]

  const leafNodesStore = {} // map code -> node

  for (const l1 of hierarchy) {
    const node1 = await createNode(l1.name, 1, l1.code, null)
    
    if (l1.children) {
      for (const l2 of l1.children) {
        const node2 = await createNode(l2.name, 2, l2.code, node1.id)
        
        if (l2.children) {
          for (const l3 of l2.children) {
            // Level 3 (Leaf)
            const node3 = await createNode(l3.name, 3, l3.code, node2.id, true)
            leafNodesStore[l3.code] = node3

            // Create Template for this Leaf
            const tmpl = await prisma.metadataTemplate.create({
              data: {
                classificationNodeId: node3.id,
                name: `${l3.name} Template`,
                version: 1,
              }
            })

            // Link Fields
            let order = 1
            const fieldsToLink = l3.fields || []
            // Add implicit fields if needed, or just link specified
            for (const fname of fieldsToLink) {
              if (fields[fname]) {
                await prisma.templateField.create({
                  data: {
                    templateId: tmpl.id,
                    metadataFieldId: fields[fname].id,
                    displayOrder: order++,
                    required: fields[fname].required // default to field def
                  }
                })
              }
            }
          }
        }
      }
    }
  }

  // 6. Create Sample Records with Reference Numbers
  // Strategy: Manually construct reference number L1-L2-L3-SEQ
  
  // Ex 1: Invoice (Alice) -> FIN-AP-INV-0001
  const invNode = leafNodesStore['INV']
  if (invNode) {
    // Update sequence
    await prisma.classificationNode.update({
      where: { id: invNode.id },
      data: { lastSequenceNumber: 1 }
    })

    const invRecord = await prisma.record.create({
      data: {
        title: 'Q4 Server Payment',
        status: 'ACTIVE',
        classificationNodeId: invNode.id,
        templateVersion: 1,
        // Department vs Dept Node? Use Link to Dept Table
        departmentId: departments['IT'].id,
        ownerUserId: alice.id,
        referenceNumber: 'FIN-AP-INV-0001',
        createdAt: new Date(),
      }
    })
    
    await prisma.recordVersion.create({
      data: {
        recordId: invRecord.id,
        versionNumber: 1,
        filePath: '/uploads/inv-2025-001.pdf',
        fileType: 'application/pdf',
        uploadedById: alice.id,
      }
    })
  }

  // Ex 2: Contract (Bob) -> HR-EMP-CNT-0001
  const cntNode = leafNodesStore['CNT']
  if (cntNode) {
     await prisma.classificationNode.update({
      where: { id: cntNode.id },
      data: { lastSequenceNumber: 1 }
    })

    const contractRecord = await prisma.record.create({
      data: {
        title: 'Employment Agreement - John Doe',
        status: 'ACTIVE',
        classificationNodeId: cntNode.id,
        templateVersion: 1,
        departmentId: departments['HR'].id,
        ownerUserId: bob.id,
        referenceNumber: 'HR-EMP-CNT-0001',
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
  }

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
