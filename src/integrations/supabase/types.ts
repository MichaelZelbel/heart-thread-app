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
      ai_allowance_periods: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          period_end: string
          period_start: string
          source: string | null
          tokens_granted: number | null
          tokens_used: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          period_end: string
          period_start: string
          source?: string | null
          tokens_granted?: number | null
          tokens_used?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          period_end?: string
          period_start?: string
          source?: string | null
          tokens_granted?: number | null
          tokens_used?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_credit_settings: {
        Row: {
          description: string | null
          key: string
          value_int: number
        }
        Insert: {
          description?: string | null
          key: string
          value_int: number
        }
        Update: {
          description?: string | null
          key?: string
          value_int?: number
        }
        Relationships: []
      }
      blog_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          parent_id: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          parent_id?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_media: {
        Row: {
          alt_text: string | null
          created_at: string
          file_size: number | null
          height: number | null
          id: string
          mime_type: string | null
          updated_at: string
          uploaded_by: string | null
          url: string
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          file_size?: number | null
          height?: number | null
          id?: string
          mime_type?: string | null
          updated_at?: string
          uploaded_by?: string | null
          url: string
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          file_size?: number | null
          height?: number | null
          id?: string
          mime_type?: string | null
          updated_at?: string
          uploaded_by?: string | null
          url?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_media_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_post_categories: {
        Row: {
          category_id: string
          created_at: string
          id: string
          post_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          post_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_post_categories_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_post_revisions: {
        Row: {
          content: string | null
          created_at: string
          created_by: string | null
          excerpt: string | null
          id: string
          post_id: string
          revision_number: number
          title: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          id?: string
          post_id: string
          revision_number: number
          title: string
        }
        Update: {
          content?: string | null
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          id?: string
          post_id?: string
          revision_number?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_revisions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_post_revisions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_post_tags: {
        Row: {
          created_at: string
          id: string
          post_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_tags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_post_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "blog_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_id: string | null
          content: string | null
          created_at: string
          excerpt: string | null
          featured_image_id: string | null
          id: string
          og_image_url: string | null
          published_at: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: Database["public"]["Enums"]["blog_post_status"]
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          content?: string | null
          created_at?: string
          excerpt?: string | null
          featured_image_id?: string | null
          id?: string
          og_image_url?: string | null
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          status?: Database["public"]["Enums"]["blog_post_status"]
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          content?: string | null
          created_at?: string
          excerpt?: string | null
          featured_image_id?: string | null
          id?: string
          og_image_url?: string | null
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["blog_post_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_posts_featured_image_id_fkey"
            columns: ["featured_image_id"]
            isOneToOne: false
            referencedRelation: "blog_media"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_tags: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
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
          event_id: string | null
          id: string
          moment_id: string | null
          notification_date: string
          notified_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          id?: string
          moment_id?: string | null
          notification_date: string
          notified_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string | null
          id?: string
          moment_id?: string | null
          notification_date?: string
          notified_at?: string
          user_id?: string
        }
        Relationships: []
      }
      llm_usage_events: {
        Row: {
          completion_tokens: number | null
          created_at: string | null
          credits_charged: number | null
          feature: string | null
          id: string
          idempotency_key: string
          metadata: Json | null
          model: string | null
          prompt_tokens: number | null
          provider: string | null
          total_tokens: number | null
          user_id: string
        }
        Insert: {
          completion_tokens?: number | null
          created_at?: string | null
          credits_charged?: number | null
          feature?: string | null
          id?: string
          idempotency_key: string
          metadata?: Json | null
          model?: string | null
          prompt_tokens?: number | null
          provider?: string | null
          total_tokens?: number | null
          user_id: string
        }
        Update: {
          completion_tokens?: number | null
          created_at?: string | null
          credits_charged?: number | null
          feature?: string | null
          id?: string
          idempotency_key?: string
          metadata?: Json | null
          model?: string | null
          prompt_tokens?: number | null
          provider?: string | null
          total_tokens?: number | null
          user_id?: string
        }
        Relationships: []
      }
      moments: {
        Row: {
          attachments: Json | null
          created_at: string
          deleted_at: string | null
          description: string | null
          event_type: string | null
          happened_at: string | null
          id: string
          impact_level: number
          is_celebrated_annually: boolean
          moment_date: string
          moment_uid: string
          partner_ids: string[] | null
          photo_url: string | null
          source: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attachments?: Json | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          event_type?: string | null
          happened_at?: string | null
          id?: string
          impact_level?: number
          is_celebrated_annually?: boolean
          moment_date: string
          moment_uid?: string
          partner_ids?: string[] | null
          photo_url?: string | null
          source?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attachments?: Json | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          event_type?: string | null
          happened_at?: string | null
          id?: string
          impact_level?: number
          is_celebrated_annually?: boolean
          moment_date?: string
          moment_uid?: string
          partner_ids?: string[] | null
          photo_url?: string | null
          source?: string | null
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
          merged_into_person_id: string | null
          message_coach_custom_tone: string | null
          message_coach_notes: string | null
          message_coach_preset_tone: string | null
          message_coach_transcript: string | null
          message_coach_updated_at: string | null
          message_coach_use_default_tone: boolean | null
          name: string
          notes: string | null
          person_uid: string
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
          merged_into_person_id?: string | null
          message_coach_custom_tone?: string | null
          message_coach_notes?: string | null
          message_coach_preset_tone?: string | null
          message_coach_transcript?: string | null
          message_coach_updated_at?: string | null
          message_coach_use_default_tone?: boolean | null
          name: string
          notes?: string | null
          person_uid?: string
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
          merged_into_person_id?: string | null
          message_coach_custom_tone?: string | null
          message_coach_notes?: string | null
          message_coach_preset_tone?: string | null
          message_coach_transcript?: string | null
          message_coach_updated_at?: string | null
          message_coach_use_default_tone?: boolean | null
          name?: string
          notes?: string | null
          person_uid?: string
          photo_url?: string | null
          relationship_type?: string | null
          social_media?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partners_merged_into_person_id_fkey"
            columns: ["merged_into_person_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
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
      sync_conflicts: {
        Row: {
          conflict_type: string | null
          connection_id: string
          created_at: string
          entity_type: string
          entity_uid: string
          id: string
          local_payload: Json
          remote_payload: Json
          resolution: string | null
          resolved_at: string | null
          suggested_resolution: string | null
          user_id: string
        }
        Insert: {
          conflict_type?: string | null
          connection_id: string
          created_at?: string
          entity_type: string
          entity_uid: string
          id?: string
          local_payload: Json
          remote_payload: Json
          resolution?: string | null
          resolved_at?: string | null
          suggested_resolution?: string | null
          user_id: string
        }
        Update: {
          conflict_type?: string | null
          connection_id?: string
          created_at?: string
          entity_type?: string
          entity_uid?: string
          id?: string
          local_payload?: Json
          remote_payload?: Json
          resolution?: string | null
          resolved_at?: string | null
          suggested_resolution?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_conflicts_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "sync_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_connections: {
        Row: {
          created_at: string
          id: string
          remote_app: string
          remote_base_url: string | null
          shared_secret_hash: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          remote_app: string
          remote_base_url?: string | null
          shared_secret_hash: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          remote_app?: string
          remote_base_url?: string | null
          shared_secret_hash?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sync_cursors: {
        Row: {
          connection_id: string
          id: string
          last_pulled_outbox_id: number
          last_pushed_outbox_id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          connection_id: string
          id?: string
          last_pulled_outbox_id?: number
          last_pushed_outbox_id?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          connection_id?: string
          id?: string
          last_pulled_outbox_id?: number
          last_pushed_outbox_id?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_cursors_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "sync_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_merge_log: {
        Row: {
          created_at: string
          id: string
          kept_person_id: string
          merged_links_snapshot: Json
          merged_moments_snapshot: Json
          merged_person_id: string
          merged_person_snapshot: Json
          undone_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kept_person_id: string
          merged_links_snapshot?: Json
          merged_moments_snapshot?: Json
          merged_person_id: string
          merged_person_snapshot?: Json
          undone_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kept_person_id?: string
          merged_links_snapshot?: Json
          merged_moments_snapshot?: Json
          merged_person_id?: string
          merged_person_snapshot?: Json
          undone_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_merge_log_kept_person_id_fkey"
            columns: ["kept_person_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_merge_log_merged_person_id_fkey"
            columns: ["merged_person_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_outbox: {
        Row: {
          connection_id: string
          delivered_at: string | null
          delivery_attempts: number
          entity_type: string
          entity_uid: string
          id: number
          occurred_at: string
          operation: string
          payload: Json
          user_id: string
        }
        Insert: {
          connection_id: string
          delivered_at?: string | null
          delivery_attempts?: number
          entity_type: string
          entity_uid: string
          id?: number
          occurred_at?: string
          operation: string
          payload?: Json
          user_id: string
        }
        Update: {
          connection_id?: string
          delivered_at?: string | null
          delivery_attempts?: number
          entity_type?: string
          entity_uid?: string
          id?: number
          occurred_at?: string
          operation?: string
          payload?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_outbox_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "sync_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_pairing_codes: {
        Row: {
          code: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          user_id: string
        }
        Insert: {
          code: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          user_id: string
        }
        Update: {
          code?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      sync_person_candidates: {
        Row: {
          confidence: number | null
          connection_id: string
          created_at: string
          id: string
          local_person_id: string | null
          reasons: string[] | null
          remote_person_name: string
          remote_person_uid: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence?: number | null
          connection_id: string
          created_at?: string
          id?: string
          local_person_id?: string | null
          reasons?: string[] | null
          remote_person_name: string
          remote_person_uid: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence?: number | null
          connection_id?: string
          created_at?: string
          id?: string
          local_person_id?: string | null
          reasons?: string[] | null
          remote_person_name?: string
          remote_person_uid?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_person_candidates_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "sync_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_person_candidates_local_person_id_fkey"
            columns: ["local_person_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_person_links: {
        Row: {
          connection_id: string
          created_at: string
          id: string
          is_enabled: boolean
          link_status: Database["public"]["Enums"]["sync_link_status"]
          local_person_id: string
          remote_person_uid: string
          updated_at: string
          user_id: string
        }
        Insert: {
          connection_id: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          link_status?: Database["public"]["Enums"]["sync_link_status"]
          local_person_id: string
          remote_person_uid: string
          updated_at?: string
          user_id: string
        }
        Update: {
          connection_id?: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          link_status?: Database["public"]["Enums"]["sync_link_status"]
          local_person_id?: string
          remote_person_uid?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_person_links_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "sync_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_person_links_local_person_id_fkey"
            columns: ["local_person_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_remote_people_cache: {
        Row: {
          connection_id: string
          fetched_at: string
          id: string
          remote_name: string
          remote_person_uid: string
          remote_relationship_label: string | null
          user_id: string
        }
        Insert: {
          connection_id: string
          fetched_at?: string
          id?: string
          remote_name: string
          remote_person_uid: string
          remote_relationship_label?: string | null
          user_id: string
        }
        Update: {
          connection_id?: string
          fetched_at?: string
          id?: string
          remote_name?: string
          remote_person_uid?: string
          remote_relationship_label?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_remote_people_cache_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "sync_connections"
            referencedColumns: ["id"]
          },
        ]
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
      v_ai_allowance_current: {
        Row: {
          created_at: string | null
          credits_granted: number | null
          credits_used: number | null
          id: string | null
          metadata: Json | null
          period_end: string | null
          period_start: string | null
          remaining_credits: number | null
          remaining_tokens: number | null
          source: string | null
          tokens_granted: number | null
          tokens_per_credit: number | null
          tokens_used: number | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: []
      }
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
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "free" | "pro" | "admin" | "pro_gift"
      blog_post_status: "draft" | "published" | "scheduled"
      sync_link_status: "linked" | "pending" | "excluded" | "conflict"
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
      blog_post_status: ["draft", "published", "scheduled"],
      sync_link_status: ["linked", "pending", "excluded", "conflict"],
    },
  },
} as const
