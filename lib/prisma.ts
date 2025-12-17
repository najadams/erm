import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
  console.log('Prisma INIT. DB URL:', process.env.DATABASE_URL);
  return new PrismaClient({
      datasources: {
        db: {
            url: process.env.DATABASE_URL
        }
      }
  });
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

export { prisma };

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;