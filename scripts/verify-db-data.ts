
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Verifying DB Data...');
  
  try {
      const userCount = await prisma.user.count();
      console.log(`✅ User count: ${userCount}`);
      
      if (userCount > 0) {
          const u = await prisma.user.findUnique({ where: { email: 'admin@example.com' } });
          console.log('Admin User:', u?.email, 'Role:', u?.role, 'Expires:', u?.accountExpiresAt, 'ID:', u?.id);
      } else {
          console.error('❌ User table exists but is EMPTY.');
      }

      const auditCount = await prisma.auditLog.count();
      console.log(`✅ AuditLog count: ${auditCount}`);

  } catch (e) {
      console.error('❌ Failed to query database:', e);
      process.exit(1);
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
