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
      account_deletion_requests: {
        Row: {
          cancellation_token: string
          completed_at: string | null
          deletion_reason: string | null
          id: string
          lobbyist_id: string | null
          requested_at: string
          scheduled_deletion_at: string
          status: string
          user_id: string
        }
        Insert: {
          cancellation_token?: string
          completed_at?: string | null
          deletion_reason?: string | null
          id?: string
          lobbyist_id?: string | null
          requested_at?: string
          scheduled_deletion_at: string
          status?: string
          user_id: string
        }
        Update: {
          cancellation_token?: string
          completed_at?: string | null
          deletion_reason?: string | null
          id?: string
          lobbyist_id?: string | null
          requested_at?: string
          scheduled_deletion_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_deletion_requests_lobbyist_id_fkey"
            columns: ["lobbyist_id"]
            isOneToOne: false
            referencedRelation: "lobbyists"
            referencedColumns: ["id"]
          },
        ]
      }
      account_deletions: {
        Row: {
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          data_export_url: string | null
          email: string
          id: string
          ip_address: unknown
          reason: string | null
          requested_at: string
          scheduled_deletion_date: string
          user_agent: string | null
          user_id: string
          user_role: string
        }
        Insert: {
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          data_export_url?: string | null
          email: string
          id?: string
          ip_address?: unknown
          reason?: string | null
          requested_at?: string
          scheduled_deletion_date: string
          user_agent?: string | null
          user_id: string
          user_role: string
        }
        Update: {
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          data_export_url?: string | null
          email?: string
          id?: string
          ip_address?: unknown
          reason?: string | null
          requested_at?: string
          scheduled_deletion_date?: string
          user_agent?: string | null
          user_id?: string
          user_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_deletions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "active_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_deletions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      account_merge_requests: {
        Row: {
          admin_notes: string | null
          duplicate_lobbyist_id: string
          id: string
          primary_lobbyist_id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string
          user_id: string
          verification_document_url: string
        }
        Insert: {
          admin_notes?: string | null
          duplicate_lobbyist_id: string
          id?: string
          primary_lobbyist_id: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          user_id: string
          verification_document_url: string
        }
        Update: {
          admin_notes?: string | null
          duplicate_lobbyist_id?: string
          id?: string
          primary_lobbyist_id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          user_id?: string
          verification_document_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_merge_requests_duplicate_lobbyist_id_fkey"
            columns: ["duplicate_lobbyist_id"]
            isOneToOne: false
            referencedRelation: "lobbyists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_merge_requests_primary_lobbyist_id_fkey"
            columns: ["primary_lobbyist_id"]
            isOneToOne: false
            referencedRelation: "lobbyists"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_audit_log: {
        Row: {
          action_description: string
          action_metadata: Json | null
          action_type: string
          admin_email: string
          admin_id: string
          created_at: string
          id: string
          ip_address: unknown
          target_user_email: string | null
          target_user_id: string | null
          user_agent: string | null
        }
        Insert: {
          action_description: string
          action_metadata?: Json | null
          action_type: string
          admin_email: string
          admin_id: string
          created_at?: string
          id?: string
          ip_address?: unknown
          target_user_email?: string | null
          target_user_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action_description?: string
          action_metadata?: Json | null
          action_type?: string
          admin_email?: string
          admin_id?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          target_user_email?: string | null
          target_user_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "active_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_audit_log_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "active_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_audit_log_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          county: string | null
          created_at: string
          id: string
          meta_description: string | null
          meta_title: string | null
          name: string
          population: number | null
          slug: string
        }
        Insert: {
          county?: string | null
          created_at?: string
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          name: string
          population?: number | null
          slug: string
        }
        Update: {
          county?: string | null
          created_at?: string
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          population?: number | null
          slug?: string
        }
        Relationships: []
      }
      client_contracts: {
        Row: {
          agency: string
          amount: number | null
          award_date: string | null
          client_name: string
          contract_title: string
          created_at: string | null
          id: string
          raw_data: Json | null
          source_dataset: string
        }
        Insert: {
          agency: string
          amount?: number | null
          award_date?: string | null
          client_name: string
          contract_title: string
          created_at?: string | null
          id?: string
          raw_data?: Json | null
          source_dataset: string
        }
        Update: {
          agency?: string
          amount?: number | null
          award_date?: string | null
          client_name?: string
          contract_title?: string
          created_at?: string | null
          id?: string
          raw_data?: Json | null
          source_dataset?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          created_at: string
          description: string | null
          entity_type: string | null
          id: string
          is_current: boolean
          jurisdiction: string | null
          legal_name: string | null
          lei_code: string | null
          lobbyist_id: string
          name: string
          opencorporates_url: string | null
          registered_address: string | null
          status: string | null
          year_ended: number | null
          year_started: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          entity_type?: string | null
          id?: string
          is_current?: boolean
          jurisdiction?: string | null
          legal_name?: string | null
          lei_code?: string | null
          lobbyist_id: string
          name: string
          opencorporates_url?: string | null
          registered_address?: string | null
          status?: string | null
          year_ended?: number | null
          year_started?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          entity_type?: string | null
          id?: string
          is_current?: boolean
          jurisdiction?: string | null
          legal_name?: string | null
          lei_code?: string | null
          lobbyist_id?: string
          name?: string
          opencorporates_url?: string | null
          registered_address?: string | null
          status?: string | null
          year_ended?: number | null
          year_started?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_lobbyist_id_fkey"
            columns: ["lobbyist_id"]
            isOneToOne: false
            referencedRelation: "lobbyists"
            referencedColumns: ["id"]
          },
        ]
      }
      enforcement_actions: {
        Row: {
          action_type: string
          created_at: string | null
          date_issued: string
          description: string
          fine_amount: number | null
          id: string
          lobbyist_id: string
          order_number: string | null
          pdf_url: string | null
          year: number
        }
        Insert: {
          action_type: string
          created_at?: string | null
          date_issued: string
          description: string
          fine_amount?: number | null
          id?: string
          lobbyist_id: string
          order_number?: string | null
          pdf_url?: string | null
          year: number
        }
        Update: {
          action_type?: string
          created_at?: string | null
          date_issued?: string
          description?: string
          fine_amount?: number | null
          id?: string
          lobbyist_id?: string
          order_number?: string | null
          pdf_url?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "enforcement_actions_lobbyist_id_fkey"
            columns: ["lobbyist_id"]
            isOneToOne: false
            referencedRelation: "lobbyists"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          lobbyist_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lobbyist_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lobbyist_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_lobbyist_id_fkey"
            columns: ["lobbyist_id"]
            isOneToOne: false
            referencedRelation: "lobbyists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "active_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      fraud_reports: {
        Row: {
          description: string
          evidence_urls: string[] | null
          id: string
          lobbyist_id: string
          report_type: string
          reported_at: string
          reported_by: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          description: string
          evidence_urls?: string[] | null
          id?: string
          lobbyist_id: string
          report_type: string
          reported_at?: string
          reported_by?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          description?: string
          evidence_urls?: string[] | null
          id?: string
          lobbyist_id?: string
          report_type?: string
          reported_at?: string
          reported_by?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "fraud_reports_lobbyist_id_fkey"
            columns: ["lobbyist_id"]
            isOneToOne: false
            referencedRelation: "lobbyists"
            referencedColumns: ["id"]
          },
        ]
      }
      impersonation_sessions: {
        Row: {
          admin_email: string
          admin_id: string
          created_at: string
          ended_at: string | null
          id: string
          is_active: boolean
          reason: string
          session_token: string
          started_at: string
          target_user_email: string
          target_user_id: string
          updated_at: string
        }
        Insert: {
          admin_email: string
          admin_id: string
          created_at?: string
          ended_at?: string | null
          id?: string
          is_active?: boolean
          reason: string
          session_token: string
          started_at?: string
          target_user_email: string
          target_user_id: string
          updated_at?: string
        }
        Update: {
          admin_email?: string
          admin_id?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          is_active?: boolean
          reason?: string
          session_token?: string
          started_at?: string
          target_user_email?: string
          target_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "impersonation_sessions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "active_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impersonation_sessions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impersonation_sessions_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "active_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impersonation_sessions_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      lobbyists: {
        Row: {
          bio: string | null
          cities: string[] | null
          claimed_at: string | null
          claimed_by: string | null
          created_at: string
          deleted_at: string | null
          deletion_scheduled_for: string | null
          email: string | null
          enforcement_actions_count: number | null
          featured_order: number | null
          first_name: string
          has_enforcement_history: boolean | null
          id: string
          id_verification_url: string | null
          is_active: boolean
          is_claimed: boolean
          is_pending: boolean
          is_rejected: boolean | null
          is_verified: boolean | null
          last_enforcement_year: number | null
          last_media_mention_date: string | null
          last_name: string
          last_resubmission_at: string | null
          linkedin_url: string | null
          media_mentions_count: number | null
          media_mentions_last_30d: number | null
          municipal_activity_cities: string[] | null
          onboarding_completed: boolean
          onboarding_completed_at: string | null
          onboarding_step: number | null
          pending_reason: string | null
          phone: string | null
          photo_url: string | null
          profile_image_url: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_category:
            | Database["public"]["Enums"]["rejection_category"]
            | null
          rejection_count: number | null
          rejection_reason: string | null
          search_vector: unknown
          slug: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subject_areas: string[] | null
          subscription_ends_at: string | null
          subscription_started_at: string | null
          subscription_status:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
          user_id: string | null
          view_count: number
          website: string | null
          years_experience: number | null
        }
        Insert: {
          bio?: string | null
          cities?: string[] | null
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          deleted_at?: string | null
          deletion_scheduled_for?: string | null
          email?: string | null
          enforcement_actions_count?: number | null
          featured_order?: number | null
          first_name: string
          has_enforcement_history?: boolean | null
          id?: string
          id_verification_url?: string | null
          is_active?: boolean
          is_claimed?: boolean
          is_pending?: boolean
          is_rejected?: boolean | null
          is_verified?: boolean | null
          last_enforcement_year?: number | null
          last_media_mention_date?: string | null
          last_name: string
          last_resubmission_at?: string | null
          linkedin_url?: string | null
          media_mentions_count?: number | null
          media_mentions_last_30d?: number | null
          municipal_activity_cities?: string[] | null
          onboarding_completed?: boolean
          onboarding_completed_at?: string | null
          onboarding_step?: number | null
          pending_reason?: string | null
          phone?: string | null
          photo_url?: string | null
          profile_image_url?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_category?:
            | Database["public"]["Enums"]["rejection_category"]
            | null
          rejection_count?: number | null
          rejection_reason?: string | null
          search_vector?: unknown
          slug: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subject_areas?: string[] | null
          subscription_ends_at?: string | null
          subscription_started_at?: string | null
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id?: string | null
          view_count?: number
          website?: string | null
          years_experience?: number | null
        }
        Update: {
          bio?: string | null
          cities?: string[] | null
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          deleted_at?: string | null
          deletion_scheduled_for?: string | null
          email?: string | null
          enforcement_actions_count?: number | null
          featured_order?: number | null
          first_name?: string
          has_enforcement_history?: boolean | null
          id?: string
          id_verification_url?: string | null
          is_active?: boolean
          is_claimed?: boolean
          is_pending?: boolean
          is_rejected?: boolean | null
          is_verified?: boolean | null
          last_enforcement_year?: number | null
          last_media_mention_date?: string | null
          last_name?: string
          last_resubmission_at?: string | null
          linkedin_url?: string | null
          media_mentions_count?: number | null
          media_mentions_last_30d?: number | null
          municipal_activity_cities?: string[] | null
          onboarding_completed?: boolean
          onboarding_completed_at?: string | null
          onboarding_step?: number | null
          pending_reason?: string | null
          phone?: string | null
          photo_url?: string | null
          profile_image_url?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_category?:
            | Database["public"]["Enums"]["rejection_category"]
            | null
          rejection_count?: number | null
          rejection_reason?: string | null
          search_vector?: unknown
          slug?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subject_areas?: string[] | null
          subscription_ends_at?: string | null
          subscription_started_at?: string | null
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id?: string | null
          view_count?: number
          website?: string | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lobbyists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "active_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lobbyists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      media_mentions: {
        Row: {
          article_title: string
          article_url: string
          created_at: string | null
          id: string
          lobbyist_id: string
          published_date: string
          social_image_url: string | null
          source_country: string | null
          source_domain: string
        }
        Insert: {
          article_title: string
          article_url: string
          created_at?: string | null
          id?: string
          lobbyist_id: string
          published_date: string
          social_image_url?: string | null
          source_country?: string | null
          source_domain: string
        }
        Update: {
          article_title?: string
          article_url?: string
          created_at?: string | null
          id?: string
          lobbyist_id?: string
          published_date?: string
          social_image_url?: string | null
          source_country?: string | null
          source_domain?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_mentions_lobbyist_id_fkey"
            columns: ["lobbyist_id"]
            isOneToOne: false
            referencedRelation: "lobbyists"
            referencedColumns: ["id"]
          },
        ]
      }
      municipal_registrations: {
        Row: {
          city: string
          clients: string[] | null
          created_at: string | null
          id: string
          lobbyist_id: string
          status: string | null
          year: number
        }
        Insert: {
          city: string
          clients?: string[] | null
          created_at?: string | null
          id?: string
          lobbyist_id: string
          status?: string | null
          year: number
        }
        Update: {
          city?: string
          clients?: string[] | null
          created_at?: string | null
          id?: string
          lobbyist_id?: string
          status?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "municipal_registrations_lobbyist_id_fkey"
            columns: ["lobbyist_id"]
            isOneToOne: false
            referencedRelation: "lobbyists"
            referencedColumns: ["id"]
          },
        ]
      }
      page_views: {
        Row: {
          created_at: string
          id: string
          lobbyist_id: string
          referrer: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          lobbyist_id: string
          referrer?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          lobbyist_id?: string
          referrer?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "page_views_lobbyist_id_fkey"
            columns: ["lobbyist_id"]
            isOneToOne: false
            referencedRelation: "lobbyists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "page_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "active_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "page_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      political_fund_compensations: {
        Row: {
          amount: number | null
          contributor_name: string | null
          created_at: string
          fund_name: string
          id: string
          lobbyist_id: string
          updated_at: string
          year: number
        }
        Insert: {
          amount?: number | null
          contributor_name?: string | null
          created_at?: string
          fund_name: string
          id?: string
          lobbyist_id: string
          updated_at?: string
          year: number
        }
        Update: {
          amount?: number | null
          contributor_name?: string | null
          created_at?: string
          fund_name?: string
          id?: string
          lobbyist_id?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "political_fund_compensations_lobbyist_id_fkey"
            columns: ["lobbyist_id"]
            isOneToOne: false
            referencedRelation: "lobbyists"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_claim_requests: {
        Row: {
          admin_notes: string | null
          id: string
          lobbyist_id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string
          user_id: string
          verification_document_url: string
        }
        Insert: {
          admin_notes?: string | null
          id?: string
          lobbyist_id: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          user_id: string
          verification_document_url: string
        }
        Update: {
          admin_notes?: string | null
          id?: string
          lobbyist_id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          user_id?: string
          verification_document_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_claim_requests_lobbyist_id_fkey"
            columns: ["lobbyist_id"]
            isOneToOne: false
            referencedRelation: "lobbyists"
            referencedColumns: ["id"]
          },
        ]
      }
      role_upgrade_requests: {
        Row: {
          admin_notes: string | null
          current_role: Database["public"]["Enums"]["user_role"]
          id: string
          reason: string | null
          rejection_reason: string | null
          requested_role: Database["public"]["Enums"]["user_role"]
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          current_role: Database["public"]["Enums"]["user_role"]
          id?: string
          reason?: string | null
          rejection_reason?: string | null
          requested_role: Database["public"]["Enums"]["user_role"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          current_role?: Database["public"]["Enums"]["user_role"]
          id?: string
          reason?: string | null
          rejection_reason?: string | null
          requested_role?: Database["public"]["Enums"]["user_role"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subject_areas: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          meta_description: string | null
          meta_title: string | null
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      support_ticket_messages: {
        Row: {
          created_at: string | null
          id: string
          is_admin: boolean | null
          message: string
          ticket_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_admin?: boolean | null
          message: string
          ticket_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_admin?: boolean | null
          message?: string
          ticket_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_ticket_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "active_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_ticket_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          admin_notes: string | null
          assigned_to: string | null
          category: string
          closed_at: string | null
          contact_email: string
          contact_name: string
          created_at: string | null
          id: string
          lobbyist_id: string | null
          message: string
          priority: string
          resolution_notes: string | null
          resolved_at: string | null
          status: string
          subject: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          assigned_to?: string | null
          category: string
          closed_at?: string | null
          contact_email: string
          contact_name: string
          created_at?: string | null
          id?: string
          lobbyist_id?: string | null
          message: string
          priority?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string
          subject: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          assigned_to?: string | null
          category?: string
          closed_at?: string | null
          contact_email?: string
          contact_name?: string
          created_at?: string | null
          id?: string
          lobbyist_id?: string | null
          message?: string
          priority?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string
          subject?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "active_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_lobbyist_id_fkey"
            columns: ["lobbyist_id"]
            isOneToOne: false
            referencedRelation: "lobbyists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "active_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      testimonials: {
        Row: {
          client_company: string | null
          client_name: string
          client_title: string | null
          created_at: string | null
          display_order: number | null
          id: string
          is_approved: boolean | null
          is_featured: boolean | null
          lobbyist_id: string
          rating: number | null
          testimonial_text: string
          updated_at: string | null
        }
        Insert: {
          client_company?: string | null
          client_name: string
          client_title?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_approved?: boolean | null
          is_featured?: boolean | null
          lobbyist_id: string
          rating?: number | null
          testimonial_text: string
          updated_at?: string | null
        }
        Update: {
          client_company?: string | null
          client_name?: string
          client_title?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_approved?: boolean | null
          is_featured?: boolean | null
          lobbyist_id?: string
          rating?: number | null
          testimonial_text?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "testimonials_lobbyist_id_fkey"
            columns: ["lobbyist_id"]
            isOneToOne: false
            referencedRelation: "lobbyists"
            referencedColumns: ["id"]
          },
        ]
      }
      user_suspensions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          internal_notes: string | null
          is_active: boolean
          reason: string
          reason_category: string | null
          suspended_at: string
          suspended_by: string
          unsuspended_at: string | null
          unsuspended_by: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          internal_notes?: string | null
          is_active?: boolean
          reason: string
          reason_category?: string | null
          suspended_at?: string
          suspended_by: string
          unsuspended_at?: string | null
          unsuspended_by?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          internal_notes?: string | null
          is_active?: boolean
          reason?: string
          reason_category?: string | null
          suspended_at?: string
          suspended_by?: string
          unsuspended_at?: string | null
          unsuspended_by?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_suspensions_suspended_by_fkey"
            columns: ["suspended_by"]
            isOneToOne: false
            referencedRelation: "active_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_suspensions_suspended_by_fkey"
            columns: ["suspended_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_suspensions_unsuspended_by_fkey"
            columns: ["unsuspended_by"]
            isOneToOne: false
            referencedRelation: "active_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_suspensions_unsuspended_by_fkey"
            columns: ["unsuspended_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_suspensions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "active_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_suspensions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string
          deleted_at: string | null
          deletion_reason: string | null
          deletion_scheduled_for: string | null
          email: string
          first_name: string | null
          full_name: string | null
          id: string
          is_suspended: boolean
          last_name: string | null
          role: Database["public"]["Enums"]["user_role"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_current_period_end: string | null
          subscription_status:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          suspended_at: string | null
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          deleted_at?: string | null
          deletion_reason?: string | null
          deletion_scheduled_for?: string | null
          email: string
          first_name?: string | null
          full_name?: string | null
          id: string
          is_suspended?: boolean
          last_name?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_current_period_end?: string | null
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          suspended_at?: string | null
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          deleted_at?: string | null
          deletion_reason?: string | null
          deletion_scheduled_for?: string | null
          email?: string
          first_name?: string | null
          full_name?: string | null
          id?: string
          is_suspended?: boolean
          last_name?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_current_period_end?: string | null
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          suspended_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      active_users: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          deletion_reason: string | null
          deletion_scheduled_for: string | null
          email: string | null
          first_name: string | null
          full_name: string | null
          id: string | null
          last_name: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_current_period_end: string | null
          subscription_status:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          subscription_tier:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          deletion_reason?: string | null
          deletion_scheduled_for?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string | null
          last_name?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_current_period_end?: string | null
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          deletion_reason?: string | null
          deletion_scheduled_for?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string | null
          last_name?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_current_period_end?: string | null
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      anonymize_deleted_user: {
        Args: { user_uuid: string }
        Returns: undefined
      }
      auto_expire_suspensions: {
        Args: never
        Returns: {
          expired_count: number
          user_ids: string[]
        }[]
      }
      can_user_resubmit: { Args: { lobbyist_uuid: string }; Returns: boolean }
      cancel_account_deletion: { Args: { p_user_id: string }; Returns: Json }
      cleanup_expired_accounts: { Args: never; Returns: Json }
      count_pending_admin_tasks: { Args: never; Returns: Json }
      count_pending_claims: { Args: never; Returns: number }
      end_impersonation: { Args: { p_session_token: string }; Returns: boolean }
      find_potential_duplicates: {
        Args: { p_email?: string; p_first_name: string; p_last_name: string }
        Returns: {
          email: string
          first_name: string
          id: string
          last_name: string
          similarity_score: number
        }[]
      }
      get_active_impersonation: {
        Args: { p_session_token: string }
        Returns: {
          admin_email: string
          admin_id: string
          reason: string
          session_id: string
          started_at: string
          target_user_email: string
          target_user_id: string
        }[]
      }
      get_active_suspension: {
        Args: { p_user_id: string }
        Returns: {
          expires_at: string
          is_permanent: boolean
          reason: string
          reason_category: string
          suspended_at: string
          suspension_id: string
        }[]
      }
      get_lobbyist_enrichment_summary: {
        Args: { lobbyist_uuid: string }
        Returns: Json
      }
      get_rejection_stats: {
        Args: { days_back?: number }
        Returns: {
          avg_attempts: number
          category: Database["public"]["Enums"]["rejection_category"]
          count: number
        }[]
      }
      has_pending_claim: { Args: { lobbyist_uuid: string }; Returns: boolean }
      increment_view_count: {
        Args: { lobbyist_id: string }
        Returns: undefined
      }
      is_resubmission_cooldown_elapsed: {
        Args: { lobbyist_uuid: string }
        Returns: boolean
      }
      is_user_suspended: { Args: { p_user_id: string }; Returns: boolean }
      log_admin_action: {
        Args: {
          p_action_description: string
          p_action_type: string
          p_admin_id: string
          p_ip_address?: string
          p_metadata?: Json
          p_target_user_id?: string
          p_user_agent?: string
        }
        Returns: string
      }
      mark_user_for_deletion: {
        Args: {
          p_grace_period_days?: number
          p_reason?: string
          p_user_id: string
        }
        Returns: Json
      }
      permanently_delete_user: { Args: { p_user_id: string }; Returns: Json }
      search_lobbyists: {
        Args: {
          city_filters?: string[]
          client_filters?: string[]
          limit_count?: number
          offset_count?: number
          search_query?: string
          subject_filters?: string[]
          tier_filter?: Database["public"]["Enums"]["subscription_tier"]
        }
        Returns: {
          bio: string
          cities: string[]
          email: string
          first_name: string
          id: string
          last_name: string
          phone: string
          profile_image_url: string
          rank: number
          slug: string
          subject_areas: string[]
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          view_count: number
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      start_impersonation: {
        Args: { p_admin_id: string; p_reason: string; p_target_user_id: string }
        Returns: {
          session_id: string
          session_token: string
          target_email: string
        }[]
      }
    }
    Enums: {
      rejection_category:
        | "invalid_id"
        | "incomplete_info"
        | "duplicate_profile"
        | "not_registered_lobbyist"
        | "fake_profile"
        | "other"
      subscription_status:
        | "active"
        | "trialing"
        | "past_due"
        | "canceled"
        | "unpaid"
        | "incomplete"
        | "incomplete_expired"
      subscription_tier: "free" | "premium" | "featured"
      user_role: "searcher" | "lobbyist" | "admin"
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
      rejection_category: [
        "invalid_id",
        "incomplete_info",
        "duplicate_profile",
        "not_registered_lobbyist",
        "fake_profile",
        "other",
      ],
      subscription_status: [
        "active",
        "trialing",
        "past_due",
        "canceled",
        "unpaid",
        "incomplete",
        "incomplete_expired",
      ],
      subscription_tier: ["free", "premium", "featured"],
      user_role: ["searcher", "lobbyist", "admin"],
    },
  },
} as const
