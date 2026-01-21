
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Clearing All Records ---');
  
  try {
      // 1. Delete dependent relations (Explicitly for safety, though Cascade might handle it)
      console.log('Deleting Record Access entries...');
      await prisma.recordAccess.deleteMany({});
      
      console.log('Deleting Record Metadata...');
      await prisma.recordMetadata.deleteMany({});
      
      console.log('Deleting Record Legal Holds...');
      await prisma.recordLegalHold.deleteMany({});
      
      console.log('Deleting Record Versions...');
      await prisma.recordVersion.deleteMany({});
      
      // 2. Delete Records
      console.log('Deleting Records...');
      const { count } = await prisma.record.deleteMany({});
      
      console.log(`✅ Successfully deleted ${count} records.`);
      
      // Optional: Clear Audit Logs if they reference records? 
      // User asked for "empty record table", so leaving audit logs (which will have null recordId) is preserving history, which is safer.
      
  } catch (e) {
      console.error('❌ Error clearing records:', e);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
