const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const EVERYONE_GROUP_ID = '00000000-0000-0000-0000-000000000000';

async function main() {
  console.log('Fixing "Everyone (System)" Group memberships...');

  // 1. Ensure Group Exists
  const group = await prisma.group.findUnique({ where: { id: EVERYONE_GROUP_ID } });
  if (!group) {
      console.log('Group not found! Creating it...');
      await prisma.group.create({
          data: {
              id: EVERYONE_GROUP_ID,
              name: 'Everyone (System)',
              type: 'SYSTEM'
          }
      });
  }

  // 2. Fetch all users
  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  console.log(`Found ${users.length} users.`);

  let addedCount = 0;

  for (const user of users) {
      // Check if already in group
      const membership = await prisma.group.findFirst({
         where: {
             id: EVERYONE_GROUP_ID,
             users: {
                 some: { id: user.id }
             }
         }
      });

      if (!membership) {
          console.log(`Adding ${user.email} to Everyone group...`);
          await prisma.group.update({
              where: { id: EVERYONE_GROUP_ID },
              data: {
                  users: {
                      connect: { id: user.id }
                  }
              }
          });
          addedCount++;
      }
  }

  console.log(`Done. Added ${addedCount} users to the group.`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
