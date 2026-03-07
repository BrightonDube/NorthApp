# Master Task List - North App Implementation

Generated: 2026-02-24T00:00:00.000Z
Status: Active Development - Socratic AI Engine Migration

**Current Focus:** Diagnosing and fixing "AI service not available" error, then implementing Socratic AI Engine enhancements.

**Related Spec:** `.kiro/specs/ai_socratic_engine.md`

## Phase 0: CRITICAL - Diagnose & Fix "AI Service Not Available" Error

**Priority:** P0 - BLOCKING
**Estimated Time:** 1-2 hours
**Status:** Not Started

### Task 0.1: Verify Railway Deployment Health
- [ ] Check Railway deployment status and logs
- **Implementation Details:**
  - Visit Railway dashboard: https://railway.app
  - Check deployment status for north-backend-production-5023
  - Review recent logs for errors
  - Test health endpoint: `curl https://north-backend-production-5023.up.railway.app/health`
- **Expected Result:**
  - Health endpoint returns `{"status": "ok", "version": "1.0.0"}`
  - No errors in Railway logs
  - Deployment shows as "Active"
- **Guardrails:**
  - If deployment is down, redeploy from Railway dashboard
  - Check Railway environment variables are set

### Task 0.2: Validate JWT Secret Configuration
- [ ] Ensure backend JWT secret matches Supabase project
- **Implementation Details:**
  - Get JWT secret from Supabase Dashboard:
    - Go to: Project Settings → API → JWT Settings
    - Copy "JWT Secret" value
  - Update Railway environment variable:
    - Railway Dashboard → Variables
    - Set `SUPABASE_JWT_SECRET` to the copied value
  - Redeploy backend after updating
- **Expected Result:**
  - JWT secret in Railway matches Supabase
  - Backend can validate mobile app tokens
- **Guardrails:**
  - NEVER commit JWT secret to git
  - Use Railway's encrypted environment variables

### Task 0.3: Fix CORS Configuration
- [ ] Update ALLOWED_ORIGINS to include mobile client
- **Implementation Details:**
  - Edit `backend/.env` or Railway environment variables
  - Current: `ALLOWED_ORIGINS=http://localhost:8081,http://localhost:19006`
  - Add: `exp://192.168.1.*,http://192.168.1.*` (for Expo development)
  - For production: Add actual mobile app origins
  - Redeploy backend
- **Expected Result:**
  - Mobile app can make requests without CORS errors
  - OPTIONS preflight requests succeed
- **Guardrails:**
  - Don't use `*` wildcard in production
  - Test with actual device IP addresses

### Task 0.4: Test Chat Endpoint with Real Token
- [ ] Verify chat endpoint works with mobile app JWT
- **Implementation Details:**
  - Get JWT token from mobile app:
    - Add console.log in `chatStore.ts` line 520: `console.log('Token:', session.access_token)`
    - Run app, send message, copy token from logs
  - Test with curl:
    ```bash
    curl -X POST https://north-backend-production-5023.up.railway.app/v1/chat/stream \
      -H "Authorization: Bearer <token>" \
      -H "Content-Type: application/json" \
      -d '{"session_id":"test","coach_id":"test","message":"Hello"}'
    ```
  - Check response and Railway logs
- **Expected Result:**
  - Endpoint returns SSE stream
  - No 401/403 errors
  - Railway logs show successful request
- **Guardrails:**
  - Remove console.log after testing
  - Don't share tokens publicly

### Task 0.5: Update Mobile App Error Handling
- [ ] Improve error messages in chatStore.ts
- **Implementation Details:**
  - Edit `north-mobile/stores/chatStore.ts` line 600-650
  - Add more detailed error logging:
    ```typescript
    if (__DEV__) {
      console.error('[ChatStore] Request failed:', {
        url: `${apiUrl}/v1/chat/stream`,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      });
    }
    ```
  - Add network connectivity check before request
  - Show specific error messages for different failure modes
- **Expected Result:**
  - Clear error messages help diagnose issues
  - Users see actionable error messages
- **Guardrails:**
  - Only log sensitive data in __DEV__ mode
  - Don't expose internal errors to users

---

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


---

## Phase 8: GROW Model Implementation

**Priority:** P1 - High
**Estimated Time:** 4-6 hours
**Status:** Not Started

