# North Mobile Application

North is a mobile application that serves as a personal board of directors, providing context-aware AI coaching to help users make clearer decisions, think faster, and build better systems.

## Project Structure

```
north-mobile/
├── app/              # Expo Router screens and navigation
├── components/       # Reusable UI components
├── stores/          # Zustand state management stores
├── lib/             # Utility functions and libraries
├── types/           # TypeScript type definitions
├── assets/          # Images, fonts, and other static assets
└── global.css       # Global styles for NativeWind
```

## Tech Stack

- **Framework**: Expo (React Native)
- **Language**: TypeScript (strict mode)
- **Navigation**: Expo Router (file-based routing)
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **State Management**: Zustand
- **Backend**: Supabase (Auth, Database, Edge Functions)
- **Subscriptions**: RevenueCat
- **AI**: OpenAI API (via Supabase Edge Functions)

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Expo CLI installed globally: `npm install -g expo-cli`
- iOS Simulator (for Mac) or Android Emulator

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in your credentials:
   ```bash
   cp .env.example .env
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Run on iOS:
   ```bash
   npm run ios
   ```

5. Run on Android:
   ```bash
   npm run android
   ```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_REVENUECAT_API_KEY=your_revenuecat_api_key
```

## Development

### Path Aliases

The project uses TypeScript path aliases for cleaner imports:

- `@/components/*` - UI components
- `@/stores/*` - Zustand stores
- `@/lib/*` - Utility functions
- `@/types/*` - Type definitions

Example:
```typescript
import { Button } from '@/components/Button';
import { useAuthStore } from '@/stores/authStore';
```

### Styling with NativeWind

Use Tailwind CSS classes directly in your components:

```tsx
<View className="flex-1 bg-white p-4">
  <Text className="text-2xl font-bold text-gray-900">Hello World</Text>
</View>
```

## Architecture

The application follows a client-server architecture:

- **Client**: React Native app with Expo
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **AI Integration**: OpenAI API via Supabase Edge Functions
- **Subscriptions**: RevenueCat for iOS/Android in-app purchases

## Features

- 🔐 User authentication (email/password, Apple Sign In)
- 🎯 Context Engine for personalized AI interactions
- 🤖 Pre-built AI coaches with specialized roles
- 💬 Real-time chat with streaming AI responses
- 📝 Personal context management (values, goals, projects, constraints)
- 💎 Pro subscription with feature gating
- 🌙 Light/dark mode support
- 📱 Offline-first architecture

## License

Private - All rights reserved
