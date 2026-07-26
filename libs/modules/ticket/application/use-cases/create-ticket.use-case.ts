import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuid } from 'uuid';
import { Ticket } from '../../domain/entities/ticket.entity';
import { TicketMessage } from '../../domain/entities/ticket-message.entity';
import { MessageSender } from '../../domain/value-objects/message-sender.vo';
import { Channel } from '../../domain/value-objects/channel.vo';
import { ITicketRepository, TICKET_REPOSITORY } from '../ports/repository.ports';
import { CreateTicketCommand } from '../ports/channel-adapter.port';
import { FindOrCreateCustomerUseCase } from '@app/modules/customer';
import { TicketResponseDto } from '../dto/ticket.dto';
import { AppendTurnUseCase, TurnRole } from '@app/modules/conversation';

/**
 * 🎯 Use Case — điểm hội tụ của mọi Channel Adapter (TDD Mục 5.3).
 * Không AI pipeline ở Phase này — ticket dừng ở status=NEW; Phase 6 sẽ
 * nối `ProcessIncomingMessageUseCase` qua sự kiện `ticket.created`.
 */
@Injectable()
export class CreateTicketUseCase {
  constructor(
    @Inject(TICKET_REPOSITORY) private readonly ticketRepository: ITicketRepository,
    private readonly findOrCreateCustomer: FindOrCreateCustomerUseCase,
    private readonly appendTurn: AppendTurnUseCase,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: CreateTicketCommand): Promise<TicketResponseDto> {
    const customer = await this.findOrCreateCustomer.execute({
      email: command.customerEmail,
      name: command.customerName,
    });

    const ticket = Ticket.create({
      id: uuid(),
      customerId: customer.id,
      channel: Channel[command.channel],
      subject: command.subject,
    });
    await this.ticketRepository.save(ticket);

    const firstMessage = TicketMessage.create({
      id: uuid(),
      ticketId: ticket.id,
      sender: MessageSender.CUSTOMER,
      content: command.content,
      channelMetadata: command.channelMetadata,
    });
    await this.ticketRepository.saveMessage(firstMessage);
        // 🆕 tạo Conversation (nếu chưa có) + ghi turn đầu tiên
    await this.appendTurn.execute(ticket.id, TurnRole.USER, command.content);

    // Dispatch domain events (TicketCreatedEvent) SAU khi ghi DB thành công,
    // rồi clear — đúng pattern của LoginUseCase (Identity Module).
    for (const event of ticket.domainEvents) {
      this.eventEmitter.emit(event.eventName, event);
    }
    ticket.clearDomainEvents();

    // TODO Phase 6: AI Module lắng nghe 'ticket.created' để trigger
    // ProcessIncomingMessageUseCase (Classification → ... → Escalation).

    return {
      id: ticket.id,
      customerId: ticket.customerId,
      channel: ticket.channel,
      subject: ticket.subject,
      status: ticket.status,
      category: ticket.category,
      priority: ticket.priority,
      assignedAgentId: ticket.assignedAgentId,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    };
  }
}
