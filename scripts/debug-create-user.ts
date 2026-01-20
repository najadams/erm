
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Attempting to create user...');
  
  const email = 'test1@example.com';
  const name = 'test1';
  const password = 'password123';
  const role = 'ADMIN';
  const clearanceLevel = 5;
  const groupIds = []; // 'Records' group id? I don't know it, let's try empty first or fetch one.

  // First check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    console.log(`User ${email} already exists! ID: ${existingUser.id}`);
  } else {
      console.log(`User ${email} does not exist. Creating...`);
  }

  try {
      // Try to fetch a group to add
      const groupName = 'Records';
      const group = await prisma.group.findFirst({ where: { name: groupName } });
      const groupsConnect = group ? [{ id: group.id }] : [];
      if(group) console.log(`Found group: ${group.name} (${group.id})`);
      else console.log(`Group ${groupName} not found, proceeding without groups.`);

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          role,
          clearanceLevel,
          groups: {
              connect: groupsConnect
          }
        },
      });
      console.log('User created successfully:', user.id);
  } catch (e: any) {
      console.error('FAILED to create user.');
      console.error('Error name:', e.name);
      console.error('Error message:', e.message);
      console.error('Error code:', e.code);
      if (e.meta) console.error('Error meta:', e.meta);
  } finally {
    await prisma.$disconnect();
  }
}

main();
