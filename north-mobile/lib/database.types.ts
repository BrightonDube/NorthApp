/**
 * Database Type Definitions
 * 
 * This file contains TypeScript type definitions for the Supabase database schema.
 * These types provide compile-time type safety for all database operations.
 * 
 * Generated based on the database schema defined in DATABASE_SCHEMA.md
 * Validates: Requirements 3.1, 6.1, 8.1, 8.2
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

/**
 * Database schema type definition
 * 
 * This type represents the complete database schema including all tables,
 * views, functions, and enums.
 */
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_context: {
        Row: {
          id: string
          user_id: string
          category: 'values' | 'goals' | 'projects' | 'constraints'
          content: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category: 'values' | 'goals' | 'projects' | 'constraints'
          content: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category?: 'values' | 'goals' | 'projects' | 'constraints'
          content?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_context_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      coaches: {
        Row: {
          id: string
          name: string
          icon: string
          system_prompt: string
          creator_id: string | null
          is_public: boolean
          category: string
          is_featured: boolean
          source_coach_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          icon: string
          system_prompt: string
          creator_id?: string | null
          is_public?: boolean
          category?: string
          is_featured?: boolean
          source_coach_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          icon?: string
          system_prompt?: string
          creator_id?: string | null
          is_public?: boolean
          category?: string
          is_featured?: boolean
          source_coach_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaches_creator_id_fkey"
            columns: ["creator_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaches_source_coach_id_fkey"
            columns: ["source_coach_id"]
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          }
        ]
      }
      chat_sessions: {
        Row: {
          id: string
          user_id: string
          coach_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          coach_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          coach_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_sessions_coach_id_fkey"
            columns: ["coach_id"]
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          }
        ]
      }
      messages: {
        Row: {
          id: string
          chat_session_id: string
          role: 'user' | 'assistant'
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          chat_session_id: string
          role: 'user' | 'assistant'
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          chat_session_id?: string
          role?: 'user' | 'assistant'
          content?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_session_id_fkey"
            columns: ["chat_session_id"]
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          }
        ]
      }
      file_attachments: {
        Row: {
          id: string
          user_id: string
          filename: string
          file_type: 'pdf' | 'txt' | 'md'
          file_size: number
          upload_date: string
          storage_path: string
          storage_url: string
          extracted_content: string | null
          extraction_success: boolean
          extraction_error: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          filename: string
          file_type: 'pdf' | 'txt' | 'md'
          file_size: number
          upload_date?: string
          storage_path: string
          storage_url: string
          extracted_content?: string | null
          extraction_success?: boolean
          extraction_error?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          filename?: string
          file_type?: 'pdf' | 'txt' | 'md'
          file_size?: number
          upload_date?: string
          storage_path?: string
          storage_url?: string
          extracted_content?: string | null
          extraction_success?: boolean
          extraction_error?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_attachments_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      session_file_selections: {
        Row: {
          id: string
          session_id: string
          file_id: string
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          file_id: string
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          file_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_file_selections_file_id_fkey"
            columns: ["file_id"]
            referencedRelation: "file_attachments"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

/**
 * Helper types for easier access to table types
 */
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Inserts<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updates<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

/**
 * Specific table row types for convenience
 */
export type Profile = Tables<'profiles'>
export type UserContext = Tables<'user_context'>
export type Coach = Tables<'coaches'>
export type ChatSession = Tables<'chat_sessions'>
export type Message = Tables<'messages'>
export type FileAttachment = Tables<'file_attachments'>
export type SessionFileSelection = Tables<'session_file_selections'>

/**
 * Specific table insert types for convenience
 */
export type ProfileInsert = Inserts<'profiles'>
export type UserContextInsert = Inserts<'user_context'>
export type CoachInsert = Inserts<'coaches'>
export type FileAttachmentInsert = Inserts<'file_attachments'>
export type SessionFileSelectionInsert = Inserts<'session_file_selections'>
export type ChatSessionInsert = Inserts<'chat_sessions'>
export type MessageInsert = Inserts<'messages'>

/**
 * Specific table update types for convenience
 */
export type ProfileUpdate = Updates<'profiles'>
export type UserContextUpdate = Updates<'user_context'>
export type CoachUpdate = Updates<'coaches'>
export type ChatSessionUpdate = Updates<'chat_sessions'>
export type MessageUpdate = Updates<'messages'>

/**
 * Enum types for type-safe category and role values
 */
export type ContextCategory = Database['public']['Tables']['user_context']['Row']['category']
export type MessageRole = Database['public']['Tables']['messages']['Row']['role']
