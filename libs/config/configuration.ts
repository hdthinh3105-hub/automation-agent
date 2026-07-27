import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  apiPrefix: process.env.API_PREFIX ?? 'api',
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  logLevel: process.env.LOG_LEVEL ?? 'info',
}));

export const databaseConfig = registerAs('database', () => ({
  url: process.env.DATABASE_URL,
}));

export const redisConfig = registerAs('redis', () => ({
  url: process.env.REDIS_URL,

  host: process.env.REDIS_HOST ?? 'localhost',
  port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  tls: (process.env.REDIS_TLS ?? 'false').toLowerCase() === 'true',
}));

export const jwtConfig = registerAs('jwt', () => ({
  accessSecret: process.env.JWT_ACCESS_SECRET,
  accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '10', 10),
}));

export const throttleConfig = registerAs('throttle', () => ({
  ttl: parseInt(process.env.THROTTLE_TTL ?? '60', 10),
  limit: parseInt(process.env.THROTTLE_LIMIT ?? '20', 10),
}));

export const storageConfig = registerAs('storage', () => ({
  driver: process.env.STORAGE_DRIVER ?? 'local',
  localPath: process.env.STORAGE_LOCAL_PATH ?? './storage/documents',
  maxUploadSizeBytes: parseInt(process.env.STORAGE_MAX_UPLOAD_SIZE_BYTES ?? `${10 * 1024 * 1024}`, 10),
}));

export const llmConfig = registerAs('llm', () => ({
  groqApiKey: process.env.GROQ_API_KEY || undefined,
  groqModel: process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile',
  geminiApiKey: process.env.GEMINI_API_KEY || undefined,
  geminiModel: process.env.GEMINI_MODEL ?? 'gemini-1.5-flash',
}));

export const embeddingConfig = registerAs('embedding', () => ({
  provider: process.env.EMBEDDING_PROVIDER ?? 'local',
  model: process.env.EMBEDDING_MODEL ?? 'Xenova/bge-small-en-v1.5',
  dimensions: parseInt(process.env.EMBEDDING_DIMENSIONS ?? '384', 10),
}));

export const ragConfig = registerAs('rag', () => ({
  chunkSizeTokens: parseInt(process.env.CHUNK_SIZE_TOKENS ?? '500', 10),
  chunkOverlapTokens: parseInt(process.env.CHUNK_OVERLAP_TOKENS ?? '75', 10),
  topKRetrieval: parseInt(process.env.RAG_TOP_K_RETRIEVAL ?? '15', 10),
  topKFinal: parseInt(process.env.RAG_TOP_K_FINAL ?? '5', 10),
  embeddingBatchSize: parseInt(process.env.RAG_EMBEDDING_BATCH_SIZE ?? '16', 10),
  confidenceEscalationThreshold: parseFloat(process.env.AI_CONFIDENCE_ESCALATION_THRESHOLD ?? '0.6'),
}));

export const queueConfig = registerAs('queue', () => ({
  redisUrl: process.env.REDIS_URL,

  redisHost: process.env.REDIS_HOST ?? 'localhost',
  redisPort: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  redisPassword: process.env.REDIS_PASSWORD || undefined,
  redisTls: (process.env.REDIS_TLS ?? 'false').toLowerCase() === 'true',
}));