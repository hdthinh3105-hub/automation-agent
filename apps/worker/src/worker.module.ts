import { Module } from '@nestjs/common';
import { AppConfigModule } from '@app/config';
import { PrismaModule } from '@app/infrastructure';

/**
 * Placeholder Worker composition root (TDD apps/worker). Real BullMQ
 * Processors (Document Parser, Embedding, Email, Analytics, Retry,
 * SLA Watcher) are introduced starting Phase 3 (Redis/Queue wiring)
 * and Phase 5 (RAG workers) — see TDD Mục 12. Kept minimal for now so
 * the monorepo's second entrypoint builds and runs from Day 1.
 */
@Module({
  imports: [AppConfigModule, PrismaModule],
})
export class WorkerModule {}
