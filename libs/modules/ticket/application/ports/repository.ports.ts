import { Ticket } from '../../domain/entities/ticket.entity';
import { TicketMessage } from '../../domain/entities/ticket-message.entity';
import { TicketStatusHistory } from '../../domain/entities/ticket-status-history.entity';

export const TICKET_REPOSITORY = Symbol('TICKET_REPOSITORY');
export const TICKET_READ_REPOSITORY = Symbol('TICKET_READ_REPOSITORY');

/**
 * 🔌 Port — write side (CQRS Command, TDD Mục 2.5).
 */
export interface ITicketRepository {
  save(ticket: Ticket): Promise<void>;
  findById(id: string): Promise<Ticket | null>;
  saveMessage(message: TicketMessage): Promise<void>;
  saveStatusHistory(history: TicketStatusHistory): Promise<void>;
}

export interface ListTicketsFilter {
  status?: string;
  priority?: string;
  category?: string;
  assignedAgentId?: string;
  page: number;
  limit: number;
}

export interface TicketListItem {
  id: string;
  customerId: string;
  customerEmail: string;
  channel: string;
  subject: string;
  status: string;
  category: string | null;
  priority: string | null;
  assignedAgentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketDetail extends TicketListItem {
  confidenceScore: number | null;
  isSpam: boolean;
  missingInfoFlags: string[];
  resolvedAt: Date | null;
  messages: {
    id: string;
    sender: string;
    content: string;
    createdAt: Date;
  }[];
}

export interface TicketTimelineEntry {
  fromStatus: string;
  toStatus: string;
  changedBy: string;
  reason: string | null;
  changedAt: Date;
}

/**
 * 🔌 Port — read side (CQRS Query, tối ưu riêng cho Dashboard/List/Detail,
 * TDD Mục 2.5, 5.3).
 */
export interface ITicketReadRepository {
  listTickets(
    filter: ListTicketsFilter,
  ): Promise<{ items: TicketListItem[]; totalItems: number }>;
  getTicketDetail(id: string): Promise<TicketDetail | null>;
  getTicketTimeline(id: string): Promise<TicketTimelineEntry[]>;
}
