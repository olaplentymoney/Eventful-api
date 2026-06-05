import { PrismaClient } from '@prisma/client';

export const testPrisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

export async function cleanDatabase(): Promise<void> {
  // Delete in FK-safe order
  await testPrisma.reminder.deleteMany();
  await testPrisma.payment.deleteMany();
  await testPrisma.ticket.deleteMany();
  await testPrisma.event.deleteMany();
  await testPrisma.user.deleteMany();
}

export async function connectTestDb(): Promise<void> {
  await testPrisma.$connect();
}

export async function disconnectTestDb(): Promise<void> {
  await testPrisma.$disconnect();
}
