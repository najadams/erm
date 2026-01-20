const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed...')
  const password = await bcrypt.hash('password123', 10)

  // 0. Clean up (Order matters due to FKs)
  // Be careful with deleteMany in production!

  await prisma.recordMetadata.deleteMany()
  await prisma.recordVersion.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.recordAccess.deleteMany()
  await prisma.recordLegalHold.deleteMany()
  await prisma.legalHold.deleteMany()
  await prisma.record.deleteMany()
  await prisma.templateField.deleteMany()
  await prisma.metadataTemplate.deleteMany()
  await prisma.recordTypeMetadata.deleteMany()
  await prisma.metadataField.deleteMany()
  await prisma.recordType.deleteMany()
  await prisma.recordCategory.deleteMany()
  await prisma.classificationNode.deleteMany()
  await prisma.department.deleteMany()
  await prisma.organization.deleteMany()
  await prisma.user.deleteMany()
  await prisma.group.deleteMany()


  // 1. Create Organization
  const org = await prisma.organization.create({
    data: { name: 'GIPC Enterprise', status: 'ACTIVE' }
  })
  console.log(`Created Organization: ${org.name}`)

  // 2. Create Departments & Groups
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

  // 4. Define Metadata Fields
  const fields = {}
  const metadataDefs = [
    // Core business metadata
    { name: 'invoice_number', label: 'Invoice Number', dataType: 'text', required: true, searchable: true },
    { name: 'invoice_amount', label: 'Amount', dataType: 'number', required: true, searchable: false },
    { name: 'currency', label: 'Currency', dataType: 'enum', enumValues: '["GHS", "USD", "EUR"]', required: true, searchable: true },
    { name: 'vendor_name', label: 'Vendor Name', dataType: 'text', required: true, searchable: true },
    { name: 'vendor_tax_id', label: 'Vendor Tax ID', dataType: 'text', required: false, searchable: true },

    // Date & financial context
    { name: 'issue_date', label: 'Issue Date', dataType: 'date', required: true, searchable: true },
    { name: 'effective_date', label: 'Effective Date', dataType: 'date', required: true, searchable: true },
    { name: 'due_date', label: 'Payment Due Date', dataType: 'date', required: false, searchable: true },
    { name: 'tax_amount', label: 'Tax Amount', dataType: 'number', required: false, searchable: false },

    // Classification & linkage
    { name: 'department', label: 'Department', dataType: 'enum', enumValues: '["Finance", "Procurement", "Operations"]', required: true, searchable: true },
    { name: 'cost_center', label: 'Cost Center', dataType: 'text', required: false, searchable: true },
    { name: 'purchase_order_number', label: 'PO Number', dataType: 'text', required: false, searchable: true },
    { name: 'related_contract_id', label: 'Related Contract', dataType: 'text', required: false, searchable: false },

    // Record management (ERM-specific)
    { name: 'record_owner', label: 'Record Owner', dataType: 'user', required: true, searchable: false },
    { name: 'record_status', label: 'Record Status', dataType: 'enum', enumValues: '["Draft", "Active", "Paid", "Archived"]', required: true, searchable: true },
    { name: 'retention_category', label: 'Retention Category', dataType: 'enum', enumValues: '["Financial-7Y", "Tax-10Y"]', required: true, searchable: false },
    { name: 'review_date', label: 'Review Date', dataType: 'date', required: false, searchable: false },

    // Security & compliance
    { name: 'confidentiality', label: 'Confidentiality Level', dataType: 'enum', enumValues: '["Low", "Medium", "High"]', required: false, searchable: true },
    { name: 'legal_hold', label: 'Legal Hold', dataType: 'boolean', required: false, searchable: false },
    { name: 'compliance_tags', label: 'Compliance Tags', dataType: 'multiselect', enumValues: '["VAT", "GRA", "Audit"]', required: false, searchable: true },

    // Search & usability
    { name: 'keywords', label: 'Keywords', dataType: 'text', required: false, searchable: true },
    { name: 'notes', label: 'Notes / Remarks', dataType: 'text', required: false, searchable: false },
    { name: 'renewal_date', label: 'Renewal Date', dataType: 'date', required: false, searchable: true },
    { name: 'manager_name', label: 'Manager Name', dataType: 'text', required: false, searchable: true },
    { name: 'description', label: 'Description', dataType: 'text', required: false, searchable: true },
  ]

  for (const f of metadataDefs) {
    const field = await prisma.metadataField.upsert({
      where: { name: f.name },
      update: {},
      create: f
    })
    fields[f.name] = field
  }

  // 5. Create Dynamic 3-Level Hierarchy + Unified Record Types
  console.log('Creating Classification Hierarchy & Record Types...')

  // Helper to create node
  async function createNode(name, level, code, parentId, isLeaf = false) {
    return prisma.classificationNode.create({
      data: {
        organizationId: org.id,
        name,
        level, // 1=Category(L1), 2=SubCategory(L2), 3=RecordType(L3)
        code,
        parentId,
        isLeaf,
        createdById: admin.id
      }
    })
  }


  // Hierarchy Definition
  // Level 1 will correspond to "Record Categories"
  // Level 3 will correspond to "Record Types"
  // Hierarchy Definition (Real Life Structure)
  // Level 1: Functional Area / Category
  // Level 2: Activity / Sub-Category
  // Level 3: Record Type (Leaf)
  const hierarchy = [
    {
      name: 'Finance', code: 'FIN',
      children: [
        {
          name: 'Accounts Payable', code: 'AP',
          children: [
            { name: 'Vendor Invoice', code: 'INV', fields: ['invoice_number', 'invoice_amount', 'vendor_name', 'currency', 'due_date'] },
            { name: 'Expense Report', code: 'EXP', fields: ['invoice_amount', 'department', 'notes'] },
            { name: 'Purchase Order', code: 'PO', fields: ['purchase_order_number', 'vendor_name', 'invoice_amount'] }
          ]
        },
        {
          name: 'Accounts Receivable', code: 'AR',
          children: [
            { name: 'Sales Invoice', code: 'SINV', fields: ['invoice_number', 'invoice_amount', 'customer_name', 'due_date'] },
            { name: 'Credit Memo', code: 'CM', fields: ['invoice_amount', 'reference_number', 'notes'] }
          ]
        },
        {
          name: 'Taxation', code: 'TAX',
          children: [
            { name: 'Corporate Tax Return', code: 'RET', fields: ['tax_amount', 'issue_date', 'fiscal_year'] },
            { name: 'VAT Filing', code: 'VAT', fields: ['tax_amount', 'effective_date', 'compliance_tags'] },
            { name: 'Tax Assessment', code: 'ASM', fields: ['tax_amount', 'issue_date'] }
          ]
        },
        {
          name: 'Financial Reporting', code: 'RPT',
          children: [
            { name: 'Annual Financial Statement', code: 'AFS', fields: ['fiscal_year', 'auditor_name'] },
            { name: 'Audit Report', code: 'AUD', fields: ['auditor_name', 'issue_date', 'compliance_tags'] }
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
            { name: 'Resume / CV', code: 'CV', fields: ['keywords', 'candidate_name'] },
            { name: 'Offer Letter', code: 'OFF', fields: ['effective_date', 'confidentiality', 'candidate_name'] },
            { name: 'Job Description', code: 'JD', fields: ['department', 'role_title'] }
          ]
        },
        {
          name: 'Personnel Files', code: 'EMP',
          children: [
            { name: 'Employment Contract', code: 'CNT', fields: ['effective_date', 'renewal_date', 'employee_id'] },
            { name: 'Performance Review', code: 'REV', fields: ['review_date', 'manager_name', 'rating'] },
            { name: 'Disciplinary Record', code: 'DIS', fields: ['issue_date', 'description', 'confidentiality'] }
          ]
        },
        {
          name: 'Payroll & Benefits', code: 'PAY',
          children: [
            { name: 'Payroll Register', code: 'REG', fields: ['fiscal_period', 'department'] },
            { name: 'Tax Declaration (PAYE)', code: 'PAYE', fields: ['tax_amount', 'effective_date'] }
          ]
        }
      ]
    },
    {
      name: 'Legal & Governance', code: 'LEG',
      children: [
        {
          name: 'Corporate Governance', code: 'CORP',
          children: [
            { name: 'Board Resolution', code: 'RES', fields: ['issue_date', 'description', 'signatories'] },
            { name: 'Meeting Minutes', code: 'MIN', fields: ['meeting_date', 'attendees'] },
            { name: 'Certificate of Incorporation', code: 'INC', fields: ['issue_date', 'registration_number'] }
          ]
        },
        {
          name: 'Contracts & Agreements', code: 'CON',
          children: [
            { name: 'Service Level Agreement', code: 'SLA', fields: ['effective_date', 'vendor_name', 'renewal_date'] },
            { name: 'Non-Disclosure Agreement', code: 'NDA', fields: ['effective_date', 'counterparty_name'] },
            { name: 'Lease Agreement', code: 'LSE', fields: ['effective_date', 'property_address', 'expiry_date'] }
          ]
        },
        {
          name: 'Litigation', code: 'LIT',
          children: [
            { name: 'Court Filing', code: 'FIL', fields: ['case_number', 'court_name', 'filing_date'] },
            { name: 'Legal Brief', code: 'BRF', fields: ['case_number', 'author_name'] }
          ]
        }
      ]
    },
    {
      name: 'Procurement', code: 'PRO',
      children: [
        {
          name: 'Sourcing', code: 'SRC',
          children: [
            { name: 'Request for Proposal (RFP)', code: 'RFP', fields: ['project_name', 'deadline'] },
            { name: 'Vendor Proposal', code: 'PROP', fields: ['vendor_name', 'submitted_date', 'quote_amount'] }
          ]
        },
        {
          name: 'Vendor Management', code: 'VND',
          children: [
            { name: 'Vendor Registration Form', code: 'REG', fields: ['vendor_name', 'tax_id'] },
            { name: 'Compliance Certificate', code: 'CERT', fields: ['vendor_name', 'expiry_date', 'compliance_type'] }
          ]
        }
      ]
    },
    {
      name: 'Operations', code: 'OPS',
      children: [
        {
          name: 'Facilities', code: 'FAC',
          children: [
            { name: 'Maintenance Log', code: 'MNT', fields: ['maintenance_date', 'technician_name', 'location'] },
            { name: 'Safety Inspection', code: 'SAF', fields: ['inspection_date', 'inspector_name', 'result'] }
          ]
        },
        {
          name: 'IT Operations', code: 'ITO',
          children: [
            { name: 'System Architecture Diagram', code: 'ARC', fields: ['system_name', 'version', 'author'] },
            { name: 'Incident Report', code: 'INC', fields: ['incident_date', 'severity', 'description'] }
          ]
        }
      ]
    }
  ]

  const leafNodesStore = {} // map code -> node

  for (const l1 of hierarchy) {
    // Level 1: This maps to a Record Category
    const node1 = await createNode(l1.name, 1, l1.code, null)
    
    // Create Corresponding Record Category
    const category = await prisma.recordCategory.create({
      data: {
        name: l1.name,
        organizationId: org.id,
        defaultVisibility: 'PRIVATE'
      }
    });

    if (l1.children) {
      for (const l2 of l1.children) {
        const node2 = await createNode(l2.name, 2, l2.code, node1.id)
        
        if (l2.children) {
          for (const l3 of l2.children) {
            // Level 3 (Leaf): Maps to Record Type
            const node3 = await createNode(l3.name, 3, l3.code, node2.id, true)
            leafNodesStore[l3.code] = node3

            // 1. Create Corresponding Record Type
            const recordType = await prisma.recordType.create({
              data: {
                name: l3.name,
                code: l3.code,
                categoryId: category.id,
                classificationNodeId: node3.id, // THE LINK
                isActive: true
              }
            });

            // 2. Create Template for this Leaf (New System)
            const tmpl = await prisma.metadataTemplate.create({
              data: {
                classificationNodeId: node3.id,
                name: `${l3.name} Template`,
                version: 1,
              }
            })

            // 3. Link Fields to BOTH (Legacy RecordType + New Template)
            let order = 1
            const fieldsToLink = l3.fields || []
            
            for (const fname of fieldsToLink) {
              if (fields[fname]) {
                const fId = fields[fname].id;

                // A. Link to Legacy Record Type
                await prisma.recordTypeMetadata.create({
                  data: {
                    recordTypeId: recordType.id,
                    metadataFieldId: fId,
                    displayOrder: order,
                    editable: true
                  }
                });

                // B. Link to New Template
                await prisma.templateField.create({
                  data: {
                    templateId: tmpl.id,
                    metadataFieldId: fId,
                    displayOrder: order,
                    required: fields[fname].required 
                  }
                });
                
                order++;
              }
            }
          }
        }
      }
    }
  }




  // 6. Create Sample Records 
  // We use the new logic: creating via Classification Node
  // The API (or manual insertion here) must ensure recordTypeId is also set
  
  // Ex 1: Invoice (Alice) -> FIN-AP-INV
  const invNode = leafNodesStore['INV']
  if (invNode) {
    // Look up generated Record Type
    const invRt = await prisma.recordType.findFirst({ where: { classificationNodeId: invNode.id } })

    await prisma.classificationNode.update({
      where: { id: invNode.id },
      data: { lastSequenceNumber: 1 }
    })

    const invRecord = await prisma.record.create({
      data: {
        title: 'Q4 Server Payment',
        status: 'ACTIVE',
        classificationNodeId: invNode.id,
        recordTypeId: invRt ? invRt.id : undefined, // Compatibility
        templateVersion: 1,
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

  // Ex 2: Contract (Bob) -> HR-EMP-CNT
  const cntNode = leafNodesStore['CNT']
  if (cntNode) {
    const cntRt = await prisma.recordType.findFirst({ where: { classificationNodeId: cntNode.id } })

    await prisma.classificationNode.update({
      where: { id: cntNode.id },
      data: { lastSequenceNumber: 1 }
    })

    const contractRecord = await prisma.record.create({
      data: {
        title: 'Employment Agreement - John Doe',
        status: 'ACTIVE',
        classificationNodeId: cntNode.id,
        recordTypeId: cntRt ? cntRt.id : undefined,
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
