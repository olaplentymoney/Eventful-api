export const CacheKeys = {
  // Events
  EVENT: (id: string) => `event:${id}`,
  EVENTS_LIST: (page: number, limit: number, filters?: string) =>
    `events:list:${page}:${limit}:${filters || 'all'}`,
  EVENTS_BY_CREATOR: (creatorId: string) => `events:creator:${creatorId}`,
  EVENT_SHARE: (slug: string) => `event:share:${slug}`,

  // Users
  USER: (id: string) => `user:${id}`,
  USER_BY_EMAIL: (email: string) => `user:email:${email}`,

  // Tickets
  TICKET: (id: string) => `ticket:${id}`,
  TICKETS_BY_USER: (userId: string) => `tickets:user:${userId}`,
  TICKETS_BY_EVENT: (eventId: string) => `tickets:event:${eventId}`,

  // Analytics
  ANALYTICS_CREATOR: (creatorId: string) => `analytics:creator:${creatorId}`,
  ANALYTICS_EVENT: (eventId: string) => `analytics:event:${eventId}`,

  // Payments
  PAYMENT: (reference: string) => `payment:${reference}`,

  // Auth
  REFRESH_TOKEN_BLOCKLIST: (token: string) => `auth:blocklist:${token}`,
  RATE_LIMIT: (ip: string, route: string) => `rl:${route}:${ip}`,
};
