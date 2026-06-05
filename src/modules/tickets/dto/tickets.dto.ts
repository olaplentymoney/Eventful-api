import { z } from 'zod';

export const PurchaseTicketSchema = z.object({
  eventId: z.string().uuid(),
  paymentReference: z.string().min(1),
});

export const VerifyTicketSchema = z.object({
  qrToken: z.string().min(1),
  scannedBy: z.string().optional(),
});

export type PurchaseTicketDto = z.infer<typeof PurchaseTicketSchema>;
export type VerifyTicketDto = z.infer<typeof VerifyTicketSchema>;
