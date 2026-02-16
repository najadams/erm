
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // Alice -> CONTRIBUTOR
  const alice = await prisma.user.update({
    where: { email: 'alice@example.com' },
    data: { role: 'CONTRIBUTOR' }
  });
  console.log('Updated Alice to CONTRIBUTOR');

  // Bob -> RECORDS_OFFICER
  const bob = await prisma.user.update({
    where: { email: 'bob@example.com' },
    data: { role: 'RECORDS_OFFICER' }
  });
  console.log('Updated Bob to RECORDS_OFFICER');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
