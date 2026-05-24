import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  JWT_SECRET: z.string().min(8, 'JWT_SECRET must be at least 8 characters'),
  JWT_EXPIRES_IN: z.string().default('12h'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(10),

  SEED_ADMIN_EMAIL: z.string().email().optional(),
  SEED_ADMIN_PASSWORD: z.string().min(4).optional(),
  SEED_ADMIN_NAME: z.string().min(1).default('Administrator'),

  AWS_REGION: z.string().default('ap-northeast-2'),
  S3_BUCKET: z.string().optional().default(''),
  S3_PRESIGN_TTL_SECONDS: z.coerce.number().int().positive().default(300),

  FILE_MAX_BYTES: z.coerce.number().int().positive().default(10 * 1024 * 1024),
  FILE_ALLOWED_MIME: z
    .string()
    .default('image/png,image/jpeg,image/webp,application/pdf')
    .transform((v) =>
      v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    ),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // CORS — 쉼표 구분 origin 목록 또는 '*'
  CORS_ORIGIN: z.string().default('*'),

  // V2 (RDS/MySQL) 준비용 — V1 인메모리 모드에서는 사용되지 않음.
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_USER: z.string().default('root'),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().default('mentoring'),
  DB_POOL_LIMIT: z.coerce.number().int().positive().default(10),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('[env] Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
