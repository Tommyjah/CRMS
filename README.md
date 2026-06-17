# Project Approval System

A professional, type-safe system for managing and tracking project change requests, built with Next.js, Supabase, and Tailwind CSS.

## Key Features
- **Project Dashboard:** Centralized view of all project change requests.
- **Dynamic Change Request Form:** Real-time form with support for multiple activities, unit tracking, and logic for calculating differences.
- **Automated PDF Reporting:** One-click generation of professional project status reports.
- **Secure Authentication:** Protected routes ensuring only authorized access to sensitive project data.
- **Full Type Safety:** Automated schema synchronization between Supabase and the frontend.

## Getting Started

1. **Install dependencies:**
   ```bash
   pnpm install
   
2.  Environment Configuration:
Create a .env.local file in the project root and add your Supabase credentials:
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_project_api_key

3.  Database Sync:
To synchronize your local TypeScript types with your Supabase schema, run:
npx supabase gen types typescript --project-id <YOUR_PROJECT_ID> > types_db.ts

4.  Run the development server:
pnpm dev

5.  Production Build:
To verify the production build locally, run:
pnpm run build

Technology Stack
Framework: Next.js (App Router)

Database/Auth: Supabase

Styling: Tailwind CSS

PDF Generation: jspdf / jspdf-autotable

Language: TypeScript

Deployment
This project is optimized for deployment on the Vercel Platform. Ensure you add the same environment variables defined in your .env.local to your Vercel project settings under "Environment Variables".