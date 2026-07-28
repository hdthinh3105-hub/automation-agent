import { Body, Controller, Post } from '@nestjs/common';
import { Public } from '@app/shared/decorators/public.decorator';
import { CreateTicketUseCase } from '../../application/use-cases/create-ticket.use-case';
import { TelegramChannelAdapter } from '../../infrastructure/adapters/telegram-channel.adapter';

/**
 * Webhook nhận update từ Telegram Bot API (TDD Mục 5.3 —
 * ChatAppChannelAdapter, Should have). Public vì Telegram gọi trực
 * tiếp, không có JWT — bảo mật dựa vào việc URL webhook chỉ được biết
 * bởi Telegram (đăng ký 1 lần qua `setWebhook`), đủ dùng cho phạm vi
 * Assessment 7 ngày.
 *
 * Đăng ký webhook (chạy 1 lần sau khi deploy, thay YOUR_TOKEN và
 * YOUR_PUBLIC_URL):
 *   curl "https://api.telegram.org/botYOUR_TOKEN/setWebhook?url=YOUR_PUBLIC_URL/api/webhooks/telegram"
 */
@Controller('webhooks/telegram')
export class TelegramWebhookController {
  constructor(
    private readonly telegramChannelAdapter: TelegramChannelAdapter,
    private readonly createTicketUseCase: CreateTicketUseCase,
  ) {}

  @Public()
  @Post()
  async handleUpdate(@Body() update: unknown): Promise<{ ok: true }> {
    try {
      const command = this.telegramChannelAdapter.parseIncoming(update as never);
      await this.createTicketUseCase.execute(command);
    } catch {
      // Update không chứa tin nhắn văn bản (vd sticker, join event...) —
      // bỏ qua, vẫn trả 200 để Telegram không retry vô hạn.
    }
    return { ok: true };
  }
}