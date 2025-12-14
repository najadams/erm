
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Mock the clause generator since we cannot easily import the TS file without compilation
// Use the logic directly here to verify data state matches expectation
async function getAccessibleRecordsClause(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { groups: true }
  });

  if (!user) return { id: 'nothing' }; // invalid

  if (user.role === 'ADMIN' || user.role === 'AUDITOR') {
    return {}; // All records
  }

  return {
    OR: [
      { visibility: 'PUBLIC' },
      { visibility: 'PRIVATE', userId: user.id },
      { 
        visibility: 'GROUP', 
        groupId: { in: user.groups.map(g => g.id) } 
      }
    ]
  };
}

async function main() {
  console.log('--- Verifying Access Control Logic (Direct DB) ---');

  // 1. Get Users
  const admin = await prisma.user.findUnique({ where: { email: 'admin@example.com' } });
  const alice = await prisma.user.findUnique({ where: { email: 'alice@example.com' } }); // IT Group
  const bob = await prisma.user.findUnique({ where: { email: 'bob@example.com' } }); // HR Group

  if (!admin || !alice || !bob) {
    console.error('Users not found. Seed failed?');
    // Check if any users exist
    const count = await prisma.user.count();
    console.log(`Total users in DB: ${count}`);
    return;
  }

  console.log('Users found:', { admin: admin.email, alice: alice.email, bob: bob.email });

  // 2. Test Clauses
  const aliceClause = await getAccessibleRecordsClause(alice.id);
  // console.log('Alice Clause:', JSON.stringify(aliceClause));

  // 3. Test Actual Queries
  const publicRecord = await prisma.record.findFirst({ where: { visibility: 'PUBLIC' } });
  const hrRecord = await prisma.record.findFirst({ where: { visibility: 'GROUP', group: { name: 'HR' } } });
  const itRecord = await prisma.record.findFirst({ where: { visibility: 'GROUP', group: { name: 'IT' } } });

  console.log('Records Found:', {
      public: !!publicRecord,
      hr: !!hrRecord,
      it: !!itRecord
  });

  if (!hrRecord || !itRecord) { 
      return; 
  }

  // Alice looking for HR record
  const aliceSeesHR = await prisma.record.findMany({
      where: {
          AND: [
            { id: hrRecord.id },
            aliceClause
          ]
      }
  });
  console.log(`Alice sees HR Record? ${aliceSeesHR.length > 0} (Expected: false)`);

  // Alice looking for IT record
  const aliceSeesIT = await prisma.record.findMany({
      where: {
          AND: [
            { id: itRecord.id },
            aliceClause
          ]
      }
  });
  console.log(`Alice sees IT Record? ${aliceSeesIT.length > 0} (Expected: true)`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