### Task 8.1: Add GROW State Tracking to Database
- [ ] Create database migration for GROW model
- **Implementation Details:**
  - Create file: `supabase/migrations/20260224000000_add_grow_tracking.sql`
  - Add columns to chat_sessions:
    ```sql
    ALTER TABLE chat_sessions 
    ADD COLUMN grow_state TEXT DEFAULT 'goal',
    ADD COLUMN grow_data JSONB DEFAULT '{}',
    ADD COLUMN grow_updated_at TIMESTAMPTZ DEFAULT NOW();
    
    -- Valid states: goal, reality, options, way_forward, complete
    ALTER TABLE chat_sessions 
    ADD CONSTRAINT grow_state_check 
    CHECK (grow_state IN ('goal', 'reality', 'options', 'way_forward', 'complete'));
    ```
  - Apply migration via Supabase Dashboard or CLI
- **Expected Result:**
  - New columns exist in chat_sessions table
  - Constraint prevents invalid states
- **Guardrails:**
  - Backup database before migration
  - Test migration on staging first

### Task 8.2: Update Chat Agent with GROW Logic
- [ ] Enhance chat_agent.py to include GROW state
- **Implementation Details:**
  - Edit `backend/app/agents/chat_agent.py`
  - Add function to get GROW state:
    ```python
    async def get_grow_state(session_id: str) -> dict:
        supabase = get_supabase_client()
        result = (
            supabase.from_("chat_sessions")
            .select("grow_state, grow_data")
            .eq("id", session_id)
            .single()
            .execute()
        )
        return {
            "state": result.data.get("grow_state", "goal"),
            "data": result.data.get("grow_data", {}),
        }
    ```
  - Update system prompt to include GROW guidance
  - Add GROW state progression logic
- **Expected Result:**
  - Coach prompts guide users through GROW stages
  - State progresses naturally through conversation
- **Guardrails:**
  - Don't force rigid progression
  - Allow users to revisit earlier stages

### Task 8.3: Add GROW State Progression API
- [ ] Create endpoint to manually update GROW state
- **Implementation Details:**
  - Create file: `backend/app/api/v1/grow.py`
  - Add endpoint:
    ```python
    @router.patch("/sessions/{session_id}/grow")
    async def update_grow_state(
        session_id: str,
        state: str,
        data: dict,
        user: AuthUser = Depends(get_current_user),
    ):
        # Validate state
        # Update database
        # Return updated session
    ```
  - Add to router in `backend/app/api/v1/router.py`
- **Expected Result:**
  - Frontend can manually advance GROW stages
  - State updates persist to database
- **Guardrails:**
  - Validate user owns session
  - Validate state transitions are valid

### Task 8.4: Add GROW UI Indicators (Optional)
- [ ] Show GROW progress in chat UI
- **Implementation Details:**
  - Add GROW stage indicator to ChatScreen header
  - Show progress bar or stage labels
  - Highlight current stage
- **Expected Result:**
  - Users see which GROW stage they're in
  - Visual feedback on progress
- **Guardrails:**
  - Keep UI minimal and non-intrusive
  - Don't overwhelm users with complexity

---

## Phase 9: Multi-Model Intelligent Routing

**Priority:** P2 - Medium
**Estimated Time:** 6-8 hours
**Status:** Not Started

### Task 9.1: Add Model Selection Logic
- [ ] Implement intelligent model routing
- **Implementation Details:**
  - Edit `backend/app/agents/chat_agent.py`
  - Add function:
    ```python
    def select_model(
        coach_id: str, 
        message_length: int, 
        has_images: bool,
        conversation_depth: int
    ) -> str:
        coach_type = get_coach_type(coach_id)
        
        if has_images:
            return "meta-llama/llama-4-scout-17b-16e-instruct"
        
        if coach_type in ["strategic", "systems"] and message_length > 1000:
            return "claude-3-5-sonnet"
        
        if coach_type in ["leadership", "eq"] and conversation_depth > 10:
            return "gemini-1.5-flash"
        
        return "meta-llama/llama-4-scout-17b-16e-instruct"
    ```
  - Update stream_chat_response to use selected model
- **Expected Result:**
  - Complex queries route to appropriate models
  - Cost optimization through smart routing
- **Guardrails:**
  - Monitor token costs per model
  - Set budget limits per user

