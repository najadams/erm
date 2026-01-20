// @ts-nocheck
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Reproduction Script: Template Upload ---');
  
  try {
      // 1. Create a prerequisite Organization & Department if needed (or assume existing?)
      // fetching existing organization
      const org = await prisma.organization.findFirst();
      if (!org) throw new Error('No organization found');
      
      // 2. Create Level 3 Classification Node
      const nodeName = `Repro_Node_${Date.now()}`;
      console.log(`Creating Node: ${nodeName}`);
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

      // 3. Create Metadata Field
      // Check if "repro_field" exists first
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
      console.log('Field Ready:', field.id);

      // 4. Create Template in Transaction (as API does?) or directly
      // API usually creates Template + TemplateField
      console.log('Creating Template...');
      const template = await prisma.metadataTemplate.create({
          data: {
              classificationNodeId: node.id,
              name: 'Repro Template v1',
              version: 1,
              isActive: true,
              templateFields: {
                  create: [
                      {
                          metadataFieldId: field.id,
                          required: true,
                          displayOrder: 1
                      }
                  ]
              }
          }
      });
      console.log('Template Created:', template.id);

      // 5. Simulate Upload (Mock form data / API call logic)
      // Since we can't easily call nextjs API from here without running server, we will mimic the *logic* of the API
      // specifically the findFirst for template.
      
      console.log('Verifying Template Lookup used in Upload API...');
      const lookup = await prisma.metadataTemplate.findFirst({
        where: {
          classificationNodeId: node.id,
          version: 1
        },
        include: {
          templateFields: true
        }
      });
      
      if (!lookup) {
          console.error('FAIL: Could not find template via lookup!');
      } else {
          console.log('SUCCESS: Template found via lookup.');
          console.log('Template Fields:', lookup.templateFields);
      }
      
      console.log('--- Verifying Validation Logic ---');
      
      const scenarios = [
          { name: 'String Value', val: 'Test', expectSuccess: true },
          { name: 'Boolean False', val: false, expectSuccess: true },
          { name: 'Number Zero', val: 0, expectSuccess: true },
          { name: 'Empty String', val: '', expectSuccess: false },
          { name: 'Null', val: null, expectSuccess: false },
          { name: 'Undefined', val: undefined, expectSuccess: false },
      ];

      for (const s of scenarios) {
          const metadataValues = { [field.id]: s.val };
          
          // Current Fixed Logic
          const missing = lookup.templateFields.filter(tf => {
               if (!tf.required) return false;
               const val = metadataValues[tf.metadataFieldId];
               return val === undefined || val === null || val === '';
          });

          const passed = missing.length === 0;
          if (passed === s.expectSuccess) {
              console.log(`PASS: ${s.name} (Val: ${s.val}) -> ${passed ? 'Accepted' : 'Rejected'}`);
          } else {
              console.error(`FAIL: ${s.name} (Val: ${s.val}) -> Expected ${s.expectSuccess} but got ${passed}`);
          }
      }

  } catch (e) {
      console.error('Reproduction Error:', e);
  } finally {
      await prisma.$disconnect();
  }
}

main();
