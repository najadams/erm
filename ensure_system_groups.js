
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const EVERYONE_GROUP_ID = '00000000-0000-0000-0000-000000000000';

async function main() {
    console.log('Checking for System Groups...');
    
    try {
        const group = await prisma.group.findUnique({
            where: { id: EVERYONE_GROUP_ID }
        });

        if (group) {
            console.log('✅ Everyone Group already exists.');
        } else {
            console.log('⚠️ Everyone Group missing. Creating...');
            await prisma.group.create({
                data: {
                    id: EVERYONE_GROUP_ID,
                    name: 'Everyone (System)',
                    type: 'SYSTEM'
                    // Add minimal required fields if any (e.g. departmentId, leaderId might be optional)
                    // Checking schema: Group { id, name, departmentId?, leaderId?, ... }
                }
            });
            console.log('✅ Created Everyone Group.');
        }

    } catch (e) {
        console.error('Error creating group:', e);
    }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
