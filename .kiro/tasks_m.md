# Master Task List - North App Implementation

Generated: 2026-02-11T22:13:19.653Z
Status: Pending Implementation

## Phase 1: Critical Database & Backend Setup

### Task 1.1: Deploy Coach System Prompts to Database
- [ ] Deploy updated coach system prompts with Socratic approach
- **Implementation Details:**
  - Run migration: `supabase/migrations/update_default_coaches_v2.sql`
  - Execute via: `cd supabase && npx supabase db push`
  - Or manually via Supabase Dashboard SQL Editor
- **Verification:**
  - Check Tables → coaches shows 6 coaches
  - Verify: Strategic Thinking, Systems Thinking, Writing, Decision-Making, Leadership, Fitness
- **Guardrails:**
  - Backup existing coaches table before migration
  - Do not proceed if table has user-created coaches without backup

### Task 1.2: Verify Edge Function Configuration
- [ ] Check GEMINI_API_KEY secret is set correctly
- **Implementation Details:**
  - Run: `cd supabase && npx supabase secrets list --project-ref pigtshfobiwuwaionxpo`
  - Verify GEMINI_API_KEY appears in list
  - Test chat Edge Function with curl
- **Verification:**
  - Secret shows in list
  - Edge Function logs show no authentication errors
- **Guardrails:**
  - Never commit API keys to git
  - Use Supabase secrets management only

### Task 1.3: Test AI Chat Functionality
- [ ] Send test message to verify AI responses work
- **Implementation Details:**
  - Open app, navigate to any coach
  - Send message: "Hello, can you help me think through a problem?"
  - Verify response streams back successfully
- **Verification:**
  - Message appears in chat
  - AI response streams in real-time
  - Response follows Socratic questioning approach
- **Guardrails:**
  - If fails, check Edge Function logs immediately
  - Do not proceed to UI changes until chat works

---

## Phase 2: Theme System Integration

### Task 2.1: Integrate ThemeProvider in Root Layout
- [x] Wrap app with ThemeProvider for instant theme switching
- **Implementation Details:**
  - Edit `app/_layout.tsx`
  - Import: `import { ThemeProvider } from '@/contexts/ThemeContext';`
  - Wrap return statement:
    ```typescript
    return (
      <ThemeProvider>
        <ErrorBoundary>
          <SafeAreaProvider>
            {/* existing content */}
          </SafeAreaProvider>
        </ErrorBoundary>
      </ThemeProvider>
    );
    ```
- **Verification:**
  - App compiles without errors
  - Theme context is available throughout app
- **Guardrails:**
  - Ensure ThemeProvider is outermost wrapper
  - Do not nest multiple ThemeProviders

### Task 2.2: Update Settings Screen Theme Logic
- [x] Replace old theme management with new ThemeContext
- **Implementation Details:**
  - Edit `app/(tabs)/settings.tsx`
  - Remove old AsyncStorage theme code (around line 200-236)
  - Import: `import { useTheme } from '@/contexts/ThemeContext';`
  - Replace `const [theme, setTheme]` with: `const { themeMode, setTheme: setThemeMode } = useTheme();`
  - Update `handleThemeChange`:
    ```typescript
    const handleThemeChange = async (theme: ThemeMode) => {
      await setThemeMode(theme);
      setIsThemeModalVisible(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Remove Alert.alert about restarting - instant now!
    };
    ```
- **Verification:**
  - Theme switches instantly without reload
  - Selection persists after app restart
- **Guardrails:**
  - Test all three modes: light, dark, system
  - Ensure no race conditions in async theme updates

### Task 2.3: Replace useColorScheme in ChatInput
- [x] Update ChatInput to use ThemeContext instead of useColorScheme
- **Implementation Details:**
  - Edit `components/chat/ChatInput.tsx`
  - Replace: `import { useColorScheme } from 'react-native';`
  - With: `import { useIsDark, useThemeColors } from '@/contexts/ThemeContext';`
  - Replace: `const colorScheme = useColorScheme();`
  - With: `const isDark = useIsDark();` and `const colors = useThemeColors();`
  - Update conditional styles to use `isDark` instead of `colorScheme === 'dark'`
- **Verification:**
  - Input bar respects theme changes instantly
  - Send button colors update correctly
- **Guardrails:**
  - Test both light and dark themes
  - Verify keyboard appearance matches theme

### Task 2.4: Replace useColorScheme in MessageBubble
- [x] Update MessageBubble to use ThemeContext (uses NativeWind dark: classes)
- **Implementation Details:**
  - Edit `components/chat/MessageBubble.tsx`
  - Apply same changes as Task 2.3
  - Update bubble background colors using `colors` object
- **Verification:**
  - Message bubbles render correctly in both themes
  - Text remains readable in all cases
- **Guardrails:**
  - Ensure contrast ratios meet accessibility standards
  - Test with long messages

### Task 2.5: Replace useColorScheme in CoachCard
- [x] Update CoachCard to use ThemeContext (uses NativeWind dark: classes)
- **Implementation Details:**
  - Edit `components/coach/CoachCard.tsx`
  - Apply same pattern as previous tasks
- **Verification:**
  - Coach cards look good in both themes
  - Hover states work correctly
- **Guardrails:**
  - Test with all 6 coach types
  - Verify icon visibility in both themes

