import { z } from 'zod';

/**
 * Env schema cho toàn bộ project tính tới Ngày 4. Vars chỉ cần cho
 * module optional (LLM keys, Telegram, Gmail...) khai báo optional để
 * boot không fail — mỗi module tự throw lỗi rõ ràng khi thực sự được
 * gọi mà thiếu cấu hình (TDD Mục 2.7: "fail-fast nhưng không chặn boot
 * của cả hệ thống chỉ vì 1 module con chưa cấu hình").
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  API_PREFIX: z.string().default('api'),
  CORS_ORIGIN: z.string().default('*'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  REDIS_URL: z.string().url().optional(),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional().default(''),
  REDIS_TLS: z.coerce.boolean().default(false),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(4).max(15).default(10),

  THROTTLE_TTL: z.coerce.number().int().positive().default(60),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(20),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default('llama-3.3-70b-versatile'),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-1.5-flash'),
  EMBEDDING_PROVIDER: z.enum(['local', 'gemini']).default('local'),
  EMBEDDING_MODEL: z.string().default('Xenova/bge-small-en-v1.5'),
  EMBEDDING_DIMENSIONS: z.coerce.number().int().positive().default(384),

  CHUNK_SIZE_TOKENS: z.coerce.number().int().positive().default(500),
  CHUNK_OVERLAP_TOKENS: z.coerce.number().int().min(0).default(75),
  RAG_TOP_K_RETRIEVAL: z.coerce.number().int().positive().default(15),
  RAG_TOP_K_FINAL: z.coerce.number().int().positive().default(5),
  RAG_EMBEDDING_BATCH_SIZE: z.coerce.number().int().positive().default(16),

  AI_CONFIDENCE_ESCALATION_THRESHOLD: z.coerce.number().min(0).max(1).default(0.6),
  SPAM_SCORE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.8),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),

  TELEGRAM_BOT_TOKEN: z.string().optional(),

  // ---- Gmail channel (Ngày 4) ----
  GMAIL_USER: z.string().optional(),
  GMAIL_APP_PASSWORD: z.string().optional(),
  EMAIL_POLLING_ENABLED: z.coerce.boolean().default(false),

  STORAGE_DRIVER: z.string().optional(),
  STORAGE_LOCAL_PATH: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

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