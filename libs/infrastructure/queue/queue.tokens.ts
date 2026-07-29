/**
 * Tên queue tập trung (TDD Mục 12). Dùng string constant thay vì rải
 * literal khắp nơi — cả `QueueModule.registerQueue()`, `@InjectQueue()`,
 * và `@Processor()` đều import từ đây để tránh gõ sai tên queue.
 */
export const DOCUMENT_PARSER_QUEUE = 'document-parser';
export const EMBEDDING_QUEUE = 'embedding';
export const EMAIL_QUEUE = 'email';

export interface DocumentParserJobData {
  documentId: string;
}

export interface EmbeddingJobData {
  documentId: string;
}

export interface EmailJobData {
  to: string;
  subject: string;
  text: string;
}