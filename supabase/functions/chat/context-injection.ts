/**
 * Context Injection Module
 * 
 * Handles building AI coach prompts with user context including file attachments.
 * 
 * Features:
 * - Format user context by category (values, goals, projects, constraints)
 * - Include file attachment content in prompts
 * - Handle token limits with content truncation
 * - Support session-specific file filtering
 * - Include file metadata in context
 * 
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 7.2, 7.3
 */

export interface UserContext {
  category: string;
  content: string;
}

export interface FileAttachment {
  id: string;
  filename: string;
  file_type: string;
  upload_date: string;
  extracted_content: string | null;
  extraction_success: boolean;
}

export interface SessionReportContext {
  summary: string;
  key_insights: string | null;
  action_items: string | null;
  topics: string | null;
  created_at: string;
}

export interface PendingActionItem {
  text: string;
  created_at: string;
}

/**
 * Build complete prompt context including user context, file attachments,
 * and historical session data for continuity.
 * 
 * @param coachSystemPrompt - The coach's base system prompt
 * @param contexts - User context items (values, goals, projects, constraints)
 * @param fileAttachments - User's file attachments (optional)
 * @param recentReports - Recent session reports for this coach (optional)
 * @param pendingActions - Pending action items across all coaches (optional)
 * @returns Complete system prompt with all context
 * 
 * Validates: Requirements 4.1, 4.2, 7.2, 7.3
 */
export function buildPromptContext(
  coachSystemPrompt: string,
  contexts: UserContext[],
  fileAttachments?: FileAttachment[],
  recentReports?: SessionReportContext[],
  pendingActions?: PendingActionItem[],
): string {
  // Format context by category
  const contextByCategory = {
    values: contexts?.filter(c => c.category === 'values').map(c => c.content) || [],
    goals: contexts?.filter(c => c.category === 'goals').map(c => c.content) || [],
    projects: contexts?.filter(c => c.category === 'projects').map(c => c.content) || [],
    constraints: contexts?.filter(c => c.category === 'constraints').map(c => c.content) || [],
  };

  // Build base context section
  let systemPrompt = `${coachSystemPrompt}

---

USER CONTEXT (This information defines who the user is - use it to personalize your responses):

VALUES (Core principles):
${contextByCategory.values.length > 0 ? contextByCategory.values.map(v => `- ${v}`).join('\n') : 'Not specified'}

GOALS (Current objectives):
${contextByCategory.goals.length > 0 ? contextByCategory.goals.map(g => `- ${g}`).join('\n') : 'Not specified'}

PROJECTS (Active work):
${contextByCategory.projects.length > 0 ? contextByCategory.projects.map(p => `- ${p}`).join('\n') : 'Not specified'}

CONSTRAINTS (Limitations):
${contextByCategory.constraints.length > 0 ? contextByCategory.constraints.map(c => `- ${c}`).join('\n') : 'Not specified'}`;

  // Add file attachments section if files are provided
  if (fileAttachments && fileAttachments.length > 0) {
    const fileContent = formatFileContent(fileAttachments);
    systemPrompt += `\n\n${fileContent}`;
  }

  // Add historical session context for continuity
  if (recentReports && recentReports.length > 0) {
    systemPrompt += `\n\nPRIOR SESSION HISTORY (Use this for continuity — reference past discussions naturally, don't repeat them):`;
    for (const report of recentReports) {
      const date = new Date(report.created_at).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric',
      });
      systemPrompt += `\n\n[Session ${date}] ${report.summary}`;
      if (report.topics) {
        try {
          const topics = typeof report.topics === 'string' ? JSON.parse(report.topics) : report.topics;
          if (Array.isArray(topics) && topics.length > 0) {
            systemPrompt += `\nTopics: ${topics.join(', ')}`;
          }
        } catch { /* skip malformed topics */ }
      }
    }
  }

  // Add pending action items for accountability
  if (pendingActions && pendingActions.length > 0) {
    systemPrompt += `\n\nPENDING ACTION ITEMS (The user committed to these — gently check in when relevant, don't nag):`;
    for (const action of pendingActions) {
      const date = new Date(action.created_at).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric',
      });
      systemPrompt += `\n- ${action.text} (since ${date})`;
    }
  }

  return systemPrompt;
}

/**
 * Format file attachments for inclusion in prompts
 * 
 * Includes file metadata and extracted content for each file.
 * Files without extracted content show only metadata.
 * 
 * @param files - Array of file attachments
 * @returns Formatted string with file content and metadata
 * 
 * Validates: Requirements 4.2, 4.4, 4.5
 */
export function formatFileContent(files: FileAttachment[]): string {
  if (!files || files.length === 0) {
    return '';
  }

  let formatted = 'FILE ATTACHMENTS (Reference documents provided by the user):\n';

  for (const file of files) {
    // Format upload date
    const uploadDate = new Date(file.upload_date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    // Add file header with metadata
    formatted += `\n--- FILE: ${file.filename} (${file.file_type.toUpperCase()}, uploaded ${uploadDate}) ---\n`;

    // Add content if available
    if (file.extraction_success && file.extracted_content) {
      // Truncate content if needed (max ~8000 tokens per file, roughly 32000 chars)
      const truncatedContent = truncateContent(file.extracted_content, 32000);
      formatted += `${truncatedContent}\n`;
      
      // Add truncation notice if content was truncated
      if (truncatedContent.length < file.extracted_content.length) {
        formatted += `\n[Content truncated due to length - showing first ${truncatedContent.length} characters]\n`;
      }
    } else {
      formatted += '[Content not available - file could not be processed]\n';
    }

    formatted += '--- END FILE ---\n';
  }

  return formatted;
}

/**
 * Truncate content to fit within token limits
 * 
 * Uses character-based truncation as a proxy for token limits.
 * Approximately 4 characters per token for English text.
 * Truncates at word boundaries to avoid cutting words.
 * 
 * @param content - Content to truncate
 * @param maxChars - Maximum number of characters (default: 32000, ~8000 tokens)
 * @returns Truncated content
 * 
 * Validates: Requirements 4.3
 */
export function truncateContent(content: string, maxChars: number = 32000): string {
  if (!content || content.length <= maxChars) {
    return content;
  }

  // Truncate to max length
  let truncated = content.substring(0, maxChars);

  // Find the last complete word to avoid cutting mid-word
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > maxChars * 0.9) { // Only use word boundary if it's not too far back
    truncated = truncated.substring(0, lastSpace);
  }

  return truncated;
}

/**
 * Filter file attachments for a specific session
 * 
 * If session has specific file selections, return only those files.
 * Otherwise, return all user files (default behavior).
 * 
 * @param allFiles - All user file attachments
 * @param sessionFileIds - File IDs selected for this session (optional)
 * @returns Filtered file attachments
 * 
 * Validates: Requirements 7.2, 7.3
 */
export function filterSessionFiles(
  allFiles: FileAttachment[],
  sessionFileIds?: string[]
): FileAttachment[] {
  // If no session-specific files selected, return all files (default)
  if (!sessionFileIds || sessionFileIds.length === 0) {
    return allFiles;
  }

  // Filter to only session-specific files
  return allFiles.filter(file => sessionFileIds.includes(file.id));
}
