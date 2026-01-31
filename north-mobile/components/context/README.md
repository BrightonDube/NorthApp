# Context UI Components

This directory contains all UI components for displaying and managing context items in the North mobile application.

## Components

### 1. ContextCard

**File:** `ContextCard.tsx`

**Purpose:** Displays an individual context item with category-specific styling, swipe-to-delete gesture, and tap-to-edit functionality.

**Features:**
- Category-specific background colors (purple for values, blue for goals, green for projects, orange for constraints)
- Swipe-to-delete gesture with haptic feedback
- Tap to edit functionality with haptic feedback
- Content preview (max 3 lines)
- Accessibility labels for screen readers
- Smooth animations on mount/unmount

**Props:**
```typescript
interface ContextCardProps {
  context: UserContext;
  onEdit: () => void;
  onDelete: () => void;
}
```

**Requirements:** 14.2, 14.6, 14.7

---

### 2. ContextSection

**File:** `ContextSection.tsx`

**Purpose:** Groups context items by category with a section header and empty state.

**Features:**
- Section header with category name
- List of ContextCard components
- Empty state with helpful description when no items exist
- Proper spacing and layout

**Props:**
```typescript
interface ContextSectionProps {
  category: ContextCategory;
  items: UserContext[];
  onEdit: (context: UserContext) => void;
  onDelete: (id: string) => void;
}
```

**Requirements:** 14.1, 14.6

---

### 3. ContextEditModal

**File:** `ContextEditModal.tsx`

**Purpose:** Modal for editing existing context items.

**Features:**
- Multiline text input for content editing
- Save and Cancel buttons
- Loading state during save operation
- Error display with retry option
- Keyboard avoiding view for better UX
- Haptic feedback on actions
- Unsaved changes confirmation
- Character count (max 1000)

**Props:**
```typescript
interface ContextEditModalProps {
  visible: boolean;
  context: UserContext | null;
  onSave: (id: string, content: string) => Promise<void>;
  onClose: () => void;
}
```

**Requirements:** 14.2, 14.3

---

### 4. ContextCreateModal

**File:** `ContextCreateModal.tsx`

**Purpose:** Modal for creating new context items.

**Features:**
- Category picker with visual indicators
- Multiline text input for content
- Create and Cancel buttons
- Loading state during creation
- Error display with retry option
- Keyboard avoiding view for better UX
- Haptic feedback on actions
- Form validation
- Character count (max 1000)

**Props:**
```typescript
interface ContextCreateModalProps {
  visible: boolean;
  onCreate: (category: ContextCategory, content: string) => Promise<void>;
  onClose: () => void;
}
```

**Requirements:** 14.4

---

## Usage Example

```tsx
import {
  ContextCard,
  ContextSection,
  ContextEditModal,
  ContextCreateModal,
} from '@/components/context';
import { useContextStore } from '@/stores/contextStore';

function ContextScreen() {
  const { items, updateContext, createContext, deleteContext } = useContextStore();
  const [editingContext, setEditingContext] = useState<UserContext | null>(null);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);

  const valueItems = items.filter(item => item.category === 'values');

  return (
    <View>
      {/* Display context items grouped by category */}
      <ContextSection
        category="values"
        items={valueItems}
        onEdit={setEditingContext}
        onDelete={deleteContext}
      />

      {/* Edit modal */}
      <ContextEditModal
        visible={!!editingContext}
        context={editingContext}
        onSave={updateContext}
        onClose={() => setEditingContext(null)}
      />

      {/* Create modal */}
      <ContextCreateModal
        visible={isCreateModalVisible}
        onCreate={createContext}
        onClose={() => setIsCreateModalVisible(false)}
      />
    </View>
  );
}
```

## Dependencies

- `react-native`: Core React Native components
- `react-native-gesture-handler`: For swipe gestures
- `react-native-reanimated`: For smooth animations
- `react-native-safe-area-context`: For safe area handling
- `expo-haptics`: For haptic feedback
- `@/types`: TypeScript type definitions
- `@/stores/contextStore`: Context state management

## Testing

Unit tests are located in `__tests__/unit/components/ContextCard.test.tsx`.

Run tests with:
```bash
npm test -- ContextCard.test.tsx
```

## Styling

All components use NativeWind (Tailwind CSS for React Native) for styling with support for light and dark themes.

### Category Colors

- **Values:** Purple (`bg-purple-100 dark:bg-purple-900/30`)
- **Goals:** Blue (`bg-blue-100 dark:bg-blue-900/30`)
- **Projects:** Green (`bg-green-100 dark:bg-green-900/30`)
- **Constraints:** Orange (`bg-orange-100 dark:bg-orange-900/30`)

## Accessibility

All components include:
- Proper accessibility labels
- Accessibility roles (button, text, radio)
- Accessibility hints for complex interactions
- Support for screen readers (VoiceOver/TalkBack)
- Minimum touch target sizes (44x44pt)

## Implementation Notes

1. **Optimistic Updates:** The components work with the contextStore which implements optimistic updates for better UX.

2. **Haptic Feedback:** All interactive elements provide haptic feedback:
   - Light impact for taps
   - Medium impact for swipes and deletions
   - Success/error notifications for operations

3. **Keyboard Handling:** Modals use `KeyboardAvoidingView` to ensure inputs remain visible when the keyboard is open.

4. **Error Handling:** All modals display errors inline and allow users to retry failed operations.

5. **Validation:** Content is validated for:
   - Non-empty strings
   - Maximum length of 1000 characters
   - Valid category selection

## Future Enhancements

- Drag-to-reorder context items
- Bulk edit/delete operations
- Context item templates
- Rich text formatting
- Attachments/links support
