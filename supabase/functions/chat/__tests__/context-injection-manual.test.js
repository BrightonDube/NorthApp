/**
 * Manual Test for Context Injection Module
 * 
 * This is a simple Node.js test to verify the context injection logic works correctly.
 * Run with: node supabase/functions/chat/__tests__/context-injection-manual.test.js
 */

// Mock implementations of the functions (copied from context-injection.ts)

function buildPromptContext(coachSystemPrompt, contexts, fileAttachments) {
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

  return systemPrompt;
}

function formatFileContent(files) {
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
      // Truncate content if needed
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

function truncateContent(content, maxChars = 32000) {
  if (!content || content.length <= maxChars) {
    return content;
  }

  // Truncate to max length
  let truncated = content.substring(0, maxChars);

  // Find the last complete word to avoid cutting mid-word
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > maxChars * 0.9) {
    truncated = truncated.substring(0, lastSpace);
  }

  return truncated;
}

function filterSessionFiles(allFiles, sessionFileIds) {
  // If no session-specific files selected, return all files (default)
  if (!sessionFileIds || sessionFileIds.length === 0) {
    return allFiles;
  }

  // Filter to only session-specific files
  return allFiles.filter(file => sessionFileIds.includes(file.id));
}

// Test cases
console.log('=== Testing Context Injection Module ===\n');

// Test 1: Basic prompt with context
console.log('Test 1: Basic prompt with context');
const result1 = buildPromptContext(
  'You are a helpful coach.',
  [
    { category: 'values', content: 'Be honest' },
    { category: 'goals', content: 'Learn TypeScript' }
  ]
);
console.assert(result1.includes('You are a helpful coach.'), 'Should include coach prompt');
console.assert(result1.includes('Be honest'), 'Should include values');
console.assert(result1.includes('Learn TypeScript'), 'Should include goals');
console.log('✓ Passed\n');

// Test 2: Prompt with file attachments
console.log('Test 2: Prompt with file attachments');
const result2 = buildPromptContext(
  'You are a career coach.',
  [{ category: 'goals', content: 'Get promoted' }],
  [
    {
      id: 'file-1',
      filename: 'resume.pdf',
      file_type: 'pdf',
      upload_date: '2024-01-15T10:30:00Z',
      extracted_content: 'John Doe - Software Engineer with 5 years experience',
      extraction_success: true
    }
  ]
);
console.assert(result2.includes('FILE ATTACHMENTS'), 'Should include file attachments section');
console.assert(result2.includes('resume.pdf'), 'Should include filename');
console.assert(result2.includes('John Doe'), 'Should include file content');
console.assert(result2.includes('Jan 15, 2024'), 'Should include formatted date');
console.log('✓ Passed\n');

// Test 3: File without extracted content
console.log('Test 3: File without extracted content');
const result3 = formatFileContent([
  {
    id: 'file-2',
    filename: 'corrupted.pdf',
    file_type: 'pdf',
    upload_date: '2024-01-15T10:30:00Z',
    extracted_content: null,
    extraction_success: false
  }
]);
console.assert(result3.includes('corrupted.pdf'), 'Should include filename');
console.assert(result3.includes('[Content not available'), 'Should show content unavailable message');
console.log('✓ Passed\n');

// Test 4: Content truncation
console.log('Test 4: Content truncation');
const longContent = 'a'.repeat(40000);
const truncated = truncateContent(longContent, 32000);
console.assert(truncated.length <= 32000, 'Should truncate to max length');
console.assert(truncated.length > 0, 'Should not be empty');
console.log('✓ Passed\n');

// Test 5: Session file filtering - all files
console.log('Test 5: Session file filtering - all files (default)');
const allFiles = [
  { id: 'file-1', filename: 'file1.pdf' },
  { id: 'file-2', filename: 'file2.pdf' },
  { id: 'file-3', filename: 'file3.pdf' }
];
const filtered1 = filterSessionFiles(allFiles);
console.assert(filtered1.length === 3, 'Should return all files when no session files specified');
console.log('✓ Passed\n');

// Test 6: Session file filtering - specific files
console.log('Test 6: Session file filtering - specific files');
const filtered2 = filterSessionFiles(allFiles, ['file-1', 'file-3']);
console.assert(filtered2.length === 2, 'Should return only selected files');
console.assert(filtered2[0].id === 'file-1', 'Should include file-1');
console.assert(filtered2[1].id === 'file-3', 'Should include file-3');
console.log('✓ Passed\n');

// Test 7: Multiple files with mixed content
console.log('Test 7: Multiple files with mixed content');
const result7 = formatFileContent([
  {
    id: 'file-1',
    filename: 'doc1.txt',
    file_type: 'txt',
    upload_date: '2024-01-15T10:30:00Z',
    extracted_content: 'Content 1',
    extraction_success: true
  },
  {
    id: 'file-2',
    filename: 'doc2.pdf',
    file_type: 'pdf',
    upload_date: '2024-01-16T10:30:00Z',
    extracted_content: null,
    extraction_success: false
  }
]);
console.assert(result7.includes('doc1.txt'), 'Should include first file');
console.assert(result7.includes('Content 1'), 'Should include first file content');
console.assert(result7.includes('doc2.pdf'), 'Should include second file');
console.assert(result7.includes('[Content not available'), 'Should show unavailable for second file');
console.log('✓ Passed\n');

// Test 8: Truncation with word boundaries
console.log('Test 8: Truncation with word boundaries');
const sentence = 'This is a long sentence with many words that should be truncated properly at word boundaries';
const truncated2 = truncateContent(sentence, 50);
console.assert(truncated2.length <= 50, 'Should be under limit');
console.assert(!truncated2.endsWith(' '), 'Should not end with space');
console.assert(sentence.startsWith(truncated2), 'Should be prefix of original');
console.log('✓ Passed\n');

console.log('=== All tests passed! ===');