### Task 9.2: Add Claude 3.5 Sonnet Integration
- [ ] Integrate Anthropic Claude API
- **Implementation Details:**
  - Add to `backend/requirements.txt`: `anthropic>=0.18.0`
  - Add to `backend/app/config.py`: `anthropic_api_key: str = ""`
  - Create `backend/app/services/claude.py`:
    ```python
    from anthropic import AsyncAnthropic
    
    async def stream_claude_response(messages, system_prompt):
        client = AsyncAnthropic(api_key=settings.anthropic_api_key)
        async with client.messages.stream(
            model="claude-3-5-sonnet-20241022",
            max_tokens=2048,
            messages=messages,
            system=system_prompt,
        ) as stream:
            async for text in stream.text_stream:
                yield text
    ```
  - Update chat_agent.py to use Claude when selected
- **Expected Result:**
  - Claude available for complex reasoning tasks
  - Streaming works correctly
- **Guardrails:**
  - Handle Claude-specific rate limits
  - Fallback to Groq if Claude fails

### Task 9.3: Add Gemini 1.5 Flash Integration
- [ ] Integrate Google Gemini API
- **Implementation Details:**
  - Add to `backend/requirements.txt`: `google-generativeai>=0.3.0`
  - Add to `backend/app/config.py`: `gemini_api_key: str = ""`
  - Create `backend/app/services/gemini.py`:
    ```python
    import google.generativeai as genai
    
    async def stream_gemini_response(messages, system_prompt):
        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Convert messages to Gemini format
        prompt = format_for_gemini(messages, system_prompt)
        
        response = model.generate_content(
            prompt,
            stream=True,
        )
        
        for chunk in response:
            if chunk.text:
                yield chunk.text
    ```
  - Update chat_agent.py to use Gemini when selected
- **Expected Result:**
  - Gemini available for high-context conversations
  - 1M+ token window utilized
- **Guardrails:**
  - Handle Gemini safety filters
  - Provide clear error messages for blocked content

### Task 9.4: Add Model Usage Analytics
- [ ] Track which models are used and costs
- **Implementation Details:**
  - Create table: `model_usage_logs`
    ```sql
    CREATE TABLE model_usage_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users(id),
      session_id UUID REFERENCES chat_sessions(id),
      model TEXT NOT NULL,
      input_tokens INT,
      output_tokens INT,
      cost_usd DECIMAL(10, 6),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    ```
  - Log usage after each LLM call
  - Create dashboard endpoint to view costs
- **Expected Result:**
  - Track costs per user and model
  - Identify expensive queries
- **Guardrails:**
  - Set per-user budget limits
  - Alert on unusual usage patterns

---

## Phase 10: Voice Interface - Mic Button

**Priority:** P3 - Low
**Estimated Time:** 8-10 hours
**Status:** Not Started

### Task 10.1: Add Mic Button to ChatInput
- [ ] Create mic button UI component
- **Implementation Details:**
  - Edit `north-mobile/components/chat/ChatInput.tsx`
  - Add mic button next to send button:
    ```typescript
    <TouchableOpacity
      onPress={handleMicPress}
      className="w-12 h-12 rounded-full bg-primary items-center justify-center"
      disabled={isRecording}
    >
      {isRecording ? (
        <View className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
      ) : (
        <Ionicons name="mic" size={24} color="white" />
      )}
    </TouchableOpacity>
    ```
  - Add recording state management
- **Expected Result:**
  - Mic button appears in chat input
  - Visual feedback when recording
- **Guardrails:**
  - Request microphone permissions
  - Handle permission denials gracefully

### Task 10.2: Implement Audio Recording
- [ ] Add audio recording functionality
- **Implementation Details:**
  - Install: `expo install expo-av`
  - Create hook: `north-mobile/hooks/useAudioRecording.ts`
    ```typescript
    import { Audio } from 'expo-av';
    
    export function useAudioRecording() {
      const [recording, setRecording] = useState<Audio.Recording | null>(null);
      const [isRecording, setIsRecording] = useState(false);
      
      const startRecording = async () => {
        await Audio.requestPermissionsAsync();
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        
        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        
        setRecording(recording);
        setIsRecording(true);
      };
      
      const stopRecording = async () => {
        if (!recording) return null;
        
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        setRecording(null);
        setIsRecording(false);
        
        return uri;
      };
      
      return { startRecording, stopRecording, isRecording };
    }
    ```
  - Use hook in ChatInput
