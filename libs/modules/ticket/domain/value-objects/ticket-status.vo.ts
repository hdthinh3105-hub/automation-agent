/**
 * TicketStatus — TDD Mục 9 (State Machine). Không dùng class ValueObject
 * bọc quanh vì đây thuần là 1 enum hữu hạn giá trị (giống Role ở
 * Identity Module) — ma trận transition mới là phần "thông minh" cần
 * đặt cạnh nó.
 */
export enum TicketStatus {
  NEW = 'NEW',
  CLASSIFIED = 'CLASSIFIED',
  WAITING_CUSTOMER = 'WAITING_CUSTOMER',
  ANSWERED = 'ANSWERED',
  ESCALATED = 'ESCALATED',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

/**
 * Ma trận transition hợp lệ (TDD Mục 9 — "dùng bảng ma trận transition
 * hợp lệ trong code, không rải if/else khắp nơi").
 */
export const VALID_TICKET_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  [TicketStatus.NEW]: [TicketStatus.CLASSIFIED],
  [TicketStatus.CLASSIFIED]: [
    TicketStatus.WAITING_CUSTOMER,
    TicketStatus.ANSWERED,
    TicketStatus.ESCALATED,
  ],
  [TicketStatus.WAITING_CUSTOMER]: [TicketStatus.CLASSIFIED],
  [TicketStatus.ANSWERED]: [TicketStatus.RESOLVED, TicketStatus.ESCALATED],
  [TicketStatus.ESCALATED]: [TicketStatus.IN_PROGRESS],
  [TicketStatus.IN_PROGRESS]: [TicketStatus.RESOLVED, TicketStatus.ESCALATED],
  [TicketStatus.RESOLVED]: [TicketStatus.CLOSED, TicketStatus.ESCALATED],
  [TicketStatus.CLOSED]: [],
};

export function isValidTicketTransition(from: TicketStatus, to: TicketStatus): boolean {
  return VALID_TICKET_TRANSITIONS[from]?.includes(to) ?? false;
}
