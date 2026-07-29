import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppConfigModule } from '@app/config';
import { PrismaModule, QueueModule } from '@app/infrastructure';
import { KnowledgeBaseModule } from '@app/modules/knowledge-base';
import { RagModule } from '@app/modules/rag';
import { GmailChannelAdapter } from '@app/modules/ticket';
import { DocumentParserProcessor } from './workers/document-parser.processor';
import { EmbeddingProcessor } from './workers/embedding.processor';
import { EmailProcessor } from './workers/email.processor';

/**
 * Worker composition root (TDD apps/worker, Mục 12). Đăng ký toàn bộ
 * BullMQ Processor: Document Parser Worker + Embedding Worker (Ngày 3
 * — RAG Pipeline) + Email Worker (root fix lỗi SMTP "Connection
 * timeout" — tách gửi Gmail ra khỏi process API/polling để không tranh
 * CPU với embedding/LLM). `RagModule`/`KnowledgeBaseModule` cung cấp
 * Use Case + Repository thật cho Processor gọi lại — Processor chỉ là
 * "adapter kích hoạt", không chứa business logic (TDD Mục 12).
 * `GmailChannelAdapter` được đăng ký thẳng làm provider (không import
 * cả `TicketModule`) vì nó chỉ phụ thuộc `ConfigService` (global) và
 * `EMAIL_QUEUE` (từ `QueueModule`, đã import bên dưới) — tránh kéo thêm
 * `CustomerModule`/`ConversationModule`/các controller không cần thiết
 * vào process Worker vốn đã giới hạn tài nguyên (Render free tier).
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
  providers: [DocumentParserProcessor, EmbeddingProcessor, GmailChannelAdapter, EmailProcessor],
})
export class WorkerModule {}