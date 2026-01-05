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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      claire_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          partner_id: string | null
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          partner_id?: string | null
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          partner_id?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "claire_chat_messages_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      event_notifications: {
        Row: {
          created_at: string
          event_id: string
          id: string
          notification_date: string
          notified_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          notification_date: string
          notified_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          notification_date?: string
          notified_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          description: string | null
          event_date: string
          event_type: string | null
          id: string
          is_recurring: boolean
          partner_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_date: string
          event_type?: string | null
          id?: string
          is_recurring?: boolean
          partner_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_date?: string
          event_type?: string | null
          id?: string
          is_recurring?: boolean
          partner_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      moments: {
        Row: {
          created_at: string
          description: string | null
          id: string
          moment_date: string
          partner_ids: string[] | null
          photo_url: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          moment_date: string
          partner_ids?: string[] | null
          photo_url?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          moment_date?: string
          partner_ids?: string[] | null
          photo_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      partner_connections: {
        Row: {
          connected_partner_id: string
          created_at: string
          description: string | null
          id: string
          partner_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          connected_partner_id: string
          created_at?: string
          description?: string | null
          id?: string
          partner_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          connected_partner_id?: string
          created_at?: string
          description?: string | null
          id?: string
          partner_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_connections_connected_partner_id_fkey"
            columns: ["connected_partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_connections_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_dislikes: {
        Row: {
          created_at: string
          id: string
          item: string
          partner_id: string
          position: number | null
          tags: string[] | null
        }
        Insert: {
          created_at?: string
          id?: string
          item: string
          partner_id: string
          position?: number | null
          tags?: string[] | null
        }
        Update: {
          created_at?: string
          id?: string
          item?: string
          partner_id?: string
          position?: number | null
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_dislikes_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_likes: {
        Row: {
          created_at: string
          id: string
          item: string
          partner_id: string
          position: number | null
          tags: string[] | null
        }
        Insert: {
          created_at?: string
          id?: string
          item: string
          partner_id: string
          position?: number | null
          tags?: string[] | null
        }
        Update: {
          created_at?: string
          id?: string
          item?: string
          partner_id?: string
          position?: number | null
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_likes_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_nicknames: {
        Row: {
          created_at: string
          id: string
          nickname: string
          partner_id: string
          position: number
        }
        Insert: {
          created_at?: string
          id?: string
          nickname: string
          partner_id: string
          position?: number
        }
        Update: {
          created_at?: string
          id?: string
          nickname?: string
          partner_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "partner_nicknames_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_profile_details: {
        Row: {
          category: string
          created_at: string
          id: string
          label: string
          partner_id: string
          position: number
          updated_at: string
          user_id: string
          value: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          label: string
          partner_id: string
          position?: number
          updated_at?: string
          user_id: string
          value: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          label?: string
          partner_id?: string
          position?: number
          updated_at?: string
          user_id?: string
          value?: string
        }
        Relationships: []
      }
      partners: {
        Row: {
          archived: boolean
          birthdate: string | null
          chat_history: string | null
          country: string | null
          created_at: string
          display_order: number
          gender_identity: string | null
          id: string
          love_language_acts: number | null
          love_language_gifts: number | null
          love_language_physical: number | null
          love_language_quality: number | null
          love_language_words: number | null
          message_coach_custom_tone: string | null
          message_coach_notes: string | null
          message_coach_preset_tone: string | null
          message_coach_transcript: string | null
          message_coach_updated_at: string | null
          message_coach_use_default_tone: boolean | null
          name: string
          notes: string | null
          photo_url: string | null
          relationship_type: string | null
          social_media: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          birthdate?: string | null
          chat_history?: string | null
          country?: string | null
          created_at?: string
          display_order?: number
          gender_identity?: string | null
          id?: string
          love_language_acts?: number | null
          love_language_gifts?: number | null
          love_language_physical?: number | null
          love_language_quality?: number | null
          love_language_words?: number | null
          message_coach_custom_tone?: string | null
          message_coach_notes?: string | null
          message_coach_preset_tone?: string | null
          message_coach_transcript?: string | null
          message_coach_updated_at?: string | null
          message_coach_use_default_tone?: boolean | null
          name: string
          notes?: string | null
          photo_url?: string | null
          relationship_type?: string | null
          social_media?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean
          birthdate?: string | null
          chat_history?: string | null
          country?: string | null
          created_at?: string
          display_order?: number
          gender_identity?: string | null
          id?: string
          love_language_acts?: number | null
          love_language_gifts?: number | null
          love_language_physical?: number | null
          love_language_quality?: number | null
          love_language_words?: number | null
          message_coach_custom_tone?: string | null
          message_coach_notes?: string | null
          message_coach_preset_tone?: string | null
          message_coach_transcript?: string | null
          message_coach_updated_at?: string | null
          message_coach_use_default_tone?: boolean | null
          name?: string
          notes?: string | null
          photo_url?: string | null
          relationship_type?: string | null
          social_media?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          email: string | null
          email_notifications_enabled: boolean | null
          email_verification_pending: boolean | null
          id: string
          timezone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          email?: string | null
          email_notifications_enabled?: boolean | null
          email_verification_pending?: boolean | null
          id: string
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          email?: string | null
          email_notifications_enabled?: boolean | null
          email_verification_pending?: boolean | null
          id?: string
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
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
      assign_role_by_email: {
        Args: { _email: string; _role: Database["public"]["Enums"]["app_role"] }
        Returns: undefined
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "free" | "pro" | "admin" | "pro_gift"
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
      app_role: ["free", "pro", "admin", "pro_gift"],
    },
  },
} as const
