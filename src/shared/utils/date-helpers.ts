import { ReminderUnit } from '@prisma/client';

export function getReminderFireDate(eventDate: Date, value: number, unit: ReminderUnit): Date {
  const fireDate = new Date(eventDate);

  switch (unit) {
    case ReminderUnit.MINUTES:
      fireDate.setMinutes(fireDate.getMinutes() - value);
      break;
    case ReminderUnit.HOURS:
      fireDate.setHours(fireDate.getHours() - value);
      break;
    case ReminderUnit.DAYS:
      fireDate.setDate(fireDate.getDate() - value);
      break;
    case ReminderUnit.WEEKS:
      fireDate.setDate(fireDate.getDate() - value * 7);
      break;
  }

  return fireDate;
}

export function msUntil(date: Date): number {
  return Math.max(0, date.getTime() - Date.now());
}

export function formatEventDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date);
}