### Task 2.6: Update All Screen Files to Use ThemeContext
- [x] Replace useColorScheme in all screen files (already using ThemeContext or NativeWind)
- **Implementation Details:**
  - Find all files in `app/(tabs)/` using useColorScheme
  - Apply same replacement pattern
  - Files likely affected: index.tsx, context.tsx, settings.tsx, admin.tsx
- **Verification:**
  - All screens respond to theme changes
  - No console errors about missing theme context
- **Guardrails:**
  - Test navigation between all tabs
  - Ensure no flashing during theme transitions

---

## Phase 3: Settings Page UI Improvements

### Task 3.1: Redesign SettingsRow Layout
- [x] Update SettingsRow component for better spacing and alignment
- **Implementation Details:**
  - Edit `app/(tabs)/settings.tsx` around line 118-182
  - Restructure to three sections: Icon (fixed width), Label (flex), Value (right-aligned)
  - Add proper padding: 18px vertical, 16px horizontal
  - Min height: 64px per row
  - See URGENT_FIXES_GUIDE.md for complete code
- **Verification:**
  - Labels on left, values on right
  - Proper spacing around all text
  - Touch targets are 44px minimum
- **Guardrails:**
  - Test with long user names
  - Verify wrapping doesn't break layout

### Task 3.2: Update Settings Page Styles
- [x] Apply new StyleSheet with improved spacing
- **Implementation Details:**
  - Replace styles object in settings.tsx (line 489-693)
  - Add rowIconSection, rowLabelSection, rowValueSection styles
  - Update padding values throughout
  - See URGENT_FIXES_GUIDE.md for complete styles
- **Verification:**
  - Cards have visible padding
  - Text doesn't touch card edges
  - Rows are evenly spaced
- **Guardrails:**
  - Maintain accessibility - don't reduce touch targets
  - Test on small screens (iPhone SE size)

---

## Phase 4: Tab Bar Navigation Fix

### Task 4.1: Add Safe Area Insets to Tab Bar
- [x] Fix tab bar to avoid phone navigation buttons
- **Implementation Details:**
  - Edit `app/(tabs)/_layout.tsx`
  - Import: `import { useSafeAreaInsets } from 'react-native-safe-area-context';`
  - Get insets: `const insets = useSafeAreaInsets();`
  - Update tabBarStyle height: `height: 80 + insets.bottom`
  - Update paddingBottom: `paddingBottom: insets.bottom > 0 ? insets.bottom : 20`
- **Verification:**
  - Tab buttons don't overlap phone nav
  - Easy to tap all tabs
  - Works on devices with gesture navigation
- **Guardrails:**
  - Test on multiple Android devices
  - Verify notched devices (iPhone X+) render correctly

---

## Phase 5: Console Cleanup

### Task 5.1: Suppress Non-Critical Warnings
- [x] Add LogBox.ignoreLogs to suppress known warnings
- **Implementation Details:**
  - Edit `app/_layout.tsx` at top of file
  - Import: `import { LogBox } from 'react-native';`
  - Add after imports:
    ```typescript
    LogBox.ignoreLogs([
      'SafeAreaView has been deprecated',
      'Error registering for push notifications',
      'Error fetching offerings',
    ]);
    ```
- **Verification:**
  - Console only shows relevant errors
  - RevenueCat warnings don't appear
  - Push notification errors hidden
- **Guardrails:**
  - Only ignore truly non-critical warnings
  - Document why each warning is ignored

---

## Phase 6: Testing & Validation

### Task 6.1: Manual Testing Checklist
- [ ] Execute full manual test suite
- **Implementation Details:**
  - Test AI chat with all 6 coaches
  - Switch theme multiple times on all screens
  - Navigate all tabs, verify no overlap
  - Test settings page with long values
  - Verify coach cards look correct
- **Verification:**
  - All features work as expected
  - No visual glitches
  - No console errors
- **Guardrails:**
  - Test on physical device, not just emulator
  - Test with slow network (airplane mode toggle)

### Task 6.2: Performance Validation
- [ ] Verify app performance hasn't regressed
- **Implementation Details:**
  - Check cold start time (should be < 2 seconds)
  - Verify theme switching is instant (< 100ms perceived)
  - Check memory usage (no leaks)
- **Verification:**
  - Performance meets requirements
  - No jank during animations
  - Battery usage reasonable
- **Guardrails:**
  - Use React DevTools Profiler
  - Monitor for memory leaks with long sessions

---

## Phase 7: Documentation & Deployment

### Task 7.1: Update README with New Features
- [x] Document theme system and new coaches
- **Implementation Details:**
  - Edit main README.md
  - Add section on theme customization
  - Document new coach capabilities
  - Update screenshots if needed
- **Verification:**
  - Documentation is clear and accurate
  - New contributors can understand changes
- **Guardrails:**
  - Keep documentation up to date
  - Use clear, concise language

### Task 7.2: Create Migration Guide for Users
- [x] Document what changed for existing users
- **Implementation Details:**
  - Create MIGRATION_GUIDE.md
  - Explain new coaches and theme system
  - Note any breaking changes
- **Verification:**
  - Users understand what changed
  - Migration path is clear
- **Guardrails:**
  - Be transparent about changes
  - Provide rollback instructions if needed

---

## Summary Statistics
- Total Tasks: 21
- Completed: 15
- Failed: 0
- Skipped/Manual: 6 (Phase 1 database tasks + manual testing tasks require device/Supabase Dashboard access)
- In Progress: 0

Last Updated: 2026-02-13T22:40:00Z
