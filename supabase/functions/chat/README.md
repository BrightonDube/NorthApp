# Chat Edge Function

This Supabase Edge Function handles AI chat requests with context-aware prompt composition and streaming responses.

## Features

- **Authentication**: JWT token validation
- **Prompt Composition**: Combines coach system prompt + user context + conversation history
- **Streaming**: Server-Sent Events (SSE) for real-time token streaming
- **Persistence**: Saves assistant messages to database
- **Error Handling**: Graceful error handling with fallback messages

## API Endpoint

```
POST /functions/v1/chat
```

### Request Headers

```
Authorization: Bearer <user_jwt_token>
Content-Type: application/json
```

### Request Body

```json
{
  "sessionId": "uuid",
  "coachId": "uuid",
  "message": "User's message text"
}
```

### Response

Server-Sent Events (SSE) stream with the following event types:

#### Token Event
```
data: {"type":"token","data":"Hello"}
```

#### Done Event
```
data: {"type":"done","data":{"messageId":"uuid"}}
```

#### Error Event
```
data: {"type":"error","data":{"message":"Error description"}}
```

## Environment Variables

The following environment variables must be set in Supabase:

- `SUPABASE_URL`: Your Supabase project URL (auto-provided)
- `SUPABASE_ANON_KEY`: Your Supabase anon key (auto-provided)
- `GEMINI_API_KEY`: Your Google Gemini API key

## Setup Instructions

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Link to Your Project

```bash
supabase link --project-ref <your-project-ref>
```

### 3. Set Environment Variables

```bash
supabase secrets set GEMINI_API_KEY=<your-gemini-api-key>
```

### 4. Deploy the Function

```bash
supabase functions deploy chat
```

### 5. Verify Deployment

```bash
supabase functions list
```

## Getting a Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the API key
5. Set it as an environment variable (see step 3 above)

## Testing Locally

### 1. Start Supabase Locally

```bash
supabase start
```

### 2. Serve the Function

```bash
supabase functions serve chat --env-file .env.local
```

### 3. Test with cURL

```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/chat' \
  --header 'Authorization: Bearer <your-test-jwt>' \
  --header 'Content-Type: application/json' \
  --data '{"sessionId":"test-session","coachId":"test-coach","message":"Hello"}'
```

## Prompt Composition

The function composes prompts in the following format:

```
SYSTEM PROMPT:
{coach.system_prompt}

---

USER CONTEXT (This information defines who the user is - use it to personalize your responses):

VALUES (Core principles):
- {user context items with category='values'}

GOALS (Current objectives):
- {user context items with category='goals'}

PROJECTS (Active work):
- {user context items with category='projects'}

CONSTRAINTS (Limitations):
- {user context items with category='constraints'}

---

CONVERSATION HISTORY:
{last 10 messages}

---

USER MESSAGE:
{current message}
```

## Error Handling

The function handles the following error cases:

- **401 Unauthorized**: Missing or invalid JWT token
- **400 Bad Request**: Missing required fields or message too long (>10,000 chars)
- **404 Not Found**: Coach not found
- **500 Internal Server Error**: Unexpected errors

## Performance

- **Target**: First token within 1.5 seconds
- **Streaming**: Tokens streamed as they're generated
- **History Limit**: Last 10 messages to keep context manageable

## Security

- All requests require valid JWT authentication
- User can only access their own context and messages (enforced by RLS)
- Message length limited to 10,000 characters
- CORS enabled for mobile app access

## Monitoring

Check function logs:

```bash
supabase functions logs chat
```

## Troubleshooting

### Function not responding

1. Check if function is deployed: `supabase functions list`
2. Check function logs: `supabase functions logs chat`
3. Verify environment variables are set: `supabase secrets list`

### Streaming not working

1. Ensure client is handling SSE correctly
2. Check network connectivity
3. Verify Gemini API key is valid

### Context not included in responses

1. Verify user has context items in database
2. Check RLS policies allow reading user_context
3. Review function logs for errors

## Related Documentation

- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Google Gemini API](https://ai.google.dev/docs)
- [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
