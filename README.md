# CRMS — Change Request Management System

A professional, type-safe system for managing and tracking project change requests, built with Next.js, Supabase, and Tailwind CSS.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| Database / Auth | Supabase (PostgreSQL + Auth) |
| Styling | Tailwind CSS v4 |
| PDF Generation | jsPDF + jsPDF-AutoTable |
| Validation | Zod |
| Deployment | Vercel (recommended) |

## Features

- **Project Dashboard:** Centralized view of all change requests with real-time filtering and pagination.
- **Dynamic Change Request Form:** Multi-activity form with unit tracking and auto-calculated differences.
- **Automated PDF Reporting:** One-click generation of professional project status reports.
- **Secure Authentication:** Protected routes ensuring only authorized access to sensitive data.
- **Full Type Safety:** Automated schema synchronization between Supabase and the frontend.
- **Dark Mode:** Consistent dark theme support across the application.

## Prerequisites

- Node.js >= 18
- pnpm (or npm / yarn)
- A Supabase project with the required tables and RLS policies configured

## Getting Started

### 1. Clone and install

```bash
git clone <your-repo-url>
cd project-approval-ui
pnpm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL (e.g. `https://xxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon/public API key |
| `NEXT_PUBLIC_SITE_URL` | Base URL for auth redirects (default: `http://localhost:3000`) |

### 3. Initialize the database

If you haven’t already, run the SQL migrations against your Supabase database to create the required tables, types, and RLS policies.

### 4. Sync TypeScript types (optional but recommended)

```bash
npx supabase gen types typescript --project-id <YOUR_PROJECT_ID> > types_db.ts
```

> This generates a local type snapshot from your live Supabase schema.

### 5. Start the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

| Script | Description |
| --- | --- |
| `pnpm dev` | Start the development server (Turbopack) |
| `pnpm build` | Build for production |
| `pnpm start` | Start the production server |
| `pnpm lint` | Run ESLint |

## Deployment

### Vercel (recommended)

1. Push this repository to GitHub / GitLab / Bitbucket.
2. Import the project into [Vercel](https://vercel.com/new).
3. Add the environment variables from `.env.example` in the Vercel project settings.
4. Deploy.

### Other Platforms

This is a standard Next.js application. You can deploy it to any platform that supports Node.js and `next start` (e.g. Netlify, AWS Amplify, self-hosted).

Make sure to set all required environment variables in your hosting provider’s dashboard.

## Project Structure

```
app/                  # Next.js App Router pages and layouts
components/           # Reusable UI components
hooks/                # Custom React hooks
lib/                  # Utilities, Supabase clients, PDF generation
types/                # TypeScript type declarations
```

## Contributing

1. Create a feature branch from `main`.
2. Make your changes and ensure `pnpm lint` and `pnpm build` pass.
3. Open a pull request.
