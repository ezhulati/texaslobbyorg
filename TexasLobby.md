TexasLobby.org - MVP Implementation Plan

     Overview

     Build a modern, searchable marketplace connecting Texas business owners with lobbyists. Fast-ship MVP with core 
     features: search, profiles, auth, and Stripe subscriptions.

     Tech Stack (Locked)

     - Frontend: Astro 4.x + React 18 + Tailwind CSS + shadcn/ui
     - Backend: Supabase (PostgreSQL + Auth + Storage)
     - Payments: Stripe
     - Email: Resend
     - Hosting: Netlify
     - Analytics: Plausible (added in Phase 2)

     Week 1: Foundation & Database

     1. Initialize Astro project with TypeScript, React, Tailwind
     2. Set up Supabase project and run database migrations
     3. Create CSV import script for 1,687 lobbyist records
     4. Build core Layout + SEO components
     5. Set up environment variables and configuration

     Week 2: Search & Profiles

     1. Build homepage with hero section and SearchFilter component
     2. Create /lobbyists search results page with filtering
     3. Build individual lobbyist profile pages (/lobbyists/[slug])
     4. Implement full-text search via Supabase
     5. Add responsive design and mobile optimization

     Week 3: Auth & Payments

     1. Set up Supabase Auth (email/password + magic links)
     2. Build login/signup pages
     3. Create profile claim flow for lobbyists
     4. Integrate Stripe for Premium ($297/mo) and Featured ($597/mo) tiers
     5. Build basic dashboard for lobbyists to edit profiles

     Week 4: Polish & Launch

     1. Create 2-3 key city pages (Houston, Austin, Dallas)
     2. Create 3-5 subject area pages (Healthcare, Energy, Education)
     3. Set up Resend for transactional emails (welcome, claim confirmation)
     4. Deploy to Netlify with CI/CD
     5. E2E testing and performance optimization (Lighthouse 90+)

     Deferred to Phase 2

     - Error tracking (Sentry)
     - Analytics dashboard for Featured tier
     - Lead magnet downloads
     - Comparison tool
     - Full SEO content (100+ city pages, blog)
     - Favorites/save functionality

     Success Criteria

     - Users can search and filter lobbyists
     - Lobbyists can claim profiles and upgrade via Stripe
     - Lighthouse score 90+ on core pages
     - Mobile responsive
     - Production deployment live

     Launch Target: 4 weeks from approval