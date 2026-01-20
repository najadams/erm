
import { PrismaClient, AccessLevel, AccessType } from '@prisma/client';
import { ACS } from '../lib/acs'; // Relative path for script execution

const prisma = new PrismaClient();

async function main() {
  console.log('🔒 Starting Access Control Verification...');

  // 1. Setup Data
  console.log('   Populating seed data...');
  
  // Clean start (optional, maybe unsafe if user has data, but for verification script usually we create unique prefixed items)
  // We will create unique users/records to avoid conflict.
  const TS = Date.now();
  
  // DEPARTMENTS
  const deptA = await prisma.department.create({ data: { organizationId: 'ORG-1', name: `Dept A ${TS}`, code: `DA${TS}` } });
  const deptB = await prisma.department.create({ data: { organizationId: 'ORG-1', name: `Dept B ${TS}`, code: `DB${TS}` } });
  
  // USERS
  const userA = await prisma.user.create({ data: { email: `usera_${TS}@test.com`, password: 'pw', name: 'User A', departmentId: deptA.id, role: 'USER', clearanceLevel: 1 } });
  const userB = await prisma.user.create({ data: { email: `userb_${TS}@test.com`, password: 'pw', name: 'User B', departmentId: deptB.id, role: 'USER', clearanceLevel: 1 } });
  const userSecret = await prisma.user.create({ data: { email: `secret_${TS}@test.com`, password: 'pw', name: 'Agent 007', departmentId: deptA.id, role: 'USER', clearanceLevel: 5 } });
  
  // GROUPS (PROJECTS)
  const projectX = await prisma.group.create({ data: { name: `Project X ${TS}`, type: 'PROJECT' } });
  // Add User B to Project X
  await prisma.user.update({
      where: { id: userB.id },
      data: { groups: { connect: { id: projectX.id } } }
  });

  // CLASSIFICATION (SECURITY)
  // Assuming Org exists or we create fake one attached to Dept for valid FK?
  // We need valid Org ID. Let's find one or create stub.
  // Actually Dept creation failed if I didn't verify Org existence.
  // Since I passed 'ORG-1', it likely failed if ORG-1 doesn't exist.
  // I should fetch first org.
}

// Wrapper to handle setup safely
async function run() {
    try {
        // Fix Org issue
        let org = await prisma.organization.findFirst();
        if (!org) {
            org = await prisma.organization.create({ data: { name: 'Test Org' }});
        }
        
        const TS = Date.now();

        // DEPARTMENTS
        const deptA = await prisma.department.create({ data: { organizationId: org.id, name: `Dept A ${TS}`, code: `DA${TS}` } });
        const deptB = await prisma.department.create({ data: { organizationId: org.id, name: `Dept B ${TS}`, code: `DB${TS}` } });
        
        // USERS
        const userA = await prisma.user.create({ data: { email: `usera_${TS}@test.com`, password: 'pw', name: 'User A', departmentId: deptA.id, role: 'USER', clearanceLevel: 1 } });
        const userB = await prisma.user.create({ data: { email: `userb_${TS}@test.com`, password: 'pw', name: 'User B', departmentId: deptB.id, role: 'USER', clearanceLevel: 1 } });
        const userSecret = await prisma.user.create({ data: { email: `secret_${TS}@test.com`, password: 'pw', name: 'Agent 007', departmentId: deptA.id, role: 'USER', clearanceLevel: 5 } });
        
        // GROUPS (PROJECTS)
        const projectX = await prisma.group.create({ data: { name: `Project X ${TS}`, type: 'PROJECT' } });
        await prisma.user.update({ where: { id: userB.id }, data: { groups: { connect: { id: projectX.id } } } });

        // CLASSIFICATION NODES
        const topSecretNode = await prisma.classificationNode.create({
            data: {
                organizationId: org.id,
                name: 'Top Secret Docs',
                level: 3,
                isLeaf: true,
                securityLevel: 5,
                createdById: userA.id // Just creator
            }
        });

        // RECORDS
        // 1. Dept A Record
        const recDeptA = await prisma.record.create({
            data: { title: 'Dept A Public Record', status: 'ACTIVE', departmentId: deptA.id, ownerUserId: userA.id }
        });

        // 2. Project X Record (Linked to Dept A but Project X overrides?)
        const recProjX = await prisma.record.create({
            data: { 
                title: 'Project X Record', 
                status: 'ACTIVE', 
                departmentId: deptA.id, 
                projectId: projectX.id, 
                ownerUserId: userA.id 
            }
        });

        // 3. Top Secret Record (Dept A)
        const recSecret = await prisma.record.create({
            data: {
                title: 'Top Secret Record',
                status: 'ACTIVE',
                departmentId: deptA.id,
                classificationNodeId: topSecretNode.id,
                ownerUserId: userSecret.id
            }
        });

        console.log('   Data Setup Complete. Running Checks...');
        console.log('------------------------------------------------');

        // SCENARIO 1: Dept Match
        // User A (Dept A) -> View RecDeptA (Dept A)
        const s1 = await ACS.evaluate(userA.id, recDeptA.id, 'VIEW');
        console.log(`1. Same Dept Check (Expect TRUE): ${s1} ${s1 ? '✅' : '❌'}`);

        // SCENARIO 2: Dept Mismatch
        // User B (Dept B) -> View RecDeptA (Dept A)
        const s2 = await ACS.evaluate(userB.id, recDeptA.id, 'VIEW');
        console.log(`2. Cross Dept Check (Expect FALSE): ${s2} ${!s2 ? '✅' : '❌'}`);

        // SCENARIO 3: Project Access
        // User B (in Project X) -> View RecProjX (Dept A, but Project X)
        const s3 = await ACS.evaluate(userB.id, recProjX.id, 'VIEW');
        console.log(`3. Project Member Access (Expect TRUE): ${s3} ${s3 ? '✅' : '❌'}`);

        // SCENARIO 4: Clearance Check
        // User A (Level 1) -> View RecSecret (Level 5)
        const s4 = await ACS.evaluate(userA.id, recSecret.id, 'VIEW');
        console.log(`4. Clearance Fail Check (Expect FALSE): ${s4} ${!s4 ? '✅' : '❌'}`);

        // User Secret (Level 5) -> View RecSecret (Level 5)
        const s5 = await ACS.evaluate(userSecret.id, recSecret.id, 'VIEW');
        console.log(`5. Clearance Pass Check (Expect TRUE): ${s5} ${s5 ? '✅' : '❌'}`);

        // SCENARIO 5: Explicit ACL
        // Grant User B explicit access to RecDeptA (which failed earlier)
        await prisma.recordAccess.create({
            data: {
                recordId: recDeptA.id,
                userId: userB.id,
                principalType: 'USER',
                level: 'VIEW',
                accessType: 'ALLOW'
            }
        });
        const s6 = await ACS.evaluate(userB.id, recDeptA.id, 'VIEW');
        console.log(`6. Explicit Allow Check (Expect TRUE): ${s6} ${s6 ? '✅' : '❌'}`);

        // cleanup
        console.log('   Cleanup skipped for debug inspection if needed.');

    } catch (e) {
        console.error('Test Failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

// Start
run();
