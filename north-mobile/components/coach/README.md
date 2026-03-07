# Coach Components

This directory contains all coach-related UI components for the North mobile application.

## Components

### CoachCard

Displays a single coach with icon, name, and custom badge.

**Props:**
- `coach: Coach` - The coach to display
- `onPress: () => void` - Callback when card is pressed
- `onLongPress?: () => void` - Optional callback for long press (used for editing)
- `testID?: string` - Optional test identifier

**Features:**
- Displays coach icon (emoji) and name
- Shows "Custom" badge for user-created coaches
- Haptic feedback on press
- Accessibility labels
- NativeWind styling

**Example:**
```tsx
<CoachCard
  coach={strategyCoach}
  onPress={() => router.push(`/chat/${coach.id}`)}
  onLongPress={() => handleEditCoach(coach)}
/>
```

---

### CoachGrid

Displays coaches in a 2-column grid layout.

**Props:**
- `coaches: Coach[]` - Array of coaches to display
- `onCoachPress: (coach: Coach) => void` - Callback when a coach is pressed
- `onCoachLongPress?: (coach: Coach) => void` - Optional callback for long press
- `testID?: string` - Optional test identifier

**Features:**
- Responsive 2-column grid
- Consistent spacing between cards
- Handles odd number of coaches gracefully
- Passes through press handlers to CoachCard

**Example:**
```tsx
<CoachGrid
  coaches={allCoaches}
  onCoachPress={(coach) => router.push(`/chat/${coach.id}`)}
  onCoachLongPress={(coach) => handleEditCoach(coach)}
/>
```

---

### CoachCreateModal

Modal for creating new custom coaches (Pro feature).

**Props:**
- `visible: boolean` - Whether the modal is visible
- `onCreate: (name: string, icon: string, systemPrompt: string) => Promise<void>` - Callback to create coach
- `onClose: () => void` - Callback to close modal

**Features:**
- Name input with 50 character limit
- Icon picker with 24 emoji suggestions
- System prompt textarea with 20-2000 character validation
- Form validation with error messages
- Loading state during creation
- Haptic feedback on actions
- Keyboard avoiding view
- Accessibility labels

**Example:**
```tsx
const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
const { createCoach } = useCoachStore();

<CoachCreateModal
  visible={isCreateModalVisible}
  onCreate={async (name, icon, systemPrompt) => {
    await createCoach(name, icon, systemPrompt);
  }}
  onClose={() => setIsCreateModalVisible(false)}
/>
```

---

### CoachEditModal

Modal for editing user's private coaches.

**Props:**
- `visible: boolean` - Whether the modal is visible
- `coach: Coach | null` - The coach to edit
- `onSave: (id: string, updates: Partial<Coach>) => Promise<void>` - Callback to save changes
- `onDelete?: (id: string) => Promise<void>` - Optional callback to delete coach
- `onClose: () => void` - Callback to close modal

**Features:**
- Name input with 50 character limit
- Icon picker with 24 emoji suggestions
- System prompt textarea with 20-2000 character validation
- Form validation with error messages
- Loading state during save/delete operations
- Delete button with confirmation dialog
- Unsaved changes confirmation
- Haptic feedback on actions
- Keyboard avoiding view
- Accessibility labels

**Example:**
```tsx
const [isEditModalVisible, setIsEditModalVisible] = useState(false);
const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
const { updateCoach, deleteCoach } = useCoachStore();

<CoachEditModal
  visible={isEditModalVisible}
  coach={selectedCoach}
  onSave={async (id, updates) => {
    await updateCoach(id, updates);
  }}
  onDelete={async (id) => {
    await deleteCoach(id);
  }}
  onClose={() => {
    setIsEditModalVisible(false);
    setSelectedCoach(null);
  }}
/>
```

---

## Design System Compliance

All components follow Simon's design brief: "Beautiful, minimal, clean"

- **NativeWind**: All styling uses Tailwind utility classes
- **Haptic Feedback**: All interactive elements provide haptic feedback
- **Accessibility**: All components include proper accessibility labels and hints
- **Dark Mode**: All components support dark mode via NativeWind's `dark:` prefix
- **Typography**: Consistent font sizes and weights from design system
- **Colors**: Uses design system color tokens (zinc palette)
- **Spacing**: Consistent spacing using Tailwind's spacing scale

---

## Validation

These components validate the following requirements:

- **Requirement 7.1**: Coach creation feature gating (Pro users only)
- **Requirement 7.2**: Coach creation with name, icon, and system prompt
- **Requirement 7.6**: Coach editing for private coaches
- **Requirement 13.1**: Coach display in marketplace
- **Requirement 13.2**: Coach card tap navigation
- **Requirement 13.6**: Coach card styling and layout

---

## Testing

To test these components:

1. **CoachCard**: Test rendering, press handlers, custom badge display
2. **CoachGrid**: Test 2-column layout, odd number handling, press handlers
3. **CoachCreateModal**: Test form validation, icon selection, creation flow
4. **CoachEditModal**: Test form validation, icon selection, save/delete flow

Example test:
```tsx
import { render, fireEvent } from '@testing-library/react-native';
import { CoachCard } from './CoachCard';

test('CoachCard renders coach name and icon', () => {
  const coach = {
    id: '1',
    name: 'Strategy Coach',
    icon: '🎯',
    systemPrompt: 'You are a strategy coach',
    creatorId: null,
    isPublic: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const { getByText } = render(
    <CoachCard coach={coach} onPress={() => {}} />
  );

  expect(getByText('Strategy Coach')).toBeTruthy();
  expect(getByText('🎯')).toBeTruthy();
});
```

---

## Usage in Screens

These components are designed to be used in:

- **Home Screen** (`app/(tabs)/index.tsx`): Display coach grid with navigation
- **Coach Management**: Create and edit modals for Pro users

Example integration:
```tsx
import { CoachGrid, CoachCreateModal, CoachEditModal } from '@/components/coach';
import { useCoachStore } from '@/stores/coachStore';
import { useBillingStore } from '@/stores/billingStore';

export default function HomeScreen() {
  const { coaches, createCoach, updateCoach, deleteCoach } = useCoachStore();
  const { isProUser } = useBillingStore();
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [editingCoach, setEditingCoach] = useState<Coach | null>(null);
  const router = useRouter();

  const handleCoachPress = (coach: Coach) => {
    router.push(`/chat/${coach.id}`);
  };

  const handleCoachLongPress = (coach: Coach) => {
    if (coach.creatorId) {
      setEditingCoach(coach);
    }
  };

  const handleCreatePress = () => {
    if (!isProUser) {
      // Show paywall
      return;
    }
    setIsCreateModalVisible(true);
  };

  return (
    <View>
      <CoachGrid
        coaches={coaches}
        onCoachPress={handleCoachPress}
        onCoachLongPress={handleCoachLongPress}
      />

      <CoachCreateModal
        visible={isCreateModalVisible}
        onCreate={createCoach}
        onClose={() => setIsCreateModalVisible(false)}
      />

      <CoachEditModal
        visible={!!editingCoach}
        coach={editingCoach}
        onSave={updateCoach}
        onDelete={deleteCoach}
        onClose={() => setEditingCoach(null)}
      />
    </View>
  );
}
```
