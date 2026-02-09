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

- **Frontend**: React Native (Expo), TypeScript, NativeWind
- **Routing**: Expo Router (file-based)
- **State**: Zustand
- **Backend**: Supabase (Auth, PostgreSQL, Edge Functions)
- **AI**: OpenAI (GPT-4 / GPT-3.5)
- **Payments**: RevenueCat
- **Testing**: Jest, React Native Testing Library, fast-check (PBT)

## Architecture

```
Mobile Client (Expo)
├── UI Layer (Screens & Components)
├── State Management (Zustand Stores)
└── Local Storage (AsyncStorage)
        │
        ├─── Supabase Backend
        │    ├── Auth Service
        │    ├── PostgreSQL Database
        │    └── Edge Functions (AI Proxy)
        │           │
        │           └─── OpenAI API
        │
        └─── RevenueCat (Subscriptions)
```

## Project Structure

```
/app                    # Screens (Expo Router)
  /(auth)              # Authentication screens
  /(tabs)              # Main tab screens
  /chat                # Chat screens
/components            # Reusable UI components
/stores                # Zustand state stores
/lib                   # Utilities and services
/types                 # TypeScript interfaces
/supabase/functions    # Edge Functions
```

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI
- iOS Simulator (macOS) or Android Emulator
- Supabase account
- RevenueCat account
- OpenAI API key

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Start development server
npm start
```

### Environment Variables

```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
REVENUECAT_API_KEY=your_revenuecat_api_key
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

- **Automatic Releases**: Push to `main` → Builds and submits to Play Store automatically
- **Automatic Updates**: Push to `main` → EAS Update publishes automatically
- **Manual Builds**: Trigger builds from GitHub Actions when needed
- **Automated Tests**: Tests run on every PR and push to `main`

### Quick Setup

1. Get your Expo token: `eas whoami --json`
2. Add GitHub secrets (see `.documentation/CICD_SETUP_CHECKLIST.md`)
3. Push to `main` - app builds and submits automatically!

**📚 Documentation:**
- All guides are in `.documentation/` folder
- Start with: `.documentation/verify-play-console.md` (if having issues)
- Or: `.documentation/RELEASE_WORKFLOW_SUMMARY.md` (for releases)

### Workflows

- `.github/workflows/eas-update.yml` - Automatic OTA updates
- `.github/workflows/eas-build.yml` - Manual native builds
- `.github/workflows/test.yml` - Automated testing

### Database Setup

1. Create a Supabase project
2. Run the schema migrations in `/supabase/migrations`
3. Seed default coaches data
4. Configure Row Level Security (RLS) policies

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
