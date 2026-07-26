import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuid } from 'uuid';
import { ITicketRepository, TICKET_REPOSITORY } from '../ports/repository.ports';
import { TicketMessage } from '../../domain/entities/ticket-message.entity';
import { MessageSender } from '../../domain/value-objects/message-sender.vo';
import { TicketStatus } from '../../domain/value-objects/ticket-status.vo';
import { TicketStateMachineService } from '../../domain/services/ticket-state-machine.service';
import { TicketNotFoundException } from '../../domain/exceptions/ticket.exception';
import { TicketMessageResponseDto } from '../dto/ticket.dto';
import { AppendTurnUseCase, TurnRole } from '@app/modules/conversation';

/**
 * 🎯 Use Case — Public, khách hàng gửi thêm tin nhắn vào ticket đã tạo
 * (không cần login — TDD Mục 5.2/5.3). Nếu ticket đang WAITING_CUSTOMER
 * (thiếu thông tin), tự động quay lại CLASSIFIED để re-trigger AI
 * pipeline ở Phase 6 (TDD Mục 9 — bảng transition).
 */
@Injectable()
export class AddCustomerMessageUseCase {
  constructor(
    @Inject(TICKET_REPOSITORY) private readonly ticketRepository: ITicketRepository,
    private readonly stateMachine: TicketStateMachineService,
    private readonly eventEmitter: EventEmitter2,
    private readonly appendTurn: AppendTurnUseCase,
  ) {}

  async execute(ticketId: string, content: string): Promise<TicketMessageResponseDto> {
    const ticket = await this.ticketRepository.findById(ticketId);
    if (!ticket) {
      throw new TicketNotFoundException(ticketId);
    }

    const message = TicketMessage.create({
      id: uuid(),
      ticketId,
      sender: MessageSender.CUSTOMER,
      content,
    });
    await this.ticketRepository.saveMessage(message);

    await this.appendTurn.execute(ticketId, TurnRole.USER, content); 

    if (ticket.status === TicketStatus.WAITING_CUSTOMER) {
      this.stateMachine.transition(ticket, TicketStatus.CLASSIFIED, 'system:customer_reply');
      await this.ticketRepository.save(ticket);

      for (const event of ticket.domainEvents) {
        this.eventEmitter.emit(event.eventName, event);
      }
      ticket.clearDomainEvents();
    }

    return {
      id: message.id,
      ticketId: message.ticketId,
      sender: message.sender,
      content: message.content,
      createdAt: message.createdAt,
    };
  }
}
