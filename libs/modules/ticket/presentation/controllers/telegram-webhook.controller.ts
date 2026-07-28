import { Body, Controller, Post } from '@nestjs/common';
import { Public } from '@app/shared/decorators/public.decorator';
import { CreateTicketUseCase } from '../../application/use-cases/create-ticket.use-case';
import { TelegramChannelAdapter } from '../../infrastructure/adapters/telegram-channel.adapter';
import { GetTicketDetailUseCase } from '../../application/use-cases/ticket-queries.use-case';

/**
 * Webhook nhận update từ Telegram Bot API (TDD Mục 5.3 — ChatAppChannelAdapter).
 * Sau khi tạo ticket + AI pipeline chạy xong (đồng bộ trong request —
 * xem CreateTicketUseCase), đọc lại trạng thái/câu trả lời mới nhất và
 * gửi ngược cho khách qua TelegramChannelAdapter.sendMessage().
 */
@Controller('webhooks/telegram')
export class TelegramWebhookController {
  constructor(
    private readonly telegramChannelAdapter: TelegramChannelAdapter,
    private readonly createTicketUseCase: CreateTicketUseCase,
    private readonly getTicketDetailUseCase: GetTicketDetailUseCase,
  ) {}

  @Public()
  @Post()
  async handleUpdate(@Body() update: unknown): Promise<{ ok: true }> {
    let chatId: number | string | undefined;
    try {
      const command = this.telegramChannelAdapter.parseIncoming(update as never);
      chatId = (command.channelMetadata as { telegramChatId?: number | string })?.telegramChatId;

      const ticket = await this.createTicketUseCase.execute(command);

      if (chatId) {
        const replyText = await this.buildReplyText(ticket.id, ticket.status);
        await this.telegramChannelAdapter.sendMessage(chatId, replyText);
      }
    } catch (error) {
      // Update không chứa tin nhắn văn bản (sticker, join event...) hoặc
      // lỗi khác — bỏ qua, vẫn trả 200 để Telegram không retry vô hạn.
      if (chatId) {
        await this.telegramChannelAdapter.sendMessage(
          chatId,
          'Xin lỗi, hệ thống gặp sự cố khi xử lý yêu cầu của bạn. Vui lòng thử lại sau.',
        );
      }
    }
    return { ok: true };
  }

  /** Đọc lại ticket detail (đã có category/priority/messages sau AI pipeline) để soạn tin nhắn phản hồi. */
  private async buildReplyText(ticketId: string, status: string): Promise<string> {
    try {
      const detail = await this.getTicketDetailUseCase.execute(ticketId);
      const lastAiMessage = [...detail.messages].reverse().find((m) => m.sender === 'AI');

      if (lastAiMessage) {
        return lastAiMessage.content;
      }
      if (status === 'ESCALATED') {
        return `Yêu cầu của bạn (mã ${ticketId.slice(0, 8)}) đã được chuyển cho nhân viên hỗ trợ, vui lòng chờ phản hồi.`;
      }
      if (status === 'WAITING_CUSTOMER') {
        return 'Bạn vui lòng cung cấp thêm thông tin để chúng tôi hỗ trợ chính xác hơn (ví dụ: mã đơn hàng).';
      }
      return `Đã ghi nhận yêu cầu của bạn (mã ${ticketId.slice(0, 8)}).`;
    } catch {
      return `Đã ghi nhận yêu cầu của bạn (mã ${ticketId.slice(0, 8)}).`;
    }
  }
}