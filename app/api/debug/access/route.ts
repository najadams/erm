
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAccessibleRecordsClause } from '@/lib/access';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const results: any = {};

    // 1. Get Users
    const admin = await prisma.user.findUnique({ where: { email: 'admin@example.com' } });
    const alice = await prisma.user.findUnique({ where: { email: 'alice@example.com' } }); // IT Group
    const bob = await prisma.user.findUnique({ where: { email: 'bob@example.com' } }); // HR Group

    if (!admin || !alice || !bob) {
      return NextResponse.json({ error: 'Users not found. Seed failed?' });
    }

    results.users = { admin: admin.email, alice: alice.email, bob: bob.email };

    // 2. Test Clauses
    const adminClause = await getAccessibleRecordsClause(admin.id);
    const aliceClause = await getAccessibleRecordsClause(alice.id);
    
    results.clauses = {
        admin: adminClause,
        alice: aliceClause
    };

    // 3. Test Actual Queries
    // Find specific test records
    const publicRecord = await prisma.record.findFirst({ where: { visibility: 'PUBLIC' } });
    const hrRecord = await prisma.record.findFirst({ where: { visibility: 'GROUP', group: { name: 'HR' } } });
    const itRecord = await prisma.record.findFirst({ where: { visibility: 'GROUP', group: { name: 'IT' } } });

    results.records = {
        public: publicRecord ? publicRecord.id : 'missing',
        hr: hrRecord ? hrRecord.id : 'missing',
        it: itRecord ? itRecord.id : 'missing'
    };

    if (hrRecord) {
        // Alice (IT) looking for HR record
        const aliceSeesHR = await prisma.record.findMany({
            where: {
                AND: [
                    { id: hrRecord.id },
                    aliceClause
                ]
            }
        });
        results.aliceSeesHR = aliceSeesHR.length; // SHOULD BE 0
    }

    if (itRecord) {
        // Alice (IT) looking for IT record
        const aliceSeesIT = await prisma.record.findMany({
            where: {
                AND: [
                    { id: itRecord.id },
                    aliceClause
                ]
            }
        });
        results.aliceSeesIT = aliceSeesIT.length; // SHOULD BE 1
    }

    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}
