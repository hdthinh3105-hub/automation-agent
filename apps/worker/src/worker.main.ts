import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module';

/**
 * Worker process entrypoint — separate từ API process nhưng dùng chung
 * codebase `libs/` (TDD §2.4/§2.8). Từ Ngày 3 (RAG Pipeline Đợt 1),
 * Worker này chạy thật 2 BullMQ Processor: Document Parser + Embedding
 * (đăng ký trong `WorkerModule`) — không còn là bootstrap rỗng như
 * Phase 1+2 nữa.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    bufferLogs: true,
  });
  // eslint-disable-next-line no-console
  console.log('🛠️  Worker process started — Document Parser + Embedding queues are being processed.');

  process.on('SIGTERM', async () => {
    await app.close();
    process.exit(0);
  });
}

bootstrap();