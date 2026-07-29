import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { DOCUMENT_PARSER_QUEUE, EMBEDDING_QUEUE, EMAIL_QUEUE } from './queue.tokens';

/**
 * TDD Mục 2.6 / Mục 12 — Redis + BullMQ.
 *
 * TUNING CHO UPSTASH FREE TIER (root fix cho "quota tăng liên tục"):
 * Mặc định BullMQ Worker poll Redis mỗi ~5s (drainDelay) NGAY CẢ KHI
 * hàng đợi rỗng, và tự kiểm tra "stalled job" mỗi 30s (stalledInterval)
 * — tốn hàng chục nghìn lệnh/ngày dù không có job nào chạy thật. Trên
 * Redis tính phí theo LỆNH (Upstash) thay vì theo giờ chạy, đây là
 * nguyên nhân chính khiến quota tăng đều đặn dù traffic thấp — không
 * phải do nghiệp vụ ticket/email tạo ra nhiều lệnh.
 *
 * LƯU Ý QUAN TRỌNG (BullMQ, khác với Bull cũ):
 * `drainDelay` và `stalledInterval` là các option của **Worker**, KHÔNG
 * phải của Queue. Trong BullMQ, `QueueOptions.settings` chỉ dành cho
 * repeatable jobs (`AdvancedRepeatOptions`) và không có 2 field này —
 * đặt ở đây sẽ bị lỗi type "does not exist in type 'AdvancedRepeatOptions'".
 * Vì vậy 2 giá trị này đã được CHUYỂN sang decorator `@Processor(...)`
 * tương ứng ở từng processor (xem apps/worker/src/workers/*.processor.ts):
 *   - document-parser.processor.ts: @Processor(DOCUMENT_PARSER_QUEUE, { drainDelay: 30, stalledInterval: 120_000 })
 *   - embedding.processor.ts:       @Processor(EMBEDDING_QUEUE, { drainDelay: 30, stalledInterval: 120_000 })
 *   - email.processor.ts:           @Processor(EMAIL_QUEUE, { drainDelay: 10, stalledInterval: 120_000 })
 */
@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('queue.redisUrl');

        const baseConnection = redisUrl
          ? {
              url: redisUrl,
              maxRetriesPerRequest: null,
              enableReadyCheck: false,
            }
          : {
              host: configService.get<string>('queue.redisHost', 'localhost'),
              port: configService.get<number>('queue.redisPort', 6379),
              password: configService.get<string>('queue.redisPassword'),
              maxRetriesPerRequest: null,
              ...(configService.get<boolean>('queue.redisTls', false) ? { tls: {} } : {}),
            };

        return {
          connection: baseConnection,
          // Áp dụng mặc định cho MỌI queue đăng ký bên dưới — giảm tần
          // suất polling nền (nguyên nhân chính đốt quota Upstash).
          defaultJobOptions: {
            removeOnComplete: { count: 50 },
            removeOnFail: { count: 100 },
          },
        };
      },
    }),

    BullModule.registerQueue(
      {
        name: DOCUMENT_PARSER_QUEUE,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: { count: 50 },
          removeOnFail: false,
        },
      },
      {
        name: EMBEDDING_QUEUE,
        defaultJobOptions: {
          attempts: 5,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: { count: 50 },
          removeOnFail: false,
        },
      },
      {
        name: EMAIL_QUEUE,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 10_000 },
          removeOnComplete: { count: 100 },
          removeOnFail: false,
        },
      },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}