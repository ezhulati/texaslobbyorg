export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          role: 'searcher' | 'lobbyist' | 'admin'
          full_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          role?: 'searcher' | 'lobbyist' | 'admin'
          full_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: 'searcher' | 'lobbyist' | 'admin'
          full_name?: string | null
          updated_at?: string
        }
      }
      cities: {
        Row: {
          id: string
          name: string
          slug: string
          county: string | null
          population: number | null
          meta_title: string | null
          meta_description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          county?: string | null
          population?: number | null
          meta_title?: string | null
          meta_description?: string | null
          created_at?: string
        }
        Update: {
          name?: string
          slug?: string
          county?: string | null
          population?: number | null
          meta_title?: string | null
          meta_description?: string | null
        }
      }
      subject_areas: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          icon: string | null
          meta_title: string | null
          meta_description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          icon?: string | null
          meta_title?: string | null
          meta_description?: string | null
          created_at?: string
        }
        Update: {
          name?: string
          slug?: string
          description?: string | null
          icon?: string | null
          meta_title?: string | null
          meta_description?: string | null
        }
      }
      lobbyists: {
        Row: {
          id: string
          user_id: string | null
          first_name: string
          last_name: string
          slug: string
          email: string | null
          phone: string | null
          website: string | null
          bio: string | null
          profile_image_url: string | null
          years_experience: number | null
          cities: string[]
          subject_areas: string[]
          subscription_tier: 'free' | 'premium' | 'featured'
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_started_at: string | null
          subscription_ends_at: string | null
          is_claimed: boolean
          is_active: boolean
          view_count: number
          featured_order: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          first_name: string
          last_name: string
          slug: string
          email?: string | null
          phone?: string | null
          website?: string | null
          bio?: string | null
          profile_image_url?: string | null
          years_experience?: number | null
          cities?: string[]
          subject_areas?: string[]
          subscription_tier?: 'free' | 'premium' | 'featured'
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_started_at?: string | null
          subscription_ends_at?: string | null
          is_claimed?: boolean
          is_active?: boolean
          view_count?: number
          featured_order?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string | null
          first_name?: string
          last_name?: string
          slug?: string
          email?: string | null
          phone?: string | null
          website?: string | null
          bio?: string | null
          profile_image_url?: string | null
          years_experience?: number | null
          cities?: string[]
          subject_areas?: string[]
          subscription_tier?: 'free' | 'premium' | 'featured'
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_started_at?: string | null
          subscription_ends_at?: string | null
          is_claimed?: boolean
          is_active?: boolean
          view_count?: number
          featured_order?: number | null
          updated_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          lobbyist_id: string
          name: string
          description: string | null
          year_started: number | null
          year_ended: number | null
          is_current: boolean
          created_at: string
        }
        Insert: {
          id?: string
          lobbyist_id: string
          name: string
          description?: string | null
          year_started?: number | null
          year_ended?: number | null
          is_current?: boolean
          created_at?: string
        }
        Update: {
          lobbyist_id?: string
          name?: string
          description?: string | null
          year_started?: number | null
          year_ended?: number | null
          is_current?: boolean
        }
      }
      favorites: {
        Row: {
          id: string
          user_id: string
          lobbyist_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          lobbyist_id: string
          created_at?: string
        }
        Update: {
          user_id?: string
          lobbyist_id?: string
        }
      }
      page_views: {
        Row: {
          id: string
          lobbyist_id: string
          user_id: string | null
          session_id: string | null
          referrer: string | null
          created_at: string
        }
        Insert: {
          id?: string
          lobbyist_id: string
          user_id?: string | null
          session_id?: string | null
          referrer?: string | null
          created_at?: string
        }
        Update: {
          lobbyist_id?: string
          user_id?: string | null
          session_id?: string | null
          referrer?: string | null
        }
      }
    }
    Views: {}
    Functions: {
      search_lobbyists: {
        Args: {
          search_query?: string | null
          city_filters?: string[] | null
          subject_filters?: string[] | null
          tier_filter?: 'free' | 'premium' | 'featured' | null
          limit_count?: number
          offset_count?: number
        }
        Returns: {
          id: string
          first_name: string
          last_name: string
          slug: string
          email: string | null
          phone: string | null
          bio: string | null
          profile_image_url: string | null
          cities: string[]
          subject_areas: string[]
          subscription_tier: 'free' | 'premium' | 'featured'
          view_count: number
          rank: number
        }[]
      }
      increment_view_count: {
        Args: {
          lobbyist_id: string
        }
        Returns: void
      }
    }
    Enums: {
      subscription_tier: 'free' | 'premium' | 'featured'
      user_role: 'searcher' | 'lobbyist' | 'admin'
    }
  }
}
