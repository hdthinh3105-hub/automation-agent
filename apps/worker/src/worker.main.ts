import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module';

/**
 * Worker process entrypoint — separate from the API process but shares
 * the same `libs/` codebase (TDD §2.4/§2.8). Currently a no-op bootstrap;
 * BullMQ Processors will be registered here starting Phase 3.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    bufferLogs: true,
  });
  // eslint-disable-next-line no-console
  console.log('🛠️  Worker process started (no queues registered yet — Phase 3+)');

  process.on('SIGTERM', async () => {
    await app.close();
    process.exit(0);
  });
}

bootstrap();
