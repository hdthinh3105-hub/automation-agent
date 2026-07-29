import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as nodemailer from 'nodemailer';
import { ParsedMail } from 'mailparser';
import { convert as htmlToText } from 'html-to-text';
import { IChannelAdapter, CreateTicketCommand } from '../../application/ports/channel-adapter.port';
import { EMAIL_QUEUE, EmailJobData } from '@app/infrastructure';

/**
 * Channel Adapter — Could have (TDD Mục 5.3, 14.1). Thay thế Mailgun:
 * dùng thẳng Gmail cá nhân qua IMAP (nhận) và SMTP (gửi trả lời).
 *
 * ROOT FIX (sau khi loại trừ giả thuyết "Render free tier chặn SMTP" —
 * dự án EventHub cùng hạ tầng Render free tier gửi SMTP bình thường):
 * nguyên nhân thật là process API/polling này chạy CHUNG CPU (Render
 * free tier, throttle mạnh) với pipeline AI (local embedding model,
 * LLM re-ranking) ngay trong cùng request xử lý email. TLS handshake
 * của SMTP cần CPU cho crypto — nếu bị đói CPU ngay sau khi vừa chạy
 * embedding, handshake không kịp hoàn tất trong `connectionTimeout` dù
 * mạng không hề bị chặn.
 *
 * `sendMail()` giờ CHỈ enqueue job vào `EMAIL_QUEUE` (BullMQ/Redis) —
 * trả về gần như ngay lập tức, không còn chạm SMTP trong process API/
 * polling. Việc gửi SMTP thật được chuyển hẳn sang `EmailProcessor`
 * (apps/worker) — 1 process riêng, không tranh CPU với embedding/LLM.
 */
@Injectable()
export class GmailChannelAdapter implements IChannelAdapter {
  private readonly logger = new Logger(GmailChannelAdapter.name);
  private readonly gmailUser: string | undefined;
  private readonly gmailAppPassword: string | undefined;
  private transporter: nodemailer.Transporter | null = null;

  constructor(
    private readonly configService: ConfigService,
    @InjectQueue(EMAIL_QUEUE) private readonly emailQueue: Queue<EmailJobData>,
  ) {
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

  /**
   * Gọi từ GmailPollingService/luồng xử lý request — CHỈ enqueue, không
   * gửi SMTP trực tiếp ở đây nữa (xem ghi chú ROOT FIX ở đầu file).
   */
  async sendMail(to: string, subject: string, text: string): Promise<void> {
    if (!this.gmailUser || !this.gmailAppPassword) {
      this.logger.warn('GMAIL_USER/GMAIL_APP_PASSWORD chưa cấu hình — bỏ qua gửi email phản hồi.');
      return;
    }
    try {
      await this.emailQueue.add(
        'send',
        { to, subject, text },
        // jobId để BullMQ tự loại trùng nếu vô tình enqueue lại đúng
        // (to, subject) trong cùng giây — không bắt buộc nhưng an toàn.
        { jobId: `email:${Date.now()}:${to}` },
      );
      this.logger.log(`>>> Đã enqueue email tới ${to} (subject="${subject}") — worker sẽ gửi.`);
    } catch (error) {
      // Lỗi enqueue (Redis down...) khác hẳn lỗi SMTP — vẫn log rõ
      // nhưng không throw để không làm hỏng luồng tạo ticket/mark \Seen.
      this.logger.error(`Enqueue email thất bại: ${(error as Error).message}`, (error as Error).stack);
    }
  }

  /**
   * Gửi SMTP THẬT — chỉ được gọi từ `EmailProcessor` (apps/worker), một
   * process riêng biệt không tranh CPU với pipeline AI. KHÔNG catch lỗi
   * ở đây: để lỗi throw ra ngoài cho BullMQ tự retry theo
   * `defaultJobOptions` đã khai báo ở `QueueModule` (3 lần, backoff
   * 10s/40s/160s).
   */
  async sendMailDirect(to: string, subject: string, text: string): Promise<void> {
    if (!this.gmailUser || !this.gmailAppPassword) {
      this.logger.warn('GMAIL_USER/GMAIL_APP_PASSWORD chưa cấu hình — bỏ qua gửi email phản hồi.');
      return;
    }
    this.logger.log(`>>> Bắt đầu gửi email tới ${to} (subject="${subject}")`);
    const transporter = this.getTransporter();
    await transporter.sendMail({
      from: `"Hỗ trợ khách hàng" <${this.gmailUser}>`,
      to,
      subject,
      text,
    });
    this.logger.log(`Đã gửi email trả lời tới ${to}`);
  }

  private getTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      // Dùng host/port tường minh thay vì shorthand `service: 'gmail'`
      // — trên một số PaaS (Render free tier), cách resolve DNS/host
      // ngầm của `service: 'gmail'` đôi khi kết nối chậm/treo dẫn tới
      // "Connection timeout" dù cùng code chạy ổn định ở máy local.
      // Cổng 465 (SMTPS, secure:true) ổn định hơn cổng 587 (STARTTLS)
      // trên môi trường container có outbound network hạn chế.
      this.transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: { user: this.gmailUser, pass: this.gmailAppPassword },
        connectionTimeout: 20_000,
        greetingTimeout: 20_000,
        socketTimeout: 20_000,
      });
    }
    return this.transporter;
  }
}