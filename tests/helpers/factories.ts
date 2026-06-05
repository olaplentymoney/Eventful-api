import { User, Event, Ticket, Payment, UserRole, EventStatus, TicketStatus, PaymentStatus } from '@prisma/client';

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-id-1',
    email: 'test@example.com',
    name: 'Test User',
    passwordHash: '$2b$12$hashed',
    role: UserRole.EVENTEE,
    avatarUrl: null,
    isVerified: true,
    refreshToken: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

export function makeCreator(overrides: Partial<User> = {}): User {
  return makeUser({ id: 'creator-id-1', email: 'creator@example.com', name: 'Event Creator', role: UserRole.CREATOR, ...overrides });
}

export function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'event-id-1',
    title: 'Test Concert',
    description: 'A great test concert with lots of music and fun.',
    venue: 'Test Arena',
    address: '123 Test St',
    city: 'Lagos',
    country: 'Nigeria',
    startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
    capacity: 100,
    price: 5000 as unknown as Event['price'],
    currency: 'NGN',
    status: EventStatus.PUBLISHED,
    coverImage: null,
    tags: ['music', 'concert'],
    shareSlug: 'test-concert-abc123',
    creatorId: 'creator-id-1',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

export function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: 'ticket-id-1',
    ticketRef: 'TEST-ABC123',
    eventId: 'event-id-1',
    userId: 'user-id-1',
    status: TicketStatus.ACTIVE,
    qrCodeData: 'signed-qr-data',
    qrCodeUrl: 'data:image/png;base64,abc',
    scannedAt: null,
    scannedBy: null,
    price: 5000 as unknown as Ticket['price'],
    currency: 'NGN',
    metadata: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

export function makePayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 'payment-id-1',
    reference: 'EVT-REF001',
    paystackId: null,
    eventId: 'event-id-1',
    userId: 'user-id-1',
    ticketId: null,
    amount: 5000 as unknown as Payment['amount'],
    currency: 'NGN',
    status: PaymentStatus.SUCCESSFUL,
    channel: 'card',
    paidAt: new Date('2025-01-01'),
    metadata: null,
    paystackResponse: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}
