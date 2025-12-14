
import { PrismaClient } from '@prisma/client';
import { getAccessibleRecordsClause } from '../lib/access';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Verifying Access Control Logic ---');

  // 1. Get Users
  const admin = await prisma.user.findUnique({ where: { email: 'admin@example.com' } });
  const alice = await prisma.user.findUnique({ where: { email: 'alice@example.com' } }); // IT Group
  const bob = await prisma.user.findUnique({ where: { email: 'bob@example.com' } }); // HR Group

  if (!admin || !alice || !bob) {
    console.error('Users not found. Seed failed?');
    return;
  }

  console.log('Users found:', { admin: admin.email, alice: alice.email, bob: bob.email });

  // 2. Test Clauses
  const adminClause = await getAccessibleRecordsClause(admin.id);
  console.log('Admin Clause:', JSON.stringify(adminClause));
  // Expected: {} (All records)

  const aliceClause = await getAccessibleRecordsClause(alice.id);
  console.log('Alice (IT) Clause:', JSON.stringify(aliceClause));
  // Expected: OR public, private own, group IT

  // 3. Test Actual Queries
  const publicRecord = await prisma.record.findFirst({ where: { visibility: 'PUBLIC' } });
  const hrRecord = await prisma.record.findFirst({ where: { visibility: 'GROUP', group: { name: 'HR' } } });
  const itRecord = await prisma.record.findFirst({ where: { visibility: 'GROUP', group: { name: 'IT' } } });

  if (!publicRecord || !hrRecord || !itRecord) {
     console.log('Missing test records. Seeding might be incomplete.');
  }

  // Alice looking for HR record
  const aliceSeesHR = await prisma.record.findMany({
      where: {
          AND: [
            { id: hrRecord?.id },
            aliceClause
          ]
      }
  });
  console.log('Alice sees HR Record (Should be 0):', aliceSeesHR.length);

  // Alice looking for IT record
  const aliceSeesIT = await prisma.record.findMany({
      where: {
          AND: [
            { id: itRecord?.id },
            aliceClause
          ]
      }
  });
  console.log('Alice sees IT Record (Should be 1):', aliceSeesIT.length);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
