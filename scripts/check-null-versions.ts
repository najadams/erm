
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const count = await prisma.record.count({
    where: { versionGroupId: null }
  });
  console.log('Records with null versionGroupId:', count);
}

check().finally(() => prisma.$disconnect());
