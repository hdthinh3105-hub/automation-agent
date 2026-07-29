import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { ParsedMail } from 'mailparser';
import { convert as htmlToText } from 'html-to-text';
import { IChannelAdapter, CreateTicketCommand } from '../../application/ports/channel-adapter.port';

/**
 * Channel Adapter — Could have (TDD Mục 5.3, 14.1). Thay thế Mailgun:
 * dùng thẳng Gmail cá nhân qua IMAP (nhận) và SMTP (gửi trả lời).
 */
@Injectable()
export class GmailChannelAdapter implements IChannelAdapter {
  private readonly logger = new Logger(GmailChannelAdapter.name);
  private readonly gmailUser: string | undefined;
  private readonly gmailAppPassword: string | undefined;
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    this.gmailUser = this.configService.get<string>('email.gmailUser');
    this.gmailAppPassword = this.configService.get<string>('email.gmailAppPassword');
  }

  parseIncoming(rawPayload: ParsedMail): CreateTicketCommand {
    const fromAddress = rawPayload.from?.value?.[0]?.address;
    if (!fromAddress) {
      throw new Error('Gmail message does not contain a readable "from" address');
    }

    // Gmail Web/App thường soạn mail dạng HTML, không có `text` thuần
    // — mailparser trả `rawPayload.text` là undefined trong trường hợp
    // đó dù `rawPayload.html` có nội dung. Fallback: nếu không có text
    // thuần, tự convert từ HTML sang text (bug đã gặp trong thực tế:
    // email thật gửi tới không tạo được ticket vì bị throw ở đây rồi
    // catch âm thầm, log không rõ ràng).
    let content = (rawPayload.text ?? '').trim();
    if (!content && rawPayload.html) {
      content = htmlToText(rawPayload.html, { wordwrap: false }).trim();
    }
    if (!content) {
      throw new Error('Gmail message has no readable text or html body');
    }

    const fromName = rawPayload.from?.value?.[0]?.name;
    const subject = (rawPayload.subject ?? 'Yêu cầu hỗ trợ qua Email').trim();

    return {
      customerEmail: fromAddress.toLowerCase(),
      customerName: fromName && fromName.trim().length > 0 ? fromName.trim() : undefined,
      subject: subject.length > 150 ? `${subject.slice(0, 147)}...` : subject,
      content,
      channel: 'EMAIL',
      channelMetadata: { messageId: rawPayload.messageId },
    };
  }

  async sendReply(ticketId: string, content: string): Promise<void> {
    this.logger.warn(
      `sendReply(ticketId, content) không dùng cho Gmail — dùng sendMail(to, subject, text) thay thế (ticketId=${ticketId}, content length=${content.length})`,
    );
  }

  async sendMail(to: string, subject: string, text: string): Promise<void> {
    if (!this.gmailUser || !this.gmailAppPassword) {
      this.logger.warn('GMAIL_USER/GMAIL_APP_PASSWORD chưa cấu hình — bỏ qua gửi email phản hồi.');
      return;
    }
    try {
      const transporter = this.getTransporter();
      await transporter.sendMail({
        from: `"Hỗ trợ khách hàng" <${this.gmailUser}>`,
        to,
        subject,
        text,
      });
      this.logger.log(`Đã gửi email trả lời tới ${to}`);
    } catch (error) {
      this.logger.error(`Gửi email thất bại: ${(error as Error).message}`);
    }
  }

  private getTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: this.gmailUser, pass: this.gmailAppPassword },
      });
    }
    return this.transporter;
  }
}