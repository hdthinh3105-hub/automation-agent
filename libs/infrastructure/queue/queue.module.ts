import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { DOCUMENT_PARSER_QUEUE, EMBEDDING_QUEUE, EMAIL_QUEUE } from './queue.tokens';

/**
 * TDD Mục 2.6 / Mục 12 — Redis + BullMQ dùng cho tác vụ nền cần chạy lâu
 * (chunk/embed), cần retry/backoff, cần decouple khỏi HTTP request
 * lifecycle. `@Global()` để mọi module (RagModule ở cả API lẫn Worker
 * process) chỉ cần `@InjectQueue(...)`/`@Processor(...)` mà không phải
 * tự import lại QueueModule ở từng nơi.
 *
 * Hỗ trợ 2 chế độ:
 *
 * 1. REDIS_URL (khuyến nghị cho Upstash, Railway, Render...)
 *    Ví dụ:
 *    REDIS_URL=rediss://default:password@host:6379
 *
 * 2. REDIS_HOST / REDIS_PORT / REDIS_PASSWORD (Redis local/Docker)
 *
 * Nếu REDIS_URL tồn tại sẽ được ưu tiên sử dụng.
 *
 * maxRetriesPerRequest = null là bắt buộc đối với BullMQ Worker.
 */
@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('queue.redisUrl');

        if (redisUrl) {
          return {
            connection: {
              url: redisUrl,
              maxRetriesPerRequest: null,
              enableReadyCheck: false,
            },
            skipVersionCheck: true,
          };
        }

        return {
          connection: {
            host: configService.get<string>('queue.redisHost', 'localhost'),
            port: configService.get<number>('queue.redisPort', 6379),
            password: configService.get<string>('queue.redisPassword'),
            maxRetriesPerRequest: null,
            ...(configService.get<boolean>('queue.redisTls', false)
              ? { tls: {} }
              : {}),
          },
        };
      },
    }),

    BullModule.registerQueue(
      {
        name: DOCUMENT_PARSER_QUEUE,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: {
            count: 100,
          },
          removeOnFail: false,
        },
      },
      {
        name: EMBEDDING_QUEUE,
        defaultJobOptions: {
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: {
            count: 100,
          },
          removeOnFail: false,
        },
      },
      {
        // Gửi email trả lời khách (Gmail SMTP) — tách khỏi process API/
        // polling (nơi đang chạy chung CPU với pipeline AI trên Render
        // free tier). SMTP timeout thường là lỗi tạm thời (mạng/CPU đói
        // tại thời điểm gửi), nên retry 3 lần đủ, backoff 10s/40s/160s.
        name: EMAIL_QUEUE,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 10_000,
          },
          removeOnComplete: {
            count: 200,
          },
          removeOnFail: false,
        },
      },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}