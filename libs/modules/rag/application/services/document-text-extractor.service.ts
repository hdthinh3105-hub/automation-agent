import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { DocumentParseFailedException } from '../../domain/exceptions/rag.exception';

/**
 * 🎯 Document Parser Worker's core logic (TDD Mục 7.2 bước [2]) — extract
 * plain text theo phần mở rộng file: `pdf-parse` cho PDF, `mammoth` cho
 * DOCX, đọc thẳng cho TXT/MD. Tách riêng khỏi Processor (BullMQ adapter)
 * để Use Case/Processor không phải biết chi tiết từng thư viện parser.
 */
@Injectable()
export class DocumentTextExtractorService {
  private readonly logger = new Logger(DocumentTextExtractorService.name);

  public async extract(filePath: string): Promise<string> {
    const ext = path.extname(filePath).toLowerCase();
    try {
      switch (ext) {
        case '.pdf':
          return await this.extractPdf(filePath);
        case '.docx':
          return await this.extractDocx(filePath);
        case '.txt':
        case '.md':
          return await fs.readFile(filePath, 'utf-8');
        default:
          throw new Error(`Unsupported file extension for text extraction: "${ext}"`);
      }
    } catch (error) {
      this.logger.error(`Text extraction failed for "${filePath}": ${(error as Error).message}`);
      throw new DocumentParseFailedException(filePath, (error as Error).message);
    }
  }

  private async extractPdf(filePath: string): Promise<string> {
    // Dynamic require — `pdf-parse` có 1 vài phiên bản tự chạy debug code
    // khi import ở top-level nếu thiếu file test cố định; require động
    // bên trong hàm tránh side-effect đó lúc app boot.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfParse = require('pdf-parse');
    const buffer = await fs.readFile(filePath);
    const result = await pdfParse(buffer);
    return result.text as string;
  }

  private async extractDocx(filePath: string): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mammoth = require('mammoth');
    const buffer = await fs.readFile(filePath);
    const result = await mammoth.extractRawText({ buffer });
    return result.value as string;
  }
}
