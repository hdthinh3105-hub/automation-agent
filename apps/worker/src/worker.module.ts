import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppConfigModule } from '@app/config';
import { PrismaModule, QueueModule } from '@app/infrastructure';
import { KnowledgeBaseModule } from '@app/modules/knowledge-base';
import { RagModule } from '@app/modules/rag';
import { DocumentParserProcessor } from './workers/document-parser.processor';
import { EmbeddingProcessor } from './workers/embedding.processor';

/**
 * Worker composition root (TDD apps/worker, Mục 12). Đăng ký toàn bộ
 * BullMQ Processor thật đầu tiên: Document Parser Worker + Embedding
 * Worker (Ngày 3 — RAG Pipeline). `RagModule`/`KnowledgeBaseModule`
 * cung cấp Use Case + Repository thật cho Processor gọi lại — Processor
 * chỉ là "adapter kích hoạt", không chứa business logic (TDD Mục 12).
 *
 * `EventEmitterModule.forRoot()` BẮT BUỘC phải có ở đây (không chỉ ở
 * apps/api) — vì `KnowledgeBaseModule`/`RagModule` dùng chung codebase
 * `libs/` với API process, và các entity/use-case bên trong (vd
 * `UploadDocumentUseCase`, `DocumentParserProcessor`) inject
 * `EventEmitter2` để phát domain event. Đây là 1 EventEmitter2 instance
 * RIÊNG của Worker process (in-process, không chia sẻ với API) — chỉ
 * dùng để các listener nội bộ trong Worker (nếu có) nhận event do chính
 * Worker phát ra, KHÔNG dùng để nhận event từ API process (2 process
 * độc lập, giao tiếp qua Redis/BullMQ, không qua EventEmitter2).
 */
@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    QueueModule,
    EventEmitterModule.forRoot(),
    KnowledgeBaseModule,
    RagModule,
  ],
  providers: [DocumentParserProcessor, EmbeddingProcessor],
})
export class WorkerModule {}