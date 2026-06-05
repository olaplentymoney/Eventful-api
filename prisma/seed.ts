import { PrismaClient, UserRole, EventStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const creatorHash = await bcrypt.hash('Creator@123', 12);
  const eventeeHash = await bcrypt.hash('Eventee@123', 12);

  const creator = await prisma.user.upsert({
    where: { email: 'creator@eventful.com' },
    update: {},
    create: { name: 'Ada Okafor', email: 'creator@eventful.com', passwordHash: creatorHash, role: UserRole.CREATOR, isVerified: true },
  });

  const eventee = await prisma.user.upsert({
    where: { email: 'eventee@eventful.com' },
    update: {},
    create: { name: 'Chidi Nwosu', email: 'eventee@eventful.com', passwordHash: eventeeHash, role: UserRole.EVENTEE, isVerified: true },
  });

  await prisma.event.upsert({
    where: { shareSlug: 'afrobeats-festival-lagos-2026-seed' },
    update: {},
    create: {
      title: 'Afrobeats Festival Lagos 2026',
      description: 'The biggest afrobeats festival in West Africa. Three stages, 20+ artists, one unforgettable weekend.',
      venue: 'Eko Convention Centre',
      address: 'Plot 1415 Ozumba Mbadiwe Avenue',
      city: 'Lagos',
      country: 'Nigeria',
      startDate: new Date('2026-03-15T18:00:00Z'),
      endDate: new Date('2026-03-16T02:00:00Z'),
      capacity: 5000,
      price: 15000,
      currency: 'NGN',
      status: EventStatus.PUBLISHED,
      tags: ['music', 'afrobeats', 'festival', 'lagos'],
      shareSlug: 'afrobeats-festival-lagos-2026-seed',
      creatorId: creator.id,
    },
  });

  console.log('Seed complete.');
  console.log('  Creator:', creator.email, '/ Creator@123');
  console.log('  Eventee:', eventee.email, '/ Eventee@123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
