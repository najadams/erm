const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('Starting ROLE-BASED seed...')
  const password = await bcrypt.hash('password123', 10)

  // 1. CLEANUP
  console.log('Cleaning database...')
  // Delete in order of dependencies
  const deleteOrder = [
    'recordVersion', 'auditLog', 'recordAccess', 'recordLegalHold',
    'legalHold', 'accessRequest', 'projectRecord', 'projectMember',
    'projectGroup', 'projectCompany', 'project', 'templateField',
    'metadataTemplate', 'recordTypeMetadata', 'metadataField',
    'recordType', 'classificationNode', 'recordCategory',
    'retentionPolicy', 'companyAccess', 'registeredCompany',
    'user', 'group', 'department', 'organization', 'apiKey', 'webhook'
  ];

  for (const model of deleteOrder) {
    try {
      if (prisma[model]) {
        await prisma[model].deleteMany()
      }
    } catch (e) {
      console.log(`Note: Could not delete ${model} (might not exist or have specific constraints): ${e.message.split('\n')[0]}`)
    }
  }

  // 2. SETUP ORG & DEPARTMENTS
  console.log('Creating Organization...')
  const org = await prisma.organization.create({
    data: { name: 'GIPC Enterprise', status: 'ACTIVE' }
  })

  // System Group
  const EVERYONE_GROUP_ID = '00000000-0000-0000-0000-000000000000';
  await prisma.group.create({
    data: { id: EVERYONE_GROUP_ID, name: 'Everyone (System)', type: 'SYSTEM' }
  });

  // Departments
  const deptIT = await prisma.department.create({
    data: { name: 'Information Technology', code: 'IT', organizationId: org.id }
  })
  
  const deptHR = await prisma.department.create({
    data: { name: 'Human Resources', code: 'HR', organizationId: org.id }
  })

  // 3. CREATE USERS (ONE FOR EACH ROLE)
  console.log('Creating Users...')
  
  const users = [
    { email: 'admin@test.com', name: 'Admin User', role: 'ADMIN', dept: null, clearance: 5 },
    { email: 'officer@test.com', name: 'Records Officer', role: 'RECORDS_OFFICER', dept: deptHR.id, clearance: 5 },
    { email: 'approver@test.com', name: 'Approver User', role: 'APPROVER', dept: deptIT.id, clearance: 3 },
    { email: 'contributor@test.com', name: 'Contributor User', role: 'CONTRIBUTOR', dept: deptIT.id, clearance: 2 },
    { email: 'user@test.com', name: 'Standard User', role: 'USER', dept: deptHR.id, clearance: 2 },
    { email: 'external@test.com', name: 'External User', role: 'EXTERNAL_USER', dept: null, clearance: 1 },
    { email: 'auditor@test.com', name: 'Auditor User', role: 'AUDITOR', dept: null, clearance: 5 },
  ];

  for (const u of users) {
    await prisma.user.create({
      data: {
        email: u.email,
        name: u.name,
        role: u.role,
        password: password,
        departmentId: u.dept,
        groups: { connect: { id: EVERYONE_GROUP_ID } },
        clearanceLevel: u.clearance
      }
    })
    console.log(`Created ${u.role}: ${u.email} (Clearance: ${u.clearance})`)
  }

  // 4. SETUP MINIMAL CLASSIFICATION HIERARCHY (Required for records)
  console.log('Creating Hierarchy...')
  // L1
  const cat = await prisma.recordCategory.create({
    data: { name: 'General', organizationId: org.id }
  })
  const node1 = await prisma.classificationNode.create({
    data: { name: 'General', level: 1, organizationId: org.id, createdById: (await prisma.user.findUnique({where:{email:'admin@test.com'}})).id }
  })
  
  // L2
  const node2 = await prisma.classificationNode.create({
    data: { name: 'Docs', level: 2, parentId: node1.id, organizationId: org.id, createdById: node1.createdById }
  })

  // L3 (Record Type)
  const node3 = await prisma.classificationNode.create({
    data: { name: 'Standard Doc', level: 3, parentId: node2.id, isLeaf: true, organizationId: org.id, createdById: node1.createdById, code: 'STD' }
  })

  await prisma.recordType.create({
    data: {
      name: 'Standard Doc',
      code: 'STD',
      categoryId: cat.id,
      classificationNodeId: node3.id
    }
  })

  console.log('Seed completed successfully.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
