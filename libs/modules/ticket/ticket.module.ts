import { Module } from '@nestjs/common';
import { CustomerModule } from '@app/modules/customer';
import { TICKET_REPOSITORY, TICKET_READ_REPOSITORY } from './application/ports/repository.ports';
import { PrismaTicketRepository } from './infrastructure/repositories/prisma-ticket.repository';
import { PrismaTicketReadRepository } from './infrastructure/repositories/prisma-ticket-read.repository';
import { WebChannelAdapter } from './infrastructure/adapters/web-channel.adapter';
import { TelegramChannelAdapter } from './infrastructure/adapters/telegram-channel.adapter';
import { TicketStateMachineService } from './domain/services/ticket-state-machine.service';
import { CreateTicketUseCase } from './application/use-cases/create-ticket.use-case';
import { UpdateTicketStatusUseCase } from './application/use-cases/update-ticket-status.use-case';
import { AddCustomerMessageUseCase } from './application/use-cases/add-customer-message.use-case';
import {
  ListTicketsUseCase,
  GetTicketDetailUseCase,
} from './application/use-cases/ticket-queries.use-case';
import { TicketController } from './presentation/controllers/ticket.controller';
import { TelegramWebhookController } from './presentation/controllers/telegram-webhook.controller';
import { ConversationModule } from '@app/modules/conversation';

@Module({
  imports: [CustomerModule, ConversationModule],
  controllers: [TicketController, TelegramWebhookController],
  providers: [
    { provide: TICKET_REPOSITORY, useClass: PrismaTicketRepository },
    { provide: TICKET_READ_REPOSITORY, useClass: PrismaTicketReadRepository },
    WebChannelAdapter,
    TelegramChannelAdapter,
    TicketStateMachineService,
    CreateTicketUseCase,
    UpdateTicketStatusUseCase,
    AddCustomerMessageUseCase,
    ListTicketsUseCase,
    GetTicketDetailUseCase,
  ],
  // TICKET_REPOSITORY export sẵn cho Escalation/Analytics Module đọc ở Phase sau.
  exports: [TICKET_REPOSITORY, TICKET_READ_REPOSITORY],
})
export class TicketModule {}