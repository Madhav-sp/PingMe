# PingMe — Production-Ready Next.js Real-Time Chat Application

![PingMe Banner](https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop)

**PingMe** is a production-ready, enterprise-grade real-time messaging platform built with modern web technologies. Developed using **Next.js 16 (App Router)**, it combines secure authentication, encrypted messaging, real-time communication, and a scalable architecture into a single unified application.

Inspired by platforms such as WhatsApp Web, Discord, and Instagram, PingMe focuses on performance, security, maintainability, and an exceptional user experience.

---

# Features

## End-to-End and Server-Side Encryption

Messages are encrypted using AES-256-CBC with per-conversation key derivation, ensuring secure storage and transmission.

## Real-Time Communication

Powered by Socket.IO with custom Next.js integration for:

- Instant messaging
- Typing indicators
- Read receipts
- Online presence
- Live synchronization

## Modern User Interface

Designed with:

- Tailwind CSS v4
- shadcn/ui
- Framer Motion
- Glassmorphism design language
- Responsive layouts
- Light, Dark, and System themes

## Secure Authentication

Authentication is powered by NextAuth v5 (Auth.js) with:

- Google OAuth
- Email & Password login
- JWT session management
- Protected routes

## Privacy-Focused Messaging

Instagram-inspired message request workflow allows users to communicate through unique usernames without exposing public user data.

## Optimized Message Loading

Large conversations are efficiently handled using cursor-based pagination with infinite scrolling.

## WebRTC Ready

Includes signaling architecture and state management for future voice and video calling support.

---

# Technology Stack

| Category | Technology |
|-----------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (Strict Mode) |
| Styling | Tailwind CSS v4, shadcn/ui |
| Animations | Framer Motion |
| Icons | Lucide React |
| Database | MongoDB Atlas |
| ORM | Prisma v6 |
| Authentication | NextAuth v5 (Auth.js) |
| Encryption | AES-256-CBC |
| Real-Time | Socket.IO |
| State Management | Zustand |
| Data Fetching | TanStack Query v5 |
| Forms | React Hook Form + Zod |

---

# Project Structure

```text
pingme/
├── prisma/
├── server/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   ├── (main)/
│   │   └── api/
│   ├── components/
│   ├── lib/
│   ├── providers/
│   ├── stores/
│   └── types/
├── .env.example
└── next.config.ts
```

### Directory Overview

| Directory | Description |
|------------|-------------|
| `prisma/` | Database schema and migrations |
| `server/` | Custom HTTP server and Socket.IO integration |
| `src/app/` | App Router pages and API routes |
| `components/` | Reusable UI components |
| `lib/` | Utilities, authentication, encryption, validation |
| `providers/` | React providers |
| `stores/` | Zustand state management |
| `types/` | Shared TypeScript definitions |

---

# Installation

## Prerequisites

Before getting started, ensure the following are installed:

- Node.js 20 or later
- npm 10 or later
- MongoDB Atlas cluster

---

## Clone the Repository

```bash
git clone https://github.com/yourusername/pingme.git

cd pingme
```

---

## Install Dependencies

```bash
npm install
```

---

# Environment Configuration

Create a local environment file.

```bash
cp .env.example .env.local
```

Configure the following variables.

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | MongoDB Atlas connection string |
| `NEXTAUTH_SECRET` | Authentication secret |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret |
| `ENCRYPTION_MASTER_KEY` | 64-character encryption key |
| `NEXT_PUBLIC_SOCKET_URL` | Socket.IO server URL |

---

## Generating Secrets

Generate the NextAuth secret:

```bash
openssl rand -base64 32
```

Generate the encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

# Development

Start the development server.

```bash
npm run dev
```

Visit:

```
http://localhost:3000
```

The custom Node server automatically initializes Socket.IO alongside the Next.js application.

---

# Production

Build the application.

```bash
npm run build
```

Start the production server.

```bash
npm run start
```

---

# Deployment

PingMe is designed for deployment on platforms such as Vercel.

## Deployment Steps

1. Push the repository to GitHub.
2. Import the project into Vercel.
3. Configure all environment variables.
4. Deploy the application.

### Important Note

Long-lived Socket.IO connections are better hosted using a dedicated server or provider such as:

- Railway
- Render
- Fly.io
- Pusher
- Ably

REST APIs and authentication work natively on Vercel Serverless Functions.

---

# Troubleshooting

## Prisma Error

```
Prisma schema validation - Index already exists
```

Use:

```
@prisma/client@^6.x
```

Prisma v7 introduces breaking changes affecting index generation.

---

## Middleware Error

```
Module not found: query_engine_bg.js
```

Ensure middleware imports authentication from:

```ts
@/lib/auth.config
```

instead of:

```ts
@/lib/auth
```

---

## Socket Connection Issues

Verify that:

```
NEXT_PUBLIC_SOCKET_URL
```

matches your deployed backend URL.

---

# Roadmap

- Multimedia group conversations
- Voice message recording
- End-to-end encrypted WebRTC video calls
- Web Push notifications
- Media sharing with encryption
- Chat search and indexing
- Message reactions
- Pinned conversations

---

# License

This project is licensed under the MIT License.

See the `LICENSE` file for more information.
