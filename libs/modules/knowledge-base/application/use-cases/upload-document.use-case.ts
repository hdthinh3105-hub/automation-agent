import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuid } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import {
  KNOWLEDGE_DOCUMENT_REPOSITORY,
  IKnowledgeDocumentRepository,
} from '../ports/knowledge-document-repository.port';
import { KnowledgeDocument, DocumentSourceType } from '../../domain/entities/knowledge-document.entity';
import {
  DocumentInvalidFormatException,
  DocumentTooLargeException,
} from '../../domain/exceptions/knowledge-document.exception';
import { DocumentResponseDto } from '../dto/knowledge-document.dto';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

/**
 * 🎯 Use Case — lưu file gốc + tạo record `KnowledgeDocument(status=PENDING)`,
 * phát DocumentUploadedEvent (TDD Mục 5.5, 7.2 bước [1]). KHÔNG tự
 * chunk/embed — đó là việc của RAG Module ở Phase 5, lắng nghe qua Event
 * (đúng ranh giới module, TDD Mục 2.4).
 */
@Injectable()
export class UploadDocumentUseCase {
  constructor(
    @Inject(KNOWLEDGE_DOCUMENT_REPOSITORY)
    private readonly documentRepository: IKnowledgeDocumentRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {}

  async execute(
    file: Express.Multer.File,
    title: string,
    tags: string[] | undefined,
    uploadedBy: string,
  ): Promise<DocumentResponseDto> {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new DocumentInvalidFormatException(file.mimetype);
    }

    const maxSizeBytes = this.configService.get<number>('storage.maxUploadSizeBytes')!;
    if (file.size > maxSizeBytes) {
      throw new DocumentTooLargeException(file.size, maxSizeBytes);
    }

    const storageDir = this.configService.get<string>('storage.localPath')!;
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    const storedFileName = `${Date.now()}-${file.originalname}`;
    const storedPath = path.join(storageDir, storedFileName);
    fs.writeFileSync(storedPath, file.buffer);

    const document = KnowledgeDocument.create({
      id: uuid(),
      title,
      sourceType: DocumentSourceType.FILE,
      filePath: storedPath,
      tags,
      uploadedBy,
    });
    await this.documentRepository.save(document);

    for (const event of document.domainEvents) {
      this.eventEmitter.emit(event.eventName, event);
    }
    document.clearDomainEvents();

    return {
      id: document.id,
      title: document.title,
      status: document.status,
      version: document.version,
      tags: document.tags,
      createdAt: document.createdAt,
    };
  }
}
