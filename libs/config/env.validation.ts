import { z } from 'zod';

/**
 * Env schema for Phase 1+2 (Setup + Auth). Vars needed only by later
 * phases (LLM keys, SMTP, etc.) are declared optional here so boot
 * doesn't fail before those modules exist — they will be tightened
 * (made required) in the Phase that actually needs them, per TDD §2.7:
 * "fail-fast nếu thiếu biến môi trường bắt buộc".
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  API_PREFIX: z.string().default('api'),
  CORS_ORIGIN: z.string().default('*'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional().default(''),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(4).max(15).default(10),

  THROTTLE_TTL: z.coerce.number().int().positive().default(60),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(20),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // Reserved for later phases — optional for now.
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().optional(),
  EMBEDDING_PROVIDER: z.string().optional(),
  EMBEDDING_MODEL: z.string().optional(),
  AI_CONFIDENCE_ESCALATION_THRESHOLD: z.coerce.number().min(0).max(1).optional(),
  SPAM_SCORE_THRESHOLD: z.coerce.number().min(0).max(1).optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  STORAGE_DRIVER: z.string().optional(),
  STORAGE_LOCAL_PATH: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Passed to `ConfigModule.forRoot({ validate })`. Nest calls this once
 * on boot with `process.env`; throwing here stops the app from starting
 * with an incomplete/invalid configuration instead of failing later at
 * a random point in the request lifecycle.
 */
export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const formatted = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`\n❌ Invalid environment configuration:\n${formatted}\n`);
  }
  return parsed.data;
}
