# Eventful API

> Your passport to unforgettable moments.

Eventful is a production-grade event ticketing platform API built with Node.js and TypeScript. It handles everything from event creation and Paystack payment processing to QR code ticket generation, email notifications, and creator analytics.

---

## Features

- **Authentication** — JWT access + refresh token rotation, role-based access (Creator / Eventee)
- **Events** — Full CRUD, draft/publish/cancel lifecycle, social share links
- **Payments** — Paystack integration with webhook handling
- **Tickets** — QR code generation and cryptographic scan verification
- **Notifications** — Flexible BullMQ-scheduled email reminders (minutes, hours, days, weeks before event)
- **Analytics** — Creator dashboard with revenue, ticket sales, and scan rates per event
- **Caching** — Redis cache layer on all read-heavy routes
- **Rate Limiting** — Global, auth, and payment-specific tiers

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js + TypeScript |
| Framework | Express |
| Database | PostgreSQL (Prisma ORM) |
| Cache | Redis (ioredis) |
| Queue | BullMQ |
| Payments | Paystack |
| Email | Nodemailer + Handlebars |
| QR Codes | qrcode + HMAC-SHA256 signing |
| Auth | JWT (access + refresh tokens) |
| Validation | Zod |
| Testing | Jest + Supertest |
| Docs | Swagger / OpenAPI 3.0 |

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 7+

### Installation

```bash
git clone https://github.com/YOUR_USERNAME/eventful.git
cd eventful
npm install
npx prisma generate
```

### Environment Setup

```bash
cp .env.example .env
```

Fill in the required values in `.env`:

```env
# App
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000

# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/eventful_db"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-32-char-secret
JWT_REFRESH_SECRET=your-32-char-refresh-secret

# Paystack
PAYSTACK_SECRET_KEY=sk_test_xxxx
PAYSTACK_PUBLIC_KEY=pk_test_xxxx
PAYSTACK_WEBHOOK_SECRET=your-webhook-secret

# SMTP (Mailtrap for development)
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your-mailtrap-user
SMTP_PASS=your-mailtrap-pass
SMTP_FROM="Eventful <no-reply@eventful.com>"

# QR Code
QR_SECRET=your-32-char-qr-secret
```

### Database Setup

```bash
# Run migrations
npx prisma migrate dev --name init

# Seed with test data
npm run db:seed
```

### Run

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

API is live at `http://localhost:3000`
Swagger docs at `http://localhost:3000/api/v1/docs`

---

## API Overview

### Auth
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/v1/auth/register` | Register a new user | Public |
| POST | `/api/v1/auth/login` | Login | Public |
| POST | `/api/v1/auth/refresh` | Refresh access token | Public |
| POST | `/api/v1/auth/logout` | Logout | Required |
| GET | `/api/v1/auth/me` | Get current user | Required |

### Events
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/v1/events` | List published events | Public |
| GET | `/api/v1/events/:id` | Get event by ID | Public |
| GET | `/api/v1/events/slug/:slug` | Get event by share slug | Public |
| GET | `/api/v1/events/:id/share` | Get social share links | Public |
| POST | `/api/v1/events` | Create event | Creator |
| PATCH | `/api/v1/events/:id` | Update event | Creator |
| POST | `/api/v1/events/:id/cancel` | Cancel event | Creator |
| DELETE | `/api/v1/events/:id` | Delete event | Creator |
| GET | `/api/v1/events/mine/list` | List creator's events | Creator |

### Payments
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/v1/payments/initiate` | Initiate Paystack payment | Eventee |
| GET | `/api/v1/payments/verify/:reference` | Verify payment | Required |
| GET | `/api/v1/payments/mine` | List my payments | Required |
| GET | `/api/v1/payments/event/:eventId` | Event payments | Creator |
| POST | `/api/v1/payments/webhook/paystack` | Paystack webhook | Public |

### Tickets
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/v1/tickets/purchase` | Issue ticket after payment | Eventee |
| GET | `/api/v1/tickets/mine` | List my tickets | Required |
| GET | `/api/v1/tickets/:id` | Get ticket by ID | Required |
| POST | `/api/v1/tickets/:id/cancel` | Cancel ticket | Eventee |
| POST | `/api/v1/tickets/verify` | Scan and verify QR code | Creator |
| GET | `/api/v1/tickets/event/:eventId` | List event tickets | Creator |

### Notifications
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/v1/notifications/reminders` | Set reminder | Required |
| GET | `/api/v1/notifications/reminders` | List my reminders | Required |
| DELETE | `/api/v1/notifications/reminders/:id` | Delete reminder | Required |

### Analytics
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/v1/analytics/dashboard` | Creator dashboard | Creator |
| GET | `/api/v1/analytics/events/:eventId` | Per-event stats | Creator |

---

## Testing

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# All tests with coverage
npm run test:coverage
```

---

## Deployment

### Docker

```bash
docker-compose up --build
```

### Manual (Render / Railway)

1. Set environment variables on your hosting platform
2. Build command: `npm install && npm run build`
3. Start command: `npm start`
4. Run migrations: `npx prisma migrate deploy`

---

## Project Structure

```
src/
├── config/          # Environment, database, Redis, queue, Swagger
├── modules/
│   ├── auth/        # Authentication & authorization
│   ├── events/      # Event management
│   ├── tickets/     # Ticket issuance & QR verification
│   ├── payments/    # Paystack integration & webhooks
│   ├── notifications/ # Email & reminder scheduling
│   ├── analytics/   # Creator dashboards
│   └── users/       # User profiles
└── shared/
    ├── cache/       # Redis cache service & key constants
    ├── guards/      # JWT & role guards
    ├── filters/     # Error handling & HTTP exceptions
    ├── middleware/  # Rate limiting
    ├── interceptors/ # Response transformation
    └── utils/       # Pagination, crypto, date helpers
```

---

## License

MIT
