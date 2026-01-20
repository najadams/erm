const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Seeding Default Template...')

  // 1. Ensure 'description' Metadata Field exists
  // It wasn't in the original seed list, but might be desired.
  // We'll also reuse 'keywords' and 'notes' which exist.
  
  const descField = await prisma.metadataField.upsert({
      where: { name: 'description' },
      update: {},
      create: {
          name: 'description',
          label: 'Description',
          dataType: 'text',
          required: false,
          searchable: true
      }
  });

  const keywordsField = await prisma.metadataField.findUnique({ where: { name: 'keywords' } });
  const notesField = await prisma.metadataField.findUnique({ where: { name: 'notes' } });
  
  // 2. Find Organization (assuming first one)
  const org = await prisma.organization.findFirst();
  if (!org) throw new Error("No organization found");

  const admin = await prisma.user.findUnique({ where: { email: 'admin@example.com' } });
  if (!admin) throw new Error("No admin user found"); // Fallback if needed

  // 3. Create 'General' Top Level Node (if not exists)
  // Check if there is already a root node named 'General'
  let rootGeneral = await prisma.classificationNode.findFirst({
      where: { 
          organizationId: org.id, 
          level: 1, 
          name: 'General' 
      }
  });

  if (!rootGeneral) {
      rootGeneral = await prisma.classificationNode.create({
          data: {
              organizationId: org.id,
              name: 'General',
              level: 1,
              code: 'GEN',
              createdById: admin.id
          }
      });
      console.log('Created General Root Node');
  }

  // 4. Create 'Uncategorized' Level 2 Node
  let uncategorizedL2 = await prisma.classificationNode.findFirst({
      where: {
          parentId: rootGeneral.id,
          level: 2,
          name: 'Uncategorized'
      }
  });

  if (!uncategorizedL2) {
      uncategorizedL2 = await prisma.classificationNode.create({
          data: {
              organizationId: org.id,
              name: 'Uncategorized',
              level: 2,
              code: 'UNC',
              parentId: rootGeneral.id,
              createdById: admin.id
          }
      });
      console.log('Created Uncategorized L2 Node');
  }

  // 5. Create 'General Record' Level 3 Node (Leaf)
  let generalL3 = await prisma.classificationNode.findFirst({
      where: {
          parentId: uncategorizedL2.id,
          level: 3,
          name: 'General Record'
      }
  });

  if (!generalL3) {
      generalL3 = await prisma.classificationNode.create({
          data: {
              organizationId: org.id,
              name: 'General Record',
              level: 3,
              code: 'REC',
              parentId: uncategorizedL2.id,
              isLeaf: true,
              createdById: admin.id
          }
      });
      console.log('Created General Record L3 Node');
  }

  // 6. Create Template
  // Check if template exists
  const template = await prisma.metadataTemplate.upsert({
      where: {
          classificationNodeId_version: {
              classificationNodeId: generalL3.id,
              version: 1
          }
      },
      update: {},
      create: {
          classificationNodeId: generalL3.id,
          name: 'Default General Template',
          version: 1,
          isActive: true
      }
  });

  // 7. Link Fields
  const fieldsToLink = [
      { field: descField, order: 1, required: true }, // Make description required for general records? Optional? User asked "no defined fields", maybe simple. Let's make it optional.
      { field: keywordsField, order: 2, required: false },
      { field: notesField, order: 3, required: false }
  ];

  for (const item of fieldsToLink) {
      if (item.field) {
         await prisma.templateField.upsert({
             where: {
                 templateId_metadataFieldId: {
                     templateId: template.id,
                     metadataFieldId: item.field.id
                 }
             },
             update: {},
             create: {
                 templateId: template.id,
                 metadataFieldId: item.field.id,
                 displayOrder: item.order,
                 required: false // Default to false for flexibility
             }
         });
      }
  }

  console.log('Default Template Created/Updated Successfully');
  console.log(`Node ID: ${generalL3.id}`);
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
