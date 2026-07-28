import { Inject, Injectable, Logger } from '@nestjs/common';
import { LLM_PROVIDER, ILlmProvider } from '@app/infrastructure';
import { TICKET_CATEGORIES, TicketCategory, isKnownCategory } from '../../domain/value-objects/category.vo';
import { PromptLogService } from './prompt-log.service';

export interface ClassificationResult {
  category: TicketCategory;
  confidence: number;
}

const FALLBACK_CATEGORY: TicketCategory = 'Hỏi đáp thông tin';

/**
 * 🎯 `ClassificationService` (TDD Mục 5.7/8, bước 1) — gọi LLM để phân
 * loại nội dung message vào 1 trong `TICKET_CATEGORIES`. Nếu LLM lỗi
 * hoặc trả về giá trị không hợp lệ, fallback về heuristic từ khoá đơn
 * giản — KHÔNG để lỗi LLM chặn toàn bộ pipeline (TDD Mục 15: rate-limit
 * LLM free tier là rủi ro đã biết).
 */
@Injectable()
export class ClassificationService {
  private readonly logger = new Logger(ClassificationService.name);

  constructor(
    @Inject(LLM_PROVIDER) private readonly llmProvider: ILlmProvider,
    private readonly promptLogService: PromptLogService,
  ) {}

  async classify(content: string, ticketId: string): Promise<ClassificationResult> {
    try {
      const startedAt = Date.now();
      const result = await this.llmProvider.complete(
        [
          {
            role: 'system',
            content: `Bạn là bộ phân loại yêu cầu hỗ trợ khách hàng. Phân loại nội dung khách hàng gửi vào ĐÚNG 1 trong các nhóm sau (trả về chính xác tên nhóm, không thêm giải thích, không thêm dấu câu):\n${TICKET_CATEGORIES.map((c) => `- ${c}`).join('\n')}`,
          },
          { role: 'user', content },
        ],
        { temperature: 0, maxTokens: 30 },
      );

      const category = result.content.trim();
      void this.promptLogService.log({
        ticketId,
        useCase: 'classification',
        provider: result.provider,
        model: result.model,
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        latencyMs: Date.now() - startedAt,
        responseRaw: result.content,
      });

      if (isKnownCategory(category)) {
        return { category, confidence: 0.9 };
      }
      this.logger.warn(`LLM returned unknown category "${category}", falling back to heuristic`);
      return { category: this.heuristicClassify(content), confidence: 0.4 };
    } catch (error) {
      this.logger.warn(`Classification LLM call failed, falling back to heuristic: ${(error as Error).message}`);
      return { category: this.heuristicClassify(content), confidence: 0.3 };
    }
  }

  private heuristicClassify(content: string): TicketCategory {
    const lower = content.toLowerCase();
    if (/(khẩn cấp|gấp|mất tiền|gian lận|sập|không thể truy cập)/.test(lower)) {
      return 'Yêu cầu khẩn cấp';
    }
    if (/(thanh toán|hoàn tiền|thẻ|ví|nạp tiền|pay-)/.test(lower)) {
      return 'Yêu cầu thanh toán';
    }
    if (/(lỗi|bug|không đăng nhập|không hoạt động|crash|treo)/.test(lower)) {
      return 'Yêu cầu kỹ thuật';
    }
    if (/(khiếu nại|phàn nàn|tệ|không hài lòng|thất vọng)/.test(lower)) {
      return 'Khiếu nại';
    }
    return FALLBACK_CATEGORY;
  }
}