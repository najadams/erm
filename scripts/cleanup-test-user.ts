
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = 'test1@example.com';
  console.log(`Deleting user with email: ${email}`);
  
  try {
      const deleted = await prisma.user.delete({
        where: { email },
      });
      console.log('User deleted:', deleted.id);
  } catch (e: any) {
      if (e.code === 'P2025') {
          console.log('User not found, nothing to delete.');
      } else {
          console.error('Error deleting user:', e);
      }
  } finally {
    await prisma.$disconnect();
  }
}

main();
