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
      admin_settings: {
        Row: {
          ai_model: string
          ai_provider: string
          anthropic_api_key: string | null
          created_at: string
          google_api_key: string | null
          id: string
          openai_api_key: string | null
          persona_ai_model: string
          persona_ai_provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_model?: string
          ai_provider?: string
          anthropic_api_key?: string | null
          created_at?: string
          google_api_key?: string | null
          id?: string
          openai_api_key?: string | null
          persona_ai_model?: string
          persona_ai_provider?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_model?: string
          ai_provider?: string
          anthropic_api_key?: string | null
          created_at?: string
          google_api_key?: string | null
          id?: string
          openai_api_key?: string | null
          persona_ai_model?: string
          persona_ai_provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          ended_at: string | null
          id: string
          persona_id: string
          session_summary: string | null
          started_at: string
          status: string
          user_id: string | null
        }
        Insert: {
          ended_at?: string | null
          id?: string
          persona_id: string
          session_summary?: string | null
          started_at?: string
          status?: string
          user_id?: string | null
        }
        Update: {
          ended_at?: string | null
          id?: string
          persona_id?: string
          session_summary?: string | null
          started_at?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_rooms: {
        Row: {
          created_at: string
          created_by: string | null
          ended_at: string | null
          id: string
          name: string
          purpose: string
          scenario: string
          status: string
          user_role: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ended_at?: string | null
          id?: string
          name: string
          purpose?: string
          scenario?: string
          status?: string
          user_role?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ended_at?: string | null
          id?: string
          name?: string
          purpose?: string
          scenario?: string
          status?: string
          user_role?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          inner_thought: string | null
          metadata: Json | null
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          inner_thought?: string | null
          metadata?: Json | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          inner_thought?: string | null
          metadata?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      personas: {
        Row: {
          backstory: Json
          created_at: string
          created_by: string | null
          generation_prompt: string
          id: string
          identity: Json
          last_interaction_at: string | null
          memory: Json
          portrait_prompt: string | null
          portrait_url: string | null
          psychology: Json
          status: string
          testing_purpose: string
          total_interactions: number
          updated_at: string
          variance_level: number
        }
        Insert: {
          backstory?: Json
          created_at?: string
          created_by?: string | null
          generation_prompt?: string
          id?: string
          identity?: Json
          last_interaction_at?: string | null
          memory?: Json
          portrait_prompt?: string | null
          portrait_url?: string | null
          psychology?: Json
          status?: string
          testing_purpose?: string
          total_interactions?: number
          updated_at?: string
          variance_level?: number
        }
        Update: {
          backstory?: Json
          created_at?: string
          created_by?: string | null
          generation_prompt?: string
          id?: string
          identity?: Json
          last_interaction_at?: string | null
          memory?: Json
          portrait_prompt?: string | null
          portrait_url?: string | null
          psychology?: Json
          status?: string
          testing_purpose?: string
          total_interactions?: number
          updated_at?: string
          variance_level?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      room_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          inner_thought: string | null
          persona_id: string | null
          role: string
          room_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          inner_thought?: string | null
          persona_id?: string | null
          role?: string
          room_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          inner_thought?: string | null
          persona_id?: string | null
          role?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_messages_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "room_personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "meeting_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_participants: {
        Row: {
          admitted_at: string
          id: string
          persona_id: string
          removed_at: string | null
          room_id: string
        }
        Insert: {
          admitted_at?: string
          id?: string
          persona_id: string
          removed_at?: string | null
          room_id: string
        }
        Update: {
          admitted_at?: string
          id?: string
          persona_id?: string
          removed_at?: string | null
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_participants_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "room_personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "meeting_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_personas: {
        Row: {
          backstory: Json
          created_at: string
          created_by: string | null
          id: string
          identity: Json
          memory: Json
          portrait_url: string | null
          psychology: Json
          source_export: Json | null
        }
        Insert: {
          backstory?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          identity?: Json
          memory?: Json
          portrait_url?: string | null
          psychology?: Json
          source_export?: Json | null
        }
        Update: {
          backstory?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          identity?: Json
          memory?: Json
          portrait_url?: string | null
          psychology?: Json
          source_export?: Json | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
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
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
