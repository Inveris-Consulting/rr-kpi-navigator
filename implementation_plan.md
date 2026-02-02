# Supabase Integration Plan

## Goal Description
Integrate Supabase Auth and Database into the application. replace mock data with real data. Seed the database with sample data.

## Proposed Changes

### Configuration
#### [NEW] .env
- Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

### Library
#### [NEW] src/lib/supabase.ts
- Initialize Supabase client

### Context
#### [MODIFY] src/contexts/AuthContext.tsx
- Replace mock auth with Supabase Auth (onAuthStateChange, signInWithPassword, signOut)
- precise typing for User

### Pages
#### [MODIFY] src/pages/Login.tsx
- Update form to accept email/password
- Handle login errors from Supabase

### Database Seeding
#### [NEW] seed_data.sql
- SQL script to insert random KPI data for specified users

## Verification Plan
### Manual Verification
- Log in with a valid Supabase user
- Verify session persistence
- Run the seed script in Supabase SQL Editor and check `kpi_entries` table.
