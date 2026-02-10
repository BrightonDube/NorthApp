/**
 * Unit Tests for Context Injection Module
 * 
 * Tests the context injection functionality including:
 * - Building prompt context with user context and file attachments
 * - Formatting file content with metadata
 * - Truncating content to fit token limits
 * - Filtering files for session-specific context
 * 
 * Feature: file-context-attachments
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 7.2, 7.3
 */

import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.177.0/testing/asserts.ts';
import {
  buildPromptContext,
  formatFileContent,
  truncateContent,
  filterSessionFiles,
  type UserContext,
  type FileAttachment,
} from '../context-injection.ts';

// Test data helpers
function createMockUserContext(category: string, content: string): UserContext {
  return { category, content };
}

function createMockFileAttachment(overrides?: Partial<FileAttachment>): FileAttachment {
  return {
    id: 'file-123',
    filename: 'test-document.pdf',
    file_type: 'pdf',
    upload_date: '2024-01-15T10:30:00Z',
    extracted_content: 'This is the extracted content from the file.',
    extraction_success: true,
    ...overrides,
  };
}

Deno.test('buildPromptContext - includes coach system prompt', () => {
  const coachPrompt = 'You are a helpful AI coach.';
  const contexts: UserContext[] = [];
  
  const result = buildPromptContext(coachPrompt, contexts);
  
  assertStringIncludes(result, coachPrompt);
});

Deno.test('buildPromptContext - includes user context categories', () => {
  const coachPrompt = 'You are a helpful AI coach.';
  const contexts: UserContext[] = [
    createMockUserContext('values', 'Be honest'),
    createMockUserContext('goals', 'Learn TypeScript'),
    createMockUserContext('projects', 'Build a web app'),
    createMockUserContext('constraints', 'Limited time'),
  ];
  
  const result = buildPromptContext(coachPrompt, contexts);
  
  assertStringIncludes(result, 'VALUES (Core principles):');
  assertStringIncludes(result, '- Be honest');
  assertStringIncludes(result, 'GOALS (Current objectives):');
  assertStringIncludes(result, '- Learn TypeScript');
  assertStringIncludes(result, 'PROJECTS (Active work):');
  assertStringIncludes(result, '- Build a web app');
  assertStringIncludes(result, 'CONSTRAINTS (Limitations):');
  assertStringIncludes(result, '- Limited time');
});

Deno.test('buildPromptContext - includes file attachments when provided', () => {
  const coachPrompt = 'You are a helpful AI coach.';
  const contexts: UserContext[] = [];
  const files: FileAttachment[] = [
    createMockFileAttachment({
      filename: 'resume.pdf',
      extracted_content: 'John Doe - Software Engineer',
    }),
  ];
  
  const result = buildPromptContext(coachPrompt, contexts, files);
  
  assertStringIncludes(result, 'FILE ATTACHMENTS');
  assertStringIncludes(result, 'resume.pdf');
  assertStringIncludes(result, 'John Doe - Software Engineer');
});

Deno.test('buildPromptContext - works without file attachments', () => {
  const coachPrompt = 'You are a helpful AI coach.';
  const contexts: UserContext[] = [
    createMockUserContext('values', 'Be honest'),
  ];
  
  const result = buildPromptContext(coachPrompt, contexts);
  
  assertStringIncludes(result, coachPrompt);
  assertStringIncludes(result, 'Be honest');
  assertEquals(result.includes('FILE ATTACHMENTS'), false);
});

Deno.test('formatFileContent - formats single file with metadata', () => {
  const files: FileAttachment[] = [
    createMockFileAttachment({
      filename: 'document.pdf',
      file_type: 'pdf',
      upload_date: '2024-01-15T10:30:00Z',
      extracted_content: 'File content here',
    }),
  ];
  
  const result = formatFileContent(files);
  
  assertStringIncludes(result, 'FILE ATTACHMENTS');
  assertStringIncludes(result, '--- FILE: document.pdf (PDF, uploaded Jan 15, 2024) ---');
  assertStringIncludes(result, 'File content here');
  assertStringIncludes(result, '--- END FILE ---');
});

Deno.test('formatFileContent - formats multiple files', () => {
  const files: FileAttachment[] = [
    createMockFileAttachment({
      filename: 'file1.txt',
      file_type: 'txt',
      extracted_content: 'Content 1',
    }),
    createMockFileAttachment({
      filename: 'file2.md',
      file_type: 'md',
      extracted_content: 'Content 2',
    }),
  ];
  
  const result = formatFileContent(files);
  
  assertStringIncludes(result, 'file1.txt');
  assertStringIncludes(result, 'Content 1');
  assertStringIncludes(result, 'file2.md');
  assertStringIncludes(result, 'Content 2');
});

Deno.test('formatFileContent - handles files without extracted content', () => {
  const files: FileAttachment[] = [
    createMockFileAttachment({
      filename: 'corrupted.pdf',
      extracted_content: null,
      extraction_success: false,
    }),
  ];
  
  const result = formatFileContent(files);
  
  assertStringIncludes(result, 'corrupted.pdf');
  assertStringIncludes(result, '[Content not available - file could not be processed]');
});

