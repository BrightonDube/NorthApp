# Chat Components

This directory contains all UI components related to the chat interface.

## Components

### MessageBubble

Displays individual chat messages with role-based styling.

**Features:**
- Left-aligned for assistant messages
- Right-aligned for user messages
- Streaming support with cursor indicator
- Fade-in animation
- Accessibility labels

**Props:**
- `message: Message` - The message to display
- `isStreaming?: boolean` - Whether this message is currently streaming

**Example:**
```tsx
<MessageBubble 
  message={message} 
  isStreaming={isStreaming}
/>
```

### MessageList

Virtualized list of messages with auto-scroll functionality.

**Features:**
- FlatList for performance
- Auto-scroll to latest message
- Empty state display
- Streaming indicator integration
- Accessibility support

**Props:**
- `messages: Message[]` - Array of messages to display
- `streamingMessage?: string | null` - Current streaming message content
- `isLoading?: boolean` - Whether messages are being loaded
- `emptyMessage?: string` - Message to show when list is empty

**Example:**
```tsx
<MessageList
  messages={messages}
  streamingMessage={streamingMessage}
  emptyMessage="Start a conversation"
/>
```

### ChatInput

Input bar with send button and haptic feedback.

**Features:**
- Multi-line text input
- Auto-growing up to max height
- Send button disabled when empty or sending
- Haptic feedback on send (iOS)
- Keyboard-aware layout

**Props:**
- `onSend: (message: string) => void` - Callback when user sends a message
- `disabled?: boolean` - Whether input is disabled
- `placeholder?: string` - Placeholder text

**Example:**
```tsx
<ChatInput
  onSend={handleSend}
  disabled={isSending}
  placeholder="Message your coach..."
/>
```

### ChatHeader

Header with coach information and back button.

**Features:**
- Coach name and icon display
- Back button with haptic feedback
- Safe area handling
- Accessibility labels

**Props:**
- `coach: Coach` - The coach for this chat
- `onBack: () => void` - Callback when back button is pressed

**Example:**
```tsx
<ChatHeader
  coach={coach}
  onBack={() => router.back()}
/>
```

### StreamingIndicator

Animated typing indicator for AI responses.

**Features:**
- Three-dot animation
- Wave effect
- Smooth transitions
- Accessibility label

**Example:**
```tsx
{isStreaming && <StreamingIndicator />}
```

## Usage in Chat Screen

Here's how to use these components together in a chat screen:

```tsx
import { useState, useEffect } from 'react';
import { View, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { 
  ChatHeader, 
  MessageList, 
  ChatInput 
} from '@/components/chat';
import { useChatStore } from '@/stores/chatStore';
import { useCoachStore } from '@/stores/coachStore';

export default function ChatScreen() {
  const { coachId } = useLocalSearchParams<{ coachId: string }>();
  const router = useRouter();
  
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  const {
    fetchOrCreateSession,
    fetchMessages,
    sendMessage,
    messages,
    streamingMessage,
    isSending,
  } = useChatStore();
  
  const { getCoachById } = useCoachStore();
  const coach = getCoachById(coachId);

  useEffect(() => {
    const init = async () => {
      const session = await fetchOrCreateSession(coachId);
      setSessionId(session.id);
      await fetchMessages(session.id);
    };
    init();
  }, [coachId]);

  const handleSend = async (message: string) => {
    if (!sessionId) return;
    await sendMessage(sessionId, coachId, message);
  };

  if (!coach) return null;

  return (
    <View className="flex-1 bg-white dark:bg-zinc-950">
      <ChatHeader coach={coach} onBack={() => router.back()} />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={0}
      >
        <MessageList
          messages={sessionId ? messages[sessionId] || [] : []}
          streamingMessage={streamingMessage}
          emptyMessage={`Start a conversation with ${coach.name}`}
        />
        
        <ChatInput
          onSend={handleSend}
          disabled={isSending}
          placeholder={`Message ${coach.name}...`}
        />
      </KeyboardAvoidingView>
    </View>
  );
}
```

## Design System Compliance

All components follow the North design system:

- **Colors:** Uses design tokens from `global.css`
- **Typography:** System fonts with proper hierarchy
- **Spacing:** Consistent padding and margins (16px, 24px)
- **Animations:** Subtle fade-ins and smooth transitions
- **Accessibility:** All components have proper labels and roles
- **Dark Mode:** Full support with appropriate color tokens

## Requirements Validation

These components validate the following requirements:

- **8.7:** Message display with role-based alignment
- **10.3:** Haptic feedback on interactions
- **11.1:** Minimal message bubbles without timestamps
- **11.2:** Clear visual distinction between user and assistant
- **11.3:** Send button disabled during message send
- **11.4:** Auto-scroll to latest message
- **11.5:** Message list with FlatList virtualization
- **11.6:** Chat header with coach info
- **11.7:** Back button for navigation

## Testing

Unit tests for these components should cover:

- Message bubble rendering for both roles
- Auto-scroll behavior on new messages
- Send button disabled state
- Haptic feedback triggering
- Empty state display
- Streaming indicator animation
- Accessibility labels
