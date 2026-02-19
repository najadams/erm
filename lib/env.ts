/**
 * Environment Variable Validation
 *
 * Import this module early in the app lifecycle to catch missing or
 * insecure environment variables at startup rather than at runtime.
 *
 * Usage: import '@/lib/env'  (side-effect import in layout.tsx or prisma.ts)
 */

import { z } from 'zod';

const WEAK_SECRETS = ['changeme', 'secret', 'password', ''];

const envSchema = z.object({
  // --- Required ---
  DATABASE_URL: z
    .string({ message: 'DATABASE_URL is required' })
    .startsWith('postgresql://', 'DATABASE_URL must be a PostgreSQL connection string'),

  NEXTAUTH_SECRET: z
    .string({ message: 'NEXTAUTH_SECRET is required' })
    .min(16, 'NEXTAUTH_SECRET must be at least 16 characters')
    .refine(
      (s) => process.env.NODE_ENV !== 'production' || !WEAK_SECRETS.includes(s),
      'NEXTAUTH_SECRET is too weak for production — run scripts/generate-secrets.sh'
    ),

  NEXTAUTH_URL: z
    .string({ message: 'NEXTAUTH_URL is required' })
    .url('NEXTAUTH_URL must be a valid URL'),

  // --- Storage ---
  MINIO_ENDPOINT: z
    .string({ message: 'MINIO_ENDPOINT is required' })
    .url('MINIO_ENDPOINT must be a valid URL'),

  MINIO_BUCKET: z
    .string({ message: 'MINIO_BUCKET is required' })
    .min(1, 'MINIO_BUCKET cannot be empty'),

  MINIO_REGION: z.string().default('us-east-1'),

  // --- Optional (graceful degradation) ---
  REDIS_URL: z.string().url().optional(),
  MEILI_URL: z.string().url().optional(),
  MEILI_MASTER_KEY: z.string().optional(),
  CRON_SECRET: z.string().min(16).optional(),

  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env;

try {
  _env = envSchema.parse(process.env);
} catch (err) {
  if (err instanceof z.ZodError) {
    const formatted = err.issues
      .map((issue) => `  ✗ ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    console.error(
      '\n╔══════════════════════════════════════════════╗\n' +
      '║  ⚠  ENVIRONMENT VALIDATION FAILED           ║\n' +
      '╚══════════════════════════════════════════════╝\n' +
      formatted +
      '\n\nSee env.example for required variables.\n'
    );

    // In production, crash hard. In dev, warn but continue.
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
  // Fallback: expose raw process.env so dev doesn't break
  _env = process.env as unknown as Env;
}

export const env = _env;