Deno.test('formatFileContent - returns empty string for empty array', () => {
  const result = formatFileContent([]);
  
  assertEquals(result, '');
});

Deno.test('formatFileContent - includes truncation notice for long content', () => {
  const longContent = 'a'.repeat(40000); // Exceeds default 32000 char limit
  const files: FileAttachment[] = [
    createMockFileAttachment({
      extracted_content: longContent,
    }),
  ];
  
  const result = formatFileContent(files);
  
  assertStringIncludes(result, '[Content truncated due to length');
});

Deno.test('truncateContent - returns content unchanged if under limit', () => {
  const content = 'Short content';
  const result = truncateContent(content, 1000);
  
  assertEquals(result, content);
});

Deno.test('truncateContent - truncates content exceeding limit', () => {
  const content = 'a'.repeat(1000);
  const result = truncateContent(content, 500);
  
  assertEquals(result.length <= 500, true);
});

Deno.test('truncateContent - truncates at word boundary', () => {
  const content = 'This is a long sentence with many words that should be truncated properly';
  const result = truncateContent(content, 30);
  
  // Should not end mid-word
  assertEquals(result.endsWith(' '), false);
  assertEquals(result.length <= 30, true);
});

Deno.test('truncateContent - handles content with no spaces', () => {
  const content = 'a'.repeat(1000);
  const result = truncateContent(content, 500);
  
  assertEquals(result.length, 500);
});

Deno.test('truncateContent - uses default max chars if not specified', () => {
  const content = 'a'.repeat(40000);
  const result = truncateContent(content);
  
  assertEquals(result.length <= 32000, true);
});

Deno.test('filterSessionFiles - returns all files when no session files specified', () => {
  const files: FileAttachment[] = [
    createMockFileAttachment({ id: 'file-1' }),
    createMockFileAttachment({ id: 'file-2' }),
    createMockFileAttachment({ id: 'file-3' }),
  ];
  
  const result = filterSessionFiles(files);
  
  assertEquals(result.length, 3);
  assertEquals(result, files);
});

Deno.test('filterSessionFiles - returns all files when session file IDs is empty array', () => {
  const files: FileAttachment[] = [
    createMockFileAttachment({ id: 'file-1' }),
    createMockFileAttachment({ id: 'file-2' }),
  ];
  
  const result = filterSessionFiles(files, []);
  
  assertEquals(result.length, 2);
  assertEquals(result, files);
});

Deno.test('filterSessionFiles - filters to session-specific files', () => {
  const files: FileAttachment[] = [
    createMockFileAttachment({ id: 'file-1', filename: 'file1.pdf' }),
    createMockFileAttachment({ id: 'file-2', filename: 'file2.pdf' }),
    createMockFileAttachment({ id: 'file-3', filename: 'file3.pdf' }),
  ];
  
  const result = filterSessionFiles(files, ['file-1', 'file-3']);
  
  assertEquals(result.length, 2);
  assertEquals(result[0].id, 'file-1');
  assertEquals(result[1].id, 'file-3');
});

Deno.test('filterSessionFiles - returns empty array when no files match session', () => {
  const files: FileAttachment[] = [
    createMockFileAttachment({ id: 'file-1' }),
    createMockFileAttachment({ id: 'file-2' }),
  ];
  
  const result = filterSessionFiles(files, ['file-99']);
  
  assertEquals(result.length, 0);
});

Deno.test('integration - complete prompt with context and files', () => {
  const coachPrompt = 'You are a career coach.';
  const contexts: UserContext[] = [
    createMockUserContext('values', 'Work-life balance'),
    createMockUserContext('goals', 'Get promoted'),
  ];
  const files: FileAttachment[] = [
    createMockFileAttachment({
      filename: 'resume.pdf',
      extracted_content: 'John Doe - 5 years experience',
    }),
  ];
  
  const result = buildPromptContext(coachPrompt, contexts, files);
  
  // Verify all components are present
  assertStringIncludes(result, 'You are a career coach.');
  assertStringIncludes(result, 'USER CONTEXT');
  assertStringIncludes(result, 'Work-life balance');
  assertStringIncludes(result, 'Get promoted');
  assertStringIncludes(result, 'FILE ATTACHMENTS');
  assertStringIncludes(result, 'resume.pdf');
  assertStringIncludes(result, 'John Doe - 5 years experience');
});

Deno.test('integration - handles empty context and no files', () => {
  const coachPrompt = 'You are a helpful coach.';
  const contexts: UserContext[] = [];
  
  const result = buildPromptContext(coachPrompt, contexts);
  
  assertStringIncludes(result, coachPrompt);
  assertStringIncludes(result, 'Not specified');
  assertEquals(result.includes('FILE ATTACHMENTS'), false);
});
