# PingMe — Production-Ready Next.js Real-time Chat Application

![PingMe Banner](https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop)

**PingMe** is a full-stack, enterprise-grade real-time messaging application engineered with modern React architecture, End-to-End/Server-Side AES-256 encryption, Socket.IO live concurrency, and NextAuth v5 security. Completely migrated from a split frontend/backend setup into a unified **Next.js 16 (App Router)** repository, PingMe delivers an intuitive, dynamic user experience akin to WhatsApp Web, Discord, and Instagram.

---

## ✨ Features

- 🔐 **End-to-End & Server-Side Encryption**: Messages are encrypted using AES-256-CBC at rest with per-conversation key derivation.
- ⚡ **Real-Time Concurrency**: Built on custom Socket.IO integration alongside Next.js for zero-latency messaging, typing indicators, read receipts, and online presence tracking.
- 🎨 **Rich UI/UX Design System**: Curated vibrant themes (Light, Dark, System) powered by Tailwind CSS v4, shadcn/ui, glassmorphism aesthetics, and smooth Framer Motion micro-animations.
- 🛡️ **Modern Authentication**: Protected routes and JWT session management powered by NextAuth v5 (Auth.js) supporting Google OAuth and secure Email/Password credentials.
- 📬 **Privacy-First Request System**: Instagram-style message request flow ensuring privacy. Users connect via unique `@usernames` without public user scraping.
- 📜 **Infinite Scrolling & Pagination**: Cursor-based paginated message loading (30 items/chunk) for optimal memory performance on large threads.
- 📞 **WebRTC Voice & Video Readiness**: Built-in signaling state management and store hooks for peer-to-peer calling.

---

## 📸 Screenshots

| Chat Interface | Dark Mode & Theme Settings |
| :---: | :---: |
| *(Placeholder: Insert Chat Window Screenshot)* | *(Placeholder: Insert Settings Screenshot)* |

| Message Requests Flow | User Profile Modal |
| :---: | :---: |
| *(Placeholder: Insert Requests Screenshot)* | *(Placeholder: Insert Profile Screenshot)* |

---

## 🛠 Technology Stack

- **Framework**: Next.js 16 (App Router, Turbopack Compiler)
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS v4, shadcn/ui, Framer Motion, Lucide Icons
- **Real-Time**: Socket.IO Client & Server (Custom Node HTTP Server)
- **Database**: MongoDB Atlas via Prisma ORM v6
- **Authentication**: NextAuth v5 (Auth.js), bcryptjs, Google OAuth 2.0
- **State & Query Management**: Zustand, TanStack Query v5, React Hook Form + Zod

---

## 📁 Folder Structure & Architecture Overview

PingMe follows a modular, scalable enterprise folder architecture designed for long-term maintainability:

```text
pingme/
├── prisma/                 # Prisma database schema and migration models
├── server/                 # Custom HTTP entry point & Socket.IO real-time handler
├── src/
│   ├── app/                # Next.js App Router API endpoints and dynamic page views
│   │   ├── (auth)/         # Unauthenticated login and signup routes
│   │   ├── (main)/         # Protected main application layouts (chat, requests, settings)
│   │   └── api/            # RESTful backend endpoints (messages, users, notifications)
│   ├── components/         # Reusable UI components grouped by feature (chat, layout, shared)
│   ├── lib/                # Core utilities, AES encryption engines, auth config, and Zod schemas
│   ├── providers/          # React context wrappers (SocketProvider, QueryProvider, ThemeProvider)
│   ├── stores/             # Zustand global client state stores (useChatStore, useCallStore)
│   └── types/              # Shared TypeScript definitions and data interfaces
├── .env.example            # Documented template of all system environment variables
└── next.config.ts          # Next.js compiler and image optimizer rules
```

---

## 🚀 Installation & Setup Guide

### Prerequisites
- **Node.js**: v20.0.0 or higher
- **npm**: v10.0.0 or higher
- **MongoDB Cluster**: Active MongoDB Atlas M0+ instance supporting replica sets.

### Step 1: Clone the Repository
```bash
git clone https://github.com/yourusername/pingme.git
cd pingme
```

### Step 2: Install Dependencies
```bash
npm install
```

---

## 🔑 Environment Variable Setup

Copy the example template to create your local environment file:
```bash
cp .env.example .env.local
```

### Required Credentials Checklist Before Deployment

Before launching or deploying PingMe, you **must** supply the following credentials inside `.env.local` (or your Vercel Project Settings):

1. **`DATABASE_URL`** (MongoDB Atlas):
   - Go to [MongoDB Atlas](https://cloud.mongodb.com/) -> Database -> Connect -> Connect your application.
   - Ensure the connection string includes `<password>` and your database name (`/pingme`).
2. **`NEXTAUTH_SECRET`**:
   - Generate a secure 32-character base64 random string: `openssl rand -base64 32`.
3. **`GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`**:
   - Navigate to [Google Cloud Console](https://console.cloud.google.com/) -> APIs & Services -> Credentials.
   - Create OAuth 2.0 Client ID for Web Application.
   - Add Authorized Redirect URI: `http://localhost:3000/api/auth/callback/google` (and your Vercel URL in production).
4. **`ENCRYPTION_MASTER_KEY`**:
   - Generate a 64-character hex string: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

---

## 💻 Running Locally

Start the development server powered by Turbopack:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The custom Node server automatically starts Socket.IO on the same port.

---

## 📦 Production Build

To test and compile the optimized production release locally:
```bash
npm run build
npm run start
```

---

## ☁️ Deploying to Vercel

PingMe is architected for frictionless serverless deployment on Vercel:

1. Push your clean repository directly to GitHub.
2. Import the project into your [Vercel Dashboard](https://vercel.com/dashboard).
3. Under **Environment Variables**, paste all keys from your `.env.local` checklist (`DATABASE_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, etc.).
4. Click **Deploy**. Vercel will automatically trigger `npm run build` and generate static/edge assets.

*Note on Socket.IO in Serverless*: While REST APIs and database queries run natively on Vercel serverless functions, Socket.IO polling/websockets work best when paired with an external Socket provider (like Pusher / Ably / Railway container) if long-lived persistent connections exceed serverless timeout limitations.

---

## ❓ Common Troubleshooting

- **Error: `Prisma schema validation - Index already exists`**:
  Ensure you are using `@prisma/client@^6.0.0`. Prisma v7 introduced breaking changes to unique field indexes.
- **Error: `Module not found: Can't resolve './query_engine_bg.js'` in Middleware**:
  NextAuth middleware runs on Edge runtime. Verify that `middleware.ts` imports from `@/lib/auth.config` instead of `@/lib/auth`.
- **Socket Connection Disconnected**:
  Verify that `NEXT_PUBLIC_SOCKET_URL` matches the domain of your hosting environment.

---

## 🔮 Future Improvements

- [ ] **Multimedia Group Chats**: Expand 1-on-1 conversations into multi-user encrypted channels.
- [ ] **Voice Note Recording**: Integrate audio blob recording directly into the message input bar.
- [ ] **End-to-End WebRTC Video Streams**: Connect active signaling exchanges to live peer connection video grids.
- [ ] **Push Notification Workers**: Enable offline Web Push service workers for mobile browser alerts.

---

## 📄 License

This project is open-source and licensed under the [MIT License](LICENSE).
