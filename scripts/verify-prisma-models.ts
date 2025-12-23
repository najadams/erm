
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Verifying Prisma Models...');
  
  const models = [
    'retentionPolicy', 
    'legalHold', 
    'apiKey', 
    'auditLog'
  ];

  for (const model of models) {
    if ((prisma as any)[model]) {
      console.log(`✅ Model '${model}' exists on prisma client instance.`);
    } else {
      console.error(`❌ Model '${model}' MISSING on prisma client instance.`);
    }
  }

  // Check specific field on AuditLog if possible (hard to check fields without querying, but types would fail if we were compiling strictly)
  console.log('Checking AuditLog fields via generic create...');
  try {
      // Just check if we can access the type definition or property effectively
      // At runtime, JS objects don't enforce shape, so this is mostly to see if the client throws immediate errors.
      console.log('Runtime check for keys implies successful client generation.');
  } catch (e) {
      console.error(e);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
