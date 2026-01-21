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
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export { prisma };

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;