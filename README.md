# Unified Social Inbox: Frontend (Next.js)

Dashboard for the unified inbox: all customer chats from Facebook Messenger, Instagram,
WhatsApp and Telegram in one place, plus knowledge base and bot settings.
Built with **Next.js (App Router) + TypeScript + Tailwind + axios + TanStack Query**.
The API lives in `../unified-social-backend`.

## Run

```bash
npm install
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:8001/api
npm run dev                  # http://localhost:3000
```

Log in with the user you created with `python manage.py createsuperuser` on the backend.

## Pages

| Route | What it does |
|---|---|
| `/` | Dashboard: unread counts, chats waiting for you, setup checklist |
| `/inbox` | All conversations from every app. Reply, pause the bot per chat, resolve |
| `/channels` | Connect accounts (step-by-step help for each platform), Telegram webhook, Demo simulator |
| `/knowledge` | FAQs / products / policies the bot answers from |
| `/bot` | Bot behaviour, AI on/off, and a test chat |

## Code map

- `src/lib/api.ts`: axios instance, JWT header, automatic token refresh, error formatting
- `src/lib/queries.ts`: every TanStack Query hook and mutation (the inbox polls every 3–5 s)
- `src/lib/auth.ts`: token storage
- `src/components/`: app shell / sidebar, UI primitives, platform badges

## Deploy (free)

Deploy to Vercel's free tier and set `NEXT_PUBLIC_API_URL` to your backend's public URL.
Add the Vercel URL to the backend's `CORS_ALLOWED_ORIGINS`.
