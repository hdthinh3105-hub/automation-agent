import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IChannelAdapter, CreateTicketCommand } from '../../application/ports/channel-adapter.port';

interface TelegramUpdate {
  message?: {
    chat: { id: number };
    text?: string;
    from?: { id: number; first_name?: string; username?: string };
  };
}

/**
 * Channel Adapter — Should have (TDD Mục 5.3, 14). Đơn giản hoá cho Đợt
 * Ngày 4: mỗi tin nhắn Telegram gửi tới tạo 1 ticket MỚI (không thread
 * hội thoại qua nhiều tin nhắn Telegram thành 1 ticket duy nhất). Đây là
 * giới hạn đã biết, ghi vào Nhật ký quyết định (TDD Mục 17): đủ để
 * chứng minh tính đa kênh sống động cho video demo, nhưng chưa map
 * `telegramChatId` -> ticket đang mở để tiếp tục hội thoại trên cùng 1
 * ticket (hướng cải tiến nếu có thêm thời gian).
 */
@Injectable()
export class TelegramChannelAdapter implements IChannelAdapter {
  private readonly logger = new Logger(TelegramChannelAdapter.name);
  private readonly botToken: string | undefined;

  constructor(private readonly configService: ConfigService) {
    this.botToken = this.configService.get<string>('telegram.botToken');
  }

  parseIncoming(rawPayload: TelegramUpdate): CreateTicketCommand {
    const message = rawPayload?.message;
    if (!message?.text) {
      throw new Error('Telegram update does not contain a text message');
    }
    const chatId = message.chat.id;
    const fromName =
      message.from?.username ?? message.from?.first_name ?? `telegram_user_${message.from?.id ?? chatId}`;
    // Không có email thật từ Telegram -> dùng địa chỉ giả định nhất
    // quán theo chatId để FindOrCreateCustomerUseCase gom đúng 1
    // Customer cho cùng 1 chatId qua các lần nhắn khác nhau.
    const syntheticEmail = `telegram-${chatId}@telegram.local`;

    return {
      customerEmail: syntheticEmail,
      customerName: fromName,
      subject: message.text.length > 80 ? `${message.text.slice(0, 77)}...` : message.text,
      content: message.text,
      channel: 'CHAT_APP',
      channelMetadata: { telegramChatId: chatId },
    };
  }

  async sendReply(ticketId: string, content: string): Promise<void> {
    // sendReply chưa được gọi ở Đợt Ngày 4 (khách xem câu trả lời qua
    // Dashboard/API); để sẵn interface cho Phase sau khi có nhu cầu "đẩy"
    // chủ động tin nhắn về Telegram (cần tra chatId từ channelMetadata
    // của tin nhắn đầu tiên của ticket).
    this.logger.warn(
      `sendReply() chưa được implement cho TelegramChannelAdapter (ticketId=${ticketId}, content length=${content.length}, botTokenConfigured=${Boolean(this.botToken)})`,
    );
  }
}