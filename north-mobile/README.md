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

Use Tailwind CSS classes directly in your components. See the [Design System](./DESIGN_SYSTEM.md) and [Styling Guide](./STYLING_GUIDE.md) for detailed styling instructions.

```tsx
<View className="flex-1 bg-background p-4">
  <Text className="text-2xl font-bold text-primary">Hello World</Text>
</View>
```

**Important:** Always use semantic color tokens (e.g., `bg-background`, `text-primary`) instead of arbitrary colors (e.g., `bg-white`, `text-gray-900`).

## Design System

The app follows a strict design system for consistency:

- **[DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)** - Complete design system documentation including colors, typography, components
- **[STYLING_GUIDE.md](./STYLING_GUIDE.md)** - Implementation guide for AI coding agents with code examples

## Architecture

The application follows a client-server architecture:

- **Client**: React Native app with Expo
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **AI Integration**: OpenAI API via Supabase Edge Functions
- **Subscriptions**: RevenueCat for iOS/Android in-app purchases

## Features

- 🔐 User authentication (email/password, Apple Sign In)
- 🎯 Context Engine for personalized AI interactions
- 🤖 Pre-built AI coaches with specialized roles (6 coaches):
  - **Strategic Thinking** (🎯) - Business strategy and competitive analysis
  - **Systems Thinking** (🔄) - Complex systems and root cause analysis
  - **High-Stakes Writing** (✍️) - Persuasive and clear communication
  - **Decision-Making** (⚖️) - Structured decision frameworks and inversion thinking
  - **Leadership & EQ** (🧭) - Emotional intelligence and difficult conversations
  - **Fitness & Wellness** (💪) - Sustainable health habits and behavior change
- 💬 Real-time chat with streaming AI responses
- 📝 Personal context management (values, goals, projects, constraints)
- 💎 Pro subscription with feature gating
- 🌙 **Instant theme switching** - Light, Dark, and System modes without app reload
- 📱 Offline-first architecture

## Theme Customization

The app supports three theme modes with instant switching (no reload required):

- **Light Mode**: Clean, bright interface for daytime use
- **Dark Mode**: Easy on the eyes for low-light environments  
- **System Mode**: Automatically matches your device's system theme

**How to change theme:**
1. Navigate to Settings tab
2. Tap "Theme" row
3. Select your preferred mode (Light, Dark, or System)
4. Theme changes instantly throughout the app

**For developers:** The theme system uses React Context (`ThemeContext.tsx`) for instant switching without AsyncStorage reload delays. Use `useIsDark()` and `useThemeColors()` hooks instead of React Native's `useColorScheme()`.

## AI Coaches

All coaches use the **Socratic Method** - they ask probing questions rather than giving direct answers, helping you develop your own thinking skills. Each coach has specialized frameworks and built-in guardrails to decline inappropriate requests (medical advice, legal counsel, etc.).

**Free Tier**: Access to all 6 default coaches  
**Pro Tier**: Create unlimited custom coaches with your own system prompts

## License

Private - All rights reserved
