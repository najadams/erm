import '@/lib/env'; // Validate environment variables on first import
import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
  console.log('Prisma INIT. DB URL:', process.env.DATABASE_URL);
  
  // connection_limit calculation:
  // Production: Explicitly set higher limit (e.g. 20) or rely on pgbouncer if present.
  // Dev: Keep low to avoid exhaustion during HMR (Hot Module Replacement)
  const connectionLimit = process.env.NODE_ENV === 'production' ? 20 : 5;

  return new PrismaClient({
      datasources: {
        db: {
            url: `${process.env.DATABASE_URL}${process.env.DATABASE_URL?.includes('?') ? '&' : '?'}connection_limit=${connectionLimit}`
        }
      },
      // log: ['query', 'info', 'warn', 'error'], // Optional: Logic logging
  });
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export { prisma };

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;