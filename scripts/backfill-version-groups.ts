
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function backfill() {
  console.log('Starting backfill of versionGroupId...');
  
  // Find records with null versionGroupId
  const records = await prisma.record.findMany({
    where: { versionGroupId: null },
    select: { id: true }
  });

  console.log(`Found ${records.length} records to update.`);

  for (const record of records) {
    // Generate a new UUID for each standalone record
    const newGroupId = crypto.randomUUID();
    
    await prisma.record.update({
      where: { id: record.id },
      data: { 
        versionGroupId: newGroupId,
        // Ensure versionNumber is at least 1 if null (though schema default is 1)
        // referencing schema: versionNumber Int @default(1)
       }
    });
    console.log(`Updated record ${record.id} with group ${newGroupId}`);
  }

  console.log('Backfill complete.');
}

backfill()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
