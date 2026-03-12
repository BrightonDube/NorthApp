# North

[![EAS Update](https://github.com/BrightonDube/NorthApp/actions/workflows/eas-update.yml/badge.svg)](https://github.com/BrightonDube/NorthApp/actions/workflows/eas-update.yml)
[![Test](https://github.com/BrightonDube/NorthApp/actions/workflows/test.yml/badge.svg)](https://github.com/BrightonDube/NorthApp/actions/workflows/test.yml)

> Your personal board of directors

North is a mobile application that provides context-aware AI coaching to help you make clearer decisions, think faster, and build better systems. Define your personal operating system once, then receive instant guidance from specialized AI coaches without setup friction.

## Overview

North combines three core innovations:

1. **Context Engine** - Define your values, goals, projects, and constraints once. Every AI coach automatically understands your situation without you repeating yourself.

2. **Specialized Coaches** - Pre-built AI coaches for strategy, systems thinking, writing, and decision-making. Pro users can create unlimited custom coaches.

3. **Instant Chat** - Zero configuration, streaming responses, and a clean text-first interface optimized for clarity.

## Target Audience

Built for creators, founders, and operators who:
- Value aesthetics and clarity
- Have low tolerance for friction
- Already use tools like Notion, Apple Notes, Linear
- Will pay for leverage, not entertainment

## Features

### Core Features (MVP)

- **User Context Engine**: Centralized personal context used by all AI coaches
- **AI Coach System**: Pre-built coaches + user-created coaches (Pro)
- **Instant Chat**: No configuration, streaming responses, context-aware
- **Subscription Management**: Feature-gated Pro tier via RevenueCat

### What's NOT in MVP

- Long onboarding flows
- Habit tracking
- Notifications
- Social feeds
- Complex analytics dashboards

## Tech Stack

- **Mobile**: React Native (Expo), TypeScript, NativeWind
- **Routing**: Expo Router (file-based)
- **State**: Zustand
- **Backend**: Supabase (Auth, PostgreSQL, Edge Functions) + optional FastAPI service (`backend/`)
- **AI**: Supabase Edge Functions + Groq (backend) + Voyage (embeddings)
- **Payments**: RevenueCat
- **Testing**: Jest, React Native Testing Library, fast-check (PBT)

## Architecture

```
Mobile Client (Expo)
├── UI Layer (Expo Router screens & components)
├── State Management (Zustand)
└── Local Storage (AsyncStorage)
        │
        ├─── Supabase
        │    ├── Auth (JWT)
        │    ├── Postgres (app data)
        │    └── Edge Functions (AI + context injection)
        │           ├── Groq
        │           ├── Gemini
        │           └── X.AI
        │
        ├─── FastAPI Service (optional, `backend/`)
        │    ├── Groq (chat/voice/TTS)
        │    ├── Voyage (embeddings → pgvector)
        │    └── OneSignal / Tavily / Google APIs
        │
        └─── RevenueCat (Subscriptions)
```

## Project Structure

```
north-mobile/          # Expo app (client)
  app/                 # Screens (Expo Router)
    (auth)/            # Authentication screens
    (tabs)/            # Main tab screens
  components/          # Reusable UI components
  stores/              # Zustand state stores
  lib/                 # Utilities and services
  types/               # TypeScript interfaces
backend/               # FastAPI service (hosted on Railway)
supabase/              # Supabase migrations + Edge Functions
```

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI (or `npx expo`)
- iOS Simulator (macOS) or Android Emulator
- Supabase account
- RevenueCat account

If you plan to run the optional `backend/` service locally:

- Python 3.11+
- A Groq API key
- A Voyage AI API key

### Installation

```bash
# Mobile app
cd north-mobile
npm install
cp .env.example .env
npm start
```

### Environment Variables

This repo has separate environment files per service.

#### Mobile (`north-mobile/.env`)

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_REVENUECAT_API_KEY=your_revenuecat_public_api_key
```

#### Backend (`backend/.env`) (optional)

See `backend/.env.example` for the full list. Common values:

```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
GROQ_API_KEY=your_groq_api_key
VOYAGE_API_KEY=your_voyage_api_key
```

## Development

### Running the App

```bash
cd north-mobile

# Start Expo dev server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

### Running the Backend (optional)

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

### Testing

```bash
cd north-mobile

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run property-based tests
npm run test:pbt

# Generate coverage report
npm run test:coverage
```

## CI/CD Pipeline

This project uses GitHub Actions for automated builds and deployments:

- **Automatic Updates**: Push to `main` → EAS Update publishes automatically
- **Releases**: Release workflows live under `.github/workflows/` (build/submit/release)
- **Manual Builds**: Trigger builds from GitHub Actions when needed
- **Automated Tests**: Tests run on every PR and push to `main`

### Quick Setup

1. Get your Expo token: `eas whoami --json`
2. Add required GitHub secrets for EAS / store submission
3. Push to `main` - app builds and submits automatically!

### Workflows

- `.github/workflows/eas-update.yml` - Automatic OTA updates
- `.github/workflows/eas-build.yml` - Manual native builds
- `.github/workflows/eas-submit.yml` - Store submission
- `.github/workflows/release.yml` - Release orchestration
- `.github/workflows/test.yml` - Automated testing

### Database Setup

1. Create a Supabase project
2. Run the schema migrations in `/supabase/migrations`
3. Configure Row Level Security (RLS) policies

### Edge Functions

```bash
# Deploy Edge Functions
supabase functions deploy chat

# Test locally
supabase functions serve
```

## Design Principles

- **White space over decoration** - Clean, minimal interface
- **Text-first UI** - Minimal icons and graphics
- **No gradients** - Solid colors only
- **No illustrations** - Focus on content

## Performance Targets

- Cold start: <2 seconds
- Chat load: <500ms
- First AI token: <1.5 seconds
- No crashes offline

## Subscription Tiers

### Free Tier
- 3 context items max
- Access to default coaches
- Unlimited chat

### Pro Tier ($9.99/month)
- Unlimited context items
- Create custom coaches
- All Free features

## Roadmap

### Phase 1: Foundation (Week 1)
- Project setup
- Authentication
- Database schema

### Phase 2: Core Features (Week 2)
- Context Engine
- Coach System
- Chat & AI Integration

### Phase 3: Monetization (Week 3)
- RevenueCat integration
- Feature gating
- Paywall

### Phase 4: Polish (Week 4)
- Offline resilience
- Performance optimization
- UI polish
- App Store preparation

**Target Ship Date**: February 12, 2026

## Contributing

This is a private project. For questions or issues, contact the development team.

## License

Proprietary - All rights reserved

## Support

For support, email: support@north.app

---

Built with ❤️ for Simon's community