- **Expected Result:**
  - Audio recording works on iOS and Android
  - Recording stops when button released
- **Guardrails:**
  - Limit recording duration (max 60s)
  - Handle recording failures gracefully

### Task 10.3: Integrate Whisper STT
- [ ] Send audio to backend for transcription
- **Implementation Details:**
  - Update ChatInput to call STT endpoint:
    ```typescript
    const transcribeAudio = async (audioUri: string) => {
      const formData = new FormData();
      formData.append('audio', {
        uri: audioUri,
        type: 'audio/m4a',
        name: 'recording.m4a',
      } as any);
      
      const response = await fetch(`${apiUrl}/v1/chat/voice`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      
      const { text } = await response.json();
      return text;
    };
    ```
  - Set transcribed text as message input
  - Auto-send or let user edit
- **Expected Result:**
  - Voice input transcribed to text
  - Text appears in input field
- **Guardrails:**
  - Show loading state during transcription
  - Handle transcription errors

### Task 10.4: Add Voice Response Playback (Future)
- [ ] Implement TTS for AI responses
- **Implementation Details:**
  - Add speaker button to message bubbles
  - Call TTS endpoint when clicked
  - Play audio response
  - Show playback controls
- **Expected Result:**
  - Users can hear AI responses
  - Playback controls work correctly
- **Guardrails:**
  - Cache audio files to reduce API calls
  - Respect device volume settings

---

## Phase 11: Enhanced Memory & RAG

**Priority:** P2 - Medium
**Estimated Time:** 6-8 hours
**Status:** Not Started

### Task 11.1: Add Conversation Insights Extraction
- [ ] Extract key insights at conversation end
- **Implementation Details:**
  - Create table: `conversation_insights`
    ```sql
    CREATE TABLE conversation_insights (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users(id),
      coach_id UUID REFERENCES coaches(id),
      session_id UUID REFERENCES chat_sessions(id),
      insight TEXT NOT NULL,
      confidence FLOAT DEFAULT 0.8,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    ```
  - Add background task to extract insights
  - Use LLM to summarize key takeaways
- **Expected Result:**
  - Insights extracted after each conversation
  - Stored for future reference
- **Guardrails:**
  - Only extract from conversations > 5 messages
  - Deduplicate similar insights

### Task 11.2: Surface Relevant Insights in Future Chats
- [ ] Inject past insights into new conversations
- **Implementation Details:**
  - Query conversation_insights when starting chat
  - Filter by coach_id and relevance
  - Add to system prompt:
    ```
    ## Past Insights with this Coach:
    - [Insight 1]
    - [Insight 2]
    ```
  - Limit to top 3 most relevant
- **Expected Result:**
  - Coach remembers past conversations
  - Builds on previous insights
- **Guardrails:**
  - Don't overwhelm prompt with too many insights
  - Allow users to delete insights

### Task 11.3: Add Memory Management UI
- [ ] Let users view and manage memories
- **Implementation Details:**
  - Create screen: `north-mobile/app/memories.tsx`
  - List all memories with delete option
  - Show memory source (which conversation)
  - Add search/filter functionality
- **Expected Result:**
  - Users can see what AI remembers
  - Users can delete unwanted memories
- **Guardrails:**
  - Respect user privacy
  - Make deletion permanent

---

## Summary Statistics
- Total Tasks: 36 (21 original + 15 new)
- Completed: 15 (from previous phases)
- Critical (P0): 5 (Phase 0)
- High Priority (P1): 4 (Phase 8)
- Medium Priority (P2): 8 (Phases 9, 11)
- Low Priority (P3): 4 (Phase 10)
- In Progress: 0
- Blocked: 0

Last Updated: 2026-02-24T00:00:00Z

---

## Next Steps

1. **IMMEDIATE:** Complete Phase 0 to fix "AI service not available" error
2. **SHORT TERM:** Implement GROW model (Phase 8)
3. **MEDIUM TERM:** Add multi-model routing (Phase 9)
4. **LONG TERM:** Voice interface and enhanced memory (Phases 10-11)

**See `.kiro/specs/ai_socratic_engine.md` for complete architectural details.**
