const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateData() {
  console.log('Starting migration...');
  const projects = await prisma.project.findMany({
    where: {
      registeredCompanyId: {
        not: null
      }
    }
  });

  console.log(`Found ${projects.length} projects to migrate.`);

  let migratedCount = 0;
  for (const project of projects) {
    if (!project.registeredCompanyId) continue;

    // Check if link already exists
    const existingLink = await prisma.projectCompany.findUnique({
      where: {
        projectId_companyId: {
          projectId: project.id,
          companyId: project.registeredCompanyId
        }
      }
    });

    if (!existingLink) {
      await prisma.projectCompany.create({
        data: {
          projectId: project.id,
          companyId: project.registeredCompanyId,
          role: 'PRIMARY_INVESTOR'
        }
      });
      migratedCount++;
    }
  }

  console.log(`Migration complete. Migrated ${migratedCount} links.`);
}

migrateData()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
