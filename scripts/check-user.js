/**
 * SCRIPT: Check User Clearance
 * Usage: node scripts/check-user.js <email>
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.log('Please provide an email address.');
    // List all users for convenience
    const users = await prisma.user.findMany({ select: { email: true, role: true, clearanceLevel: true } });
    console.log('Found users:', users);
    return;
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, role: true, clearanceLevel: true }
  });

  if (!user) {
    console.log(`User not found: ${email}`);
  } else {
    console.log('User Details:', user);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
