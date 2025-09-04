# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MiSub is a subscription converter built with Vue 3 + Vite for the frontend and Cloudflare Pages Functions for the backend. It supports both Cloudflare KV and D1 database storage options to manage subscription data and user settings.

## Key Features

- Subscription grouping with Profiles functionality
- Support for both KV storage and D1 database (to avoid KV write limits)
- Data migration tools between KV and D1
- Telegram notification system for subscription expiration and usage
- Modern UI with light/dark mode support
- Cron-based subscription updates

## Development Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Architecture

### Frontend
- Vue 3 with Pinia for state management
- Tailwind CSS for styling
- Main entry point: `src/main.js`
- Primary component: `src/App.vue`

### Backend
- Cloudflare Pages Functions in `functions/` directory
- Main API handler: `functions/[[path]].js`
- Storage abstraction: `functions/storage-adapter.js`
- Supports both KV and D1 databases with automatic selection

### Data Structure
- Subscriptions: Individual subscription entries
- Profiles: Groups of subscriptions for different use cases
- Settings: User configuration including storage type selection

### Storage Options
1. **KV Storage** (default) - Fast but with write limits
2. **D1 Database** - No write limits but slightly slower

## Database Setup

To use D1 database:
1. Create database: `wrangler d1 create misub`
2. Update `wrangler.toml` with database IDs
3. Initialize schema: `wrangler d1 execute misub --file=schema.sql`

## Deployment

Deployed to Cloudflare Pages with:
- KV namespace binding required
- D1 database binding optional (but recommended)
- Environment variables for ADMIN_PASSWORD and COOKIE_SECRET

## Key API Endpoints

- `/api/login` - Authentication
- `/api/data` - Fetch all subscription data
- `/api/misubs` - Save subscriptions and profiles
- `/api/migrate` - Data structure migration
- `/api/migrate_to_d1` - Migrate from KV to D1
- `/api/node_count` - Fetch node count for a subscription
- `/api/batch_update_nodes` - Bulk update subscription nodes
- `/api/settings` - Manage user settings

## Data Migration

The system provides built-in tools to migrate data from KV to D1 storage. This is particularly useful for users who encounter KV write limits.