export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      check_ins: {
        Row: {
          id: string
          user_id: string
          mood: number
          energy: number
          priorities: string[]
          reflection: string
          gratitude: string
          type: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          mood: number
          energy: number
          priorities?: string[]
          reflection?: string
          gratitude?: string
          type: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          mood?: number
          energy?: number
          priorities?: string[]
          reflection?: string
          gratitude?: string
          type?: string
          created_at?: string
        }
        Relationships: []
      }
      action_items: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          linked_action_item_id: string | null
          report_id: string
          status: string
          text: string
          text_search: unknown
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          linked_action_item_id?: string | null
          report_id: string
          status?: string
          text: string
          text_search?: unknown
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          linked_action_item_id?: string | null
          report_id?: string
          status?: string
          text?: string
          text_search?: unknown
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_items_linked_action_item_id_fkey"
            columns: ["linked_action_item_id"]
            isOneToOne: false
            referencedRelation: "action_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_items_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "session_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          coach_id: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      coaches: {
        Row: {
          about: string | null
          category: string | null
          created_at: string
          creator_id: string | null
          expectations: string[] | null
          icon: string
          id: string
          is_featured: boolean | null
          is_public: boolean
          name: string
          source_coach_id: string | null
          system_prompt: string
          tags: string[] | null
          theme_color: string | null
          updated_at: string
        }
        Insert: {
          about?: string | null
          category?: string | null
          created_at?: string
          creator_id?: string | null
          expectations?: string[] | null
          icon: string
          id?: string
          is_featured?: boolean | null
          is_public?: boolean
          name: string
          source_coach_id?: string | null
          system_prompt: string
          tags?: string[] | null
          theme_color?: string | null
          updated_at?: string
        }
        Update: {
          about?: string | null
          category?: string | null
          created_at?: string
          creator_id?: string | null
          expectations?: string[] | null
          icon?: string
          id?: string
          is_featured?: boolean | null
          is_public?: boolean
          name?: string
          source_coach_id?: string | null
          system_prompt?: string
          tags?: string[] | null
          theme_color?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaches_source_coach_id_fkey"
            columns: ["source_coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_sessions: {
        Row: {
          coach_id: string
          created_at: string
          end_time: string | null
          id: string
          message_count: number
          start_time: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          end_time?: string | null
          id?: string
          message_count?: number
          start_time?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          end_time?: string | null
          id?: string
          message_count?: number
          start_time?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_sessions_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          category: string
          coach_id: string | null
          created_at: string
          deadline: string | null
          description: string | null
          difficulty: string
          id: string
          progress: number
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          coach_id?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          difficulty?: string
          id?: string
          progress?: number
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          coach_id?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          difficulty?: string
          id?: string
          progress?: number
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      llm_config: {
        Row: {
          id: string
          is_active: boolean
          max_tokens: number
          model: string
          provider: string
          temperature: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          is_active?: boolean
          max_tokens?: number
          model?: string
          provider?: string
          temperature?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          is_active?: boolean
          max_tokens?: number
          model?: string
          provider?: string
          temperature?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      memories: {
        Row: {
          category: string
          content: string
          created_at: string
          embedding: string | null
          id: string
          importance: string
          source_message_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          importance?: string
          source_message_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          importance?: string
          source_message_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memories_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          chat_session_id: string
          content: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          chat_session_id: string
          content: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          chat_session_id?: string
          content?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_session_id_fkey"
            columns: ["chat_session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          firmness_level: number
          google_calendar_tokens: Json | null
          id: string
          is_admin: boolean | null
          is_pro: boolean
          name: string
          updated_at: string
          voice_enabled: boolean
        }
        Insert: {
          created_at?: string
          firmness_level?: number
          google_calendar_tokens?: Json | null
          id: string
          is_admin?: boolean | null
          is_pro?: boolean
          name: string
          updated_at?: string
          voice_enabled?: boolean
        }
        Update: {
          created_at?: string
          firmness_level?: number
          google_calendar_tokens?: Json | null
          id?: string
          is_admin?: boolean | null
          is_pro?: boolean
          name?: string
          updated_at?: string
          voice_enabled?: boolean
        }
        Relationships: []
      }
      session_reports: {
        Row: {
          coach_id: string
          confidence: string
          created_at: string
          decisions: Json
          generated_at: string
          generation_attempts: number
          id: string
          key_insights: Json
          message_count: number
          session_date: string
          session_duration: number
          session_id: string
          summary: string
          topics: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          coach_id: string
          confidence?: string
          created_at?: string
          decisions?: Json
          generated_at?: string
          generation_attempts?: number
          id?: string
          key_insights?: Json
          message_count: number
          session_date: string
          session_duration: number
          session_id: string
          summary: string
          topics?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          coach_id?: string
          confidence?: string
          created_at?: string
          decisions?: Json
          generated_at?: string
          generation_attempts?: number
          id?: string
          key_insights?: Json
          message_count?: number
          session_date?: string
          session_duration?: number
          session_id?: string
          summary?: string
          topics?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_reports_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_reports_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "coaching_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      subtasks: {
        Row: {
          completed_at: string | null
          created_at: string
          due_date: string | null
          goal_id: string
          id: string
          order_index: number
          status: string
          title: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          goal_id: string
          id?: string
          order_index?: number
          status?: string
          title: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          goal_id?: string
          id?: string
          order_index?: number
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subtasks_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      user_context: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_xp: {
        Row: {
          current_streak: number
          level: number
          longest_streak: number
          total_xp: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number
          level?: number
          longest_streak?: number
          total_xp?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number
          level?: number
          longest_streak?: number
          total_xp?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      xp_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          user_id: string
          xp_amount: number
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          user_id: string
          xp_amount: number
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          user_id?: string
          xp_amount?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_inactive_users: {
        Args: { hours_threshold?: number }
        Returns: {
          user_id: string
        }[]
      }
      get_pending_action_items: {
        Args: { p_user_id: string }
        Returns: {
          created_at: string
          id: string
          report_id: string
          text: string
        }[]
      }
      get_recent_session_reports: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          id: string
          key_insights: Json
          session_date: string
          summary: string
          topics: string[]
        }[]
      }
      match_memories: {
        Args: {
          match_count?: number
          match_threshold?: number
          match_user_id: string
          query_embedding: string
        }
        Returns: {
          category: string
          content: string
          id: string
          importance: string
          similarity: number
        }[]
      }
      search_session_reports: {
        Args: { p_limit?: number; p_query: string; p_user_id: string }
        Returns: {
          id: string
          key_insights: Json
          rank: number
          session_date: string
          summary: string
          topics: string[]
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

// Convenience type aliases used by stores and screens
export type SessionReport = Tables<'session_reports'>;
export type ActionItem = Tables<'action_items'>;
export type ActionItemStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

