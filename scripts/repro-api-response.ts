
// @ts-nocheck
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Reproduction Script: API Response Check ---');
  
  try {
      // 1. Create Data
      const org = await prisma.organization.findFirst();
      if (!org) throw new Error('No organization found');
      
      const nodeName = `API_Repro_Node_${Date.now()}`;
      const node = await prisma.classificationNode.create({
          data: {
              name: nodeName,
              organizationId: org.id,
              level: 3,
              isLeaf: true,
              createdById: (await prisma.user.findFirst({where: {role: 'ADMIN'}})).id
          }
      });
      console.log('Node Created:', node.id);

      let field = await prisma.metadataField.findUnique({ where: { name: 'repro_field' } });
      if (!field) {
          field = await prisma.metadataField.create({
              data: {
                  name: 'repro_field',
                  label: 'Repro Field',
                  dataType: 'text',
                  required: true
              }
          });
      }

      const template = await prisma.metadataTemplate.create({
          data: {
              classificationNodeId: node.id,
              name: 'API Repro Template',
              version: 1,
              isActive: true,
              templateFields: {
                  create: [
                      {
                          metadataFieldId: field.id,
                          required: true,
                          displayOrder: 1,
                          editable: true
                      }
                  ]
              }
          }
      });
      console.log('Template Created:', template.id);

      // 2. Simulate the API Query from app/api/classifications/[id]/route.ts
      console.log('Simulating API Fetch...');
      const fetchedNode = await prisma.classificationNode.findUnique({
        where: { id: node.id },
        include: {
          parent: true,
          children: {
            include: {
              _count: {
                select: {
                  records: true,
                  children: true,
                }
              }
            }
          },
          templates: {
            where: { isActive: true },
            include: {
              templateFields: {
                include: {
                  metadataField: true
                },
                orderBy: { displayOrder: 'asc' }
              }
            },
            orderBy: { version: 'desc' },
            take: 1
          },
          _count: {
            select: {
              records: true,
              children: true,
            }
          }
        }
      });

      // 3. Inspect Result
      if (!fetchedNode) {
          console.error('FAIL: Node not found');
      } else if (!fetchedNode.templates || fetchedNode.templates.length === 0) {
          console.error('FAIL: No templates returned');
      } else {
          const t = fetchedNode.templates[0];
          console.log('Template found:', t.name);
          console.log('Fields count:', t.templateFields.length);
          if (t.templateFields.length > 0) {
              const f = t.templateFields[0];
              console.log('Field 1:', f.metadataField.name);
              console.log('Is Required:', f.required);
              if (f.metadataField) console.log('SUCCESS: metadataField is present');
              else console.error('FAIL: metadataField is MISSING');
          } else {
              console.error('FAIL: Template has no fields');
          }
      }

  } catch (e) {
      console.error('Error:', e);
  } finally {
      await prisma.$disconnect();
  }
}

main();
