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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_settings: {
        Row: {
          created_at: string
          id: string
          notification_email: string | null
          notify_on_deal_interest: boolean
          notify_on_new_resident: boolean
          notify_on_new_supplier: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notification_email?: string | null
          notify_on_deal_interest?: boolean
          notify_on_new_resident?: boolean
          notify_on_new_supplier?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notification_email?: string | null
          notify_on_deal_interest?: boolean
          notify_on_new_resident?: boolean
          notify_on_new_supplier?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          deleted_at: string | null
          display_order: number
          icon: string
          id: string
          is_active: boolean
          is_deleted: boolean
          name: string
          stage: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          display_order?: number
          icon?: string
          id: string
          is_active?: boolean
          is_deleted?: boolean
          name: string
          stage?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          display_order?: number
          icon?: string
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          name?: string
          stage?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cities: {
        Row: {
          council_id: string | null
          created_at: string
          id: string
          name_he: string
          region_id: string
        }
        Insert: {
          council_id?: string | null
          created_at?: string
          id?: string
          name_he: string
          region_id: string
        }
        Update: {
          council_id?: string | null
          created_at?: string
          id?: string
          name_he?: string
          region_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cities_council_id_fkey"
            columns: ["council_id"]
            isOneToOne: false
            referencedRelation: "regional_councils"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cities_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      complaints: {
        Row: {
          admin_notes: string | null
          attachments: Json
          created_at: string
          deal_id: string | null
          description: string
          id: string
          issue_type: string
          status: string
          supplier_id: string | null
          updated_at: string
          user_id: string
          voucher_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          attachments?: Json
          created_at?: string
          deal_id?: string | null
          description: string
          id?: string
          issue_type: string
          status?: string
          supplier_id?: string | null
          updated_at?: string
          user_id: string
          voucher_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          attachments?: Json
          created_at?: string
          deal_id?: string | null
          description?: string
          id?: string
          issue_type?: string
          status?: string
          supplier_id?: string | null
          updated_at?: string
          user_id?: string
          voucher_id?: string | null
        }
        Relationships: []
      }
      deal_interests: {
        Row: {
          city: string | null
          conditional_status: string
          created_at: string
          deal_id: string
          deleted_at: string | null
          deposit_amount: number
          deposit_required: boolean
          deposit_status: string
          estimated_quantity: number | null
          full_name: string | null
          id: string
          is_deleted: boolean
          is_demo: boolean
          join_condition: string
          lead_status: string
          min_tier_locked: number | null
          notes: string | null
          phone: string | null
          project_name: string | null
          reapproval_deadline_at: string | null
          status: string
          terms_accepted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          city?: string | null
          conditional_status?: string
          created_at?: string
          deal_id: string
          deleted_at?: string | null
          deposit_amount?: number
          deposit_required?: boolean
          deposit_status?: string
          estimated_quantity?: number | null
          full_name?: string | null
          id?: string
          is_deleted?: boolean
          is_demo?: boolean
          join_condition?: string
          lead_status?: string
          min_tier_locked?: number | null
          notes?: string | null
          phone?: string | null
          project_name?: string | null
          reapproval_deadline_at?: string | null
          status?: string
          terms_accepted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string | null
          conditional_status?: string
          created_at?: string
          deal_id?: string
          deleted_at?: string | null
          deposit_amount?: number
          deposit_required?: boolean
          deposit_status?: string
          estimated_quantity?: number | null
          full_name?: string | null
          id?: string
          is_deleted?: boolean
          is_demo?: boolean
          join_condition?: string
          lead_status?: string
          min_tier_locked?: number | null
          notes?: string | null
          phone?: string | null
          project_name?: string | null
          reapproval_deadline_at?: string | null
          status?: string
          terms_accepted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      deals: {
        Row: {
          appointment_required: boolean
          auto_closed_at: string | null
          base_price: number | null
          category_id: string | null
          cover_image_url: string | null
          created_at: string
          deleted_at: string | null
          deposit_amount: number
          deposit_required: boolean
          description: string | null
          discount_percentage: number | null
          discounted_price: number | null
          ends_at: string | null
          gallery_images: Json
          highlights: Json
          id: string
          is_deleted: boolean
          is_demo: boolean
          join_deadline: string | null
          max_redemptions: number | null
          offer_terms: string | null
          offer_type: string
          original_price: number
          project_id: string | null
          redemption_deadline: string | null
          restrictions: string | null
          service_areas: string[]
          status: string
          supplier_commitment_accepted: boolean
          supplier_id: string
          target_participants: number | null
          tiers: Json
          title: string
          updated_at: string
          visibility_project_id: string | null
          visibility_type: string
        }
        Insert: {
          appointment_required?: boolean
          auto_closed_at?: string | null
          base_price?: number | null
          category_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          deleted_at?: string | null
          deposit_amount?: number
          deposit_required?: boolean
          description?: string | null
          discount_percentage?: number | null
          discounted_price?: number | null
          ends_at?: string | null
          gallery_images?: Json
          highlights?: Json
          id?: string
          is_deleted?: boolean
          is_demo?: boolean
          join_deadline?: string | null
          max_redemptions?: number | null
          offer_terms?: string | null
          offer_type?: string
          original_price?: number
          project_id?: string | null
          redemption_deadline?: string | null
          restrictions?: string | null
          service_areas?: string[]
          status?: string
          supplier_commitment_accepted?: boolean
          supplier_id: string
          target_participants?: number | null
          tiers?: Json
          title: string
          updated_at?: string
          visibility_project_id?: string | null
          visibility_type?: string
        }
        Update: {
          appointment_required?: boolean
          auto_closed_at?: string | null
          base_price?: number | null
          category_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          deleted_at?: string | null
          deposit_amount?: number
          deposit_required?: boolean
          description?: string | null
          discount_percentage?: number | null
          discounted_price?: number | null
          ends_at?: string | null
          gallery_images?: Json
          highlights?: Json
          id?: string
          is_deleted?: boolean
          is_demo?: boolean
          join_deadline?: string | null
          max_redemptions?: number | null
          offer_terms?: string | null
          offer_type?: string
          original_price?: number
          project_id?: string | null
          redemption_deadline?: string | null
          restrictions?: string | null
          service_areas?: string[]
          status?: string
          supplier_commitment_accepted?: boolean
          supplier_id?: string
          target_participants?: number | null
          tiers?: Json
          title?: string
          updated_at?: string
          visibility_project_id?: string | null
          visibility_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      deposit_attempt_logs: {
        Row: {
          attempted_amount: number | null
          created_at: string
          deal_id: string | null
          id: string
          metadata: Json
          reason: string
          user_id: string | null
        }
        Insert: {
          attempted_amount?: number | null
          created_at?: string
          deal_id?: string | null
          id?: string
          metadata?: Json
          reason: string
          user_id?: string | null
        }
        Update: {
          attempted_amount?: number | null
          created_at?: string
          deal_id?: string | null
          id?: string
          metadata?: Json
          reason?: string
          user_id?: string | null
        }
        Relationships: []
      }
      deposit_audit_log: {
        Row: {
          action: string
          created_at: string
          deposit_id: string
          id: string
          metadata: Json
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          deposit_id: string
          id?: string
          metadata?: Json
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          deposit_id?: string
          id?: string
          metadata?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      deposits: {
        Row: {
          amount: number
          created_at: string
          currency: string
          deal_id: string
          deleted_at: string | null
          gross_deposit_amount: number
          hidden_at: string | null
          hidden_by: string | null
          id: string
          is_deleted: boolean
          is_demo: boolean
          is_hidden: boolean
          metadata: Json | null
          net_deposit_amount: number
          paid_at: string | null
          payment_fee_absorber: string
          payment_processing_fee_amount: number | null
          payment_processing_fee_status: string
          payment_provider: Database["public"]["Enums"]["payment_provider_enum"]
          provider_payment_url: string | null
          provider_transaction_id: string | null
          refunded_at: string | null
          status: Database["public"]["Enums"]["deposit_status"]
          supplier_deduction_amount: number
          supplier_deduction_basis: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          deal_id: string
          deleted_at?: string | null
          gross_deposit_amount: number
          hidden_at?: string | null
          hidden_by?: string | null
          id?: string
          is_deleted?: boolean
          is_demo?: boolean
          is_hidden?: boolean
          metadata?: Json | null
          net_deposit_amount: number
          paid_at?: string | null
          payment_fee_absorber?: string
          payment_processing_fee_amount?: number | null
          payment_processing_fee_status?: string
          payment_provider: Database["public"]["Enums"]["payment_provider_enum"]
          provider_payment_url?: string | null
          provider_transaction_id?: string | null
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["deposit_status"]
          supplier_deduction_amount: number
          supplier_deduction_basis?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          deal_id?: string
          deleted_at?: string | null
          gross_deposit_amount?: number
          hidden_at?: string | null
          hidden_by?: string | null
          id?: string
          is_deleted?: boolean
          is_demo?: boolean
          is_hidden?: boolean
          metadata?: Json | null
          net_deposit_amount?: number
          paid_at?: string | null
          payment_fee_absorber?: string
          payment_processing_fee_amount?: number | null
          payment_processing_fee_status?: string
          payment_provider?: Database["public"]["Enums"]["payment_provider_enum"]
          provider_payment_url?: string | null
          provider_transaction_id?: string | null
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["deposit_status"]
          supplier_deduction_amount?: number
          supplier_deduction_basis?: string
          user_id?: string
        }
        Relationships: []
      }
      device_tokens: {
        Row: {
          created_at: string
          device_info: Json | null
          id: string
          last_active_at: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_info?: Json | null
          id?: string
          last_active_at?: string
          platform: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_info?: Json | null
          id?: string
          last_active_at?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          category: string
          created_at: string
          deleted_at: string | null
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          is_deleted: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          deleted_at?: string | null
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          is_deleted?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          deleted_at?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          is_deleted?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_outbox: {
        Row: {
          body_preview: string | null
          created_at: string
          email_type: string
          error_message: string | null
          id: string
          metadata: Json
          recipient_email: string
          recipient_user_id: string | null
          sent_at: string | null
          status: string
          subject: string
        }
        Insert: {
          body_preview?: string | null
          created_at?: string
          email_type: string
          error_message?: string | null
          id?: string
          metadata?: Json
          recipient_email: string
          recipient_user_id?: string | null
          sent_at?: string | null
          status?: string
          subject: string
        }
        Update: {
          body_preview?: string | null
          created_at?: string
          email_type?: string
          error_message?: string | null
          id?: string
          metadata?: Json
          recipient_email?: string
          recipient_user_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          approval_email_enabled: boolean
          approval_push_enabled: boolean
          approval_sms_enabled: boolean
          created_at: string
          deal_status_email_enabled: boolean
          deal_status_push_enabled: boolean
          deal_status_sms_enabled: boolean
          deposit_email_enabled: boolean
          deposit_push_enabled: boolean
          deposit_sms_enabled: boolean
          email_notifications_enabled: boolean
          new_lead_email_enabled: boolean
          new_lead_push_enabled: boolean
          new_lead_sms_enabled: boolean
          new_offer_email_enabled: boolean
          new_offer_push_enabled: boolean
          new_offer_sms_enabled: boolean
          push_notifications_enabled: boolean
          sms_notifications_enabled: boolean
          system_email_enabled: boolean
          system_push_enabled: boolean
          system_sms_enabled: boolean
          updated_at: string
          user_id: string
          voucher_email_enabled: boolean
          voucher_push_enabled: boolean
          voucher_sms_enabled: boolean
          welcome_email_enabled: boolean
        }
        Insert: {
          approval_email_enabled?: boolean
          approval_push_enabled?: boolean
          approval_sms_enabled?: boolean
          created_at?: string
          deal_status_email_enabled?: boolean
          deal_status_push_enabled?: boolean
          deal_status_sms_enabled?: boolean
          deposit_email_enabled?: boolean
          deposit_push_enabled?: boolean
          deposit_sms_enabled?: boolean
          email_notifications_enabled?: boolean
          new_lead_email_enabled?: boolean
          new_lead_push_enabled?: boolean
          new_lead_sms_enabled?: boolean
          new_offer_email_enabled?: boolean
          new_offer_push_enabled?: boolean
          new_offer_sms_enabled?: boolean
          push_notifications_enabled?: boolean
          sms_notifications_enabled?: boolean
          system_email_enabled?: boolean
          system_push_enabled?: boolean
          system_sms_enabled?: boolean
          updated_at?: string
          user_id: string
          voucher_email_enabled?: boolean
          voucher_push_enabled?: boolean
          voucher_sms_enabled?: boolean
          welcome_email_enabled?: boolean
        }
        Update: {
          approval_email_enabled?: boolean
          approval_push_enabled?: boolean
          approval_sms_enabled?: boolean
          created_at?: string
          deal_status_email_enabled?: boolean
          deal_status_push_enabled?: boolean
          deal_status_sms_enabled?: boolean
          deposit_email_enabled?: boolean
          deposit_push_enabled?: boolean
          deposit_sms_enabled?: boolean
          email_notifications_enabled?: boolean
          new_lead_email_enabled?: boolean
          new_lead_push_enabled?: boolean
          new_lead_sms_enabled?: boolean
          new_offer_email_enabled?: boolean
          new_offer_push_enabled?: boolean
          new_offer_sms_enabled?: boolean
          push_notifications_enabled?: boolean
          sms_notifications_enabled?: boolean
          system_email_enabled?: boolean
          system_push_enabled?: boolean
          system_sms_enabled?: boolean
          updated_at?: string
          user_id?: string
          voucher_email_enabled?: boolean
          voucher_push_enabled?: boolean
          voucher_sms_enabled?: boolean
          welcome_email_enabled?: boolean
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          deleted_at: string | null
          id: string
          is_deleted: boolean
          is_read: boolean
          link: string | null
          metadata: Json
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean
          is_read?: boolean
          link?: string | null
          metadata?: Json
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean
          is_read?: boolean
          link?: string | null
          metadata?: Json
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          admin_notes: string | null
          avatar_url: string | null
          business_name: string | null
          city: string | null
          city_id: string | null
          created_at: string
          current_stage: string
          deleted_at: string | null
          email: string | null
          full_name: string | null
          id: string
          interest_categories: string[]
          is_active: boolean
          is_deleted: boolean
          is_demo: boolean
          notification_prefs: Json
          phone: string | null
          project_id: string | null
          region: string | null
          region_id: string | null
          terms_accepted: boolean
          terms_accepted_at: string | null
          terms_version: string | null
          updated_at: string
          user_type: string
        }
        Insert: {
          address?: string | null
          admin_notes?: string | null
          avatar_url?: string | null
          business_name?: string | null
          city?: string | null
          city_id?: string | null
          created_at?: string
          current_stage?: string
          deleted_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          interest_categories?: string[]
          is_active?: boolean
          is_deleted?: boolean
          is_demo?: boolean
          notification_prefs?: Json
          phone?: string | null
          project_id?: string | null
          region?: string | null
          region_id?: string | null
          terms_accepted?: boolean
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string
          user_type?: string
        }
        Update: {
          address?: string | null
          admin_notes?: string | null
          avatar_url?: string | null
          business_name?: string | null
          city?: string | null
          city_id?: string | null
          created_at?: string
          current_stage?: string
          deleted_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          interest_categories?: string[]
          is_active?: boolean
          is_deleted?: boolean
          is_demo?: boolean
          notification_prefs?: Json
          phone?: string | null
          project_id?: string | null
          region?: string | null
          region_id?: string | null
          terms_accepted?: boolean
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string
          user_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          apartment_count: number
          building_count: number
          city: string
          created_at: string
          current_stage: string
          deleted_at: string | null
          id: string
          is_active: boolean
          is_deleted: boolean
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          apartment_count?: number
          building_count?: number
          city: string
          created_at?: string
          current_stage?: string
          deleted_at?: string | null
          id: string
          is_active?: boolean
          is_deleted?: boolean
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          apartment_count?: number
          building_count?: number
          city?: string
          created_at?: string
          current_stage?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      regional_councils: {
        Row: {
          created_at: string
          display_order: number
          id: string
          name_he: string
          region_id: string
          slug: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          name_he: string
          region_id: string
          slug: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          name_he?: string
          region_id?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "regional_councils_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      regions: {
        Row: {
          created_at: string
          display_order: number
          id: string
          name_he: string
          slug: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          name_he: string
          slug: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          name_he?: string
          slug?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          deal_id: string
          deleted_at: string | null
          id: string
          is_deleted: boolean
          rating: number
          supplier_id: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          deal_id: string
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean
          rating: number
          supplier_id: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          deal_id?: string
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean
          rating?: number
          supplier_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_catalogs: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          file_size: number | null
          file_url: string
          id: string
          kind: string
          name: string
          supplier_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          file_size?: number | null
          file_url: string
          id?: string
          kind?: string
          name: string
          supplier_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          file_size?: number | null
          file_url?: string
          id?: string
          kind?: string
          name?: string
          supplier_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      supplier_cities: {
        Row: {
          city_id: string
          supplier_id: string
        }
        Insert: {
          city_id: string
          supplier_id: string
        }
        Update: {
          city_id?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_cities_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_cities_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_councils: {
        Row: {
          council_id: string
          supplier_id: string
        }
        Insert: {
          council_id: string
          supplier_id: string
        }
        Update: {
          council_id?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_councils_council_id_fkey"
            columns: ["council_id"]
            isOneToOne: false
            referencedRelation: "regional_councils"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_councils_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_gallery: {
        Row: {
          caption: string | null
          created_at: string
          display_order: number
          id: string
          image_url: string
          supplier_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url: string
          supplier_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          supplier_id?: string
        }
        Relationships: []
      }
      supplier_inquiries: {
        Row: {
          category_id: string | null
          city: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          full_name: string | null
          id: string
          is_deleted: boolean
          message: string | null
          phone: string | null
          project_name: string | null
          source: string
          status: string
          supplier_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id?: string | null
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_deleted?: boolean
          message?: string | null
          phone?: string | null
          project_name?: string | null
          source?: string
          status?: string
          supplier_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string | null
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_deleted?: boolean
          message?: string | null
          phone?: string | null
          project_name?: string | null
          source?: string
          status?: string
          supplier_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      supplier_regions: {
        Row: {
          region_id: string
          supplier_id: string
        }
        Insert: {
          region_id: string
          supplier_id: string
        }
        Update: {
          region_id?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_regions_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_regions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          approval_status: string
          billing_notes: string | null
          billing_status: string
          business_name: string
          catalog_url: string | null
          categories: string[]
          commission_percent: number
          complaints_count: number
          contact_name: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          email: string | null
          facebook_url: string | null
          id: string
          instagram_url: string | null
          is_active: boolean
          is_deleted: boolean
          is_demo: boolean
          is_suspended: boolean
          logo_url: string | null
          monthly_subscription: number
          offers_products: boolean
          offers_services: boolean
          phone: string | null
          serves_all_country: boolean
          service_areas: string[]
          short_description: string | null
          successful_redemptions: number
          supplier_kind: string | null
          trust_score: number
          updated_at: string
          user_id: string | null
          verified_supplier: boolean
          website_url: string | null
          whatsapp_url: string | null
        }
        Insert: {
          approval_status?: string
          billing_notes?: string | null
          billing_status?: string
          business_name: string
          catalog_url?: string | null
          categories?: string[]
          commission_percent?: number
          complaints_count?: number
          contact_name?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          email?: string | null
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          is_active?: boolean
          is_deleted?: boolean
          is_demo?: boolean
          is_suspended?: boolean
          logo_url?: string | null
          monthly_subscription?: number
          offers_products?: boolean
          offers_services?: boolean
          phone?: string | null
          serves_all_country?: boolean
          service_areas?: string[]
          short_description?: string | null
          successful_redemptions?: number
          supplier_kind?: string | null
          trust_score?: number
          updated_at?: string
          user_id?: string | null
          verified_supplier?: boolean
          website_url?: string | null
          whatsapp_url?: string | null
        }
        Update: {
          approval_status?: string
          billing_notes?: string | null
          billing_status?: string
          business_name?: string
          catalog_url?: string | null
          categories?: string[]
          commission_percent?: number
          complaints_count?: number
          contact_name?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          email?: string | null
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          is_active?: boolean
          is_deleted?: boolean
          is_demo?: boolean
          is_suspended?: boolean
          logo_url?: string | null
          monthly_subscription?: number
          offers_products?: boolean
          offers_services?: boolean
          phone?: string | null
          serves_all_country?: boolean
          service_areas?: string[]
          short_description?: string | null
          successful_redemptions?: number
          supplier_kind?: string | null
          trust_score?: number
          updated_at?: string
          user_id?: string | null
          verified_supplier?: boolean
          website_url?: string | null
          whatsapp_url?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          active_payment_provider: string
          commission_percent: number
          created_at: string
          deposit_default_amount: number
          deposit_max_amount: number | null
          deposit_min_amount: number | null
          id: string
          payment_fee_absorber: string
          updated_at: string
        }
        Insert: {
          active_payment_provider?: string
          commission_percent?: number
          created_at?: string
          deposit_default_amount?: number
          deposit_max_amount?: number | null
          deposit_min_amount?: number | null
          id?: string
          payment_fee_absorber?: string
          updated_at?: string
        }
        Update: {
          active_payment_provider?: string
          commission_percent?: number
          created_at?: string
          deposit_default_amount?: number
          deposit_max_amount?: number | null
          deposit_min_amount?: number | null
          id?: string
          payment_fee_absorber?: string
          updated_at?: string
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
          role: Database["public"]["Enums"]["app_role"]
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
      voucher_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          ip: string | null
          metadata: Json
          user_agent: string | null
          voucher_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          metadata?: Json
          user_agent?: string | null
          voucher_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          metadata?: Json
          user_agent?: string | null
          voucher_id?: string | null
        }
        Relationships: []
      }
      vouchers: {
        Row: {
          code: string
          created_at: string
          deal_id: string
          expires_at: string | null
          id: string
          issued_at: string
          metadata: Json
          redeemed_at: string | null
          redeemed_by_supplier_id: string | null
          reference_number: string
          rotation_secret: string
          status: string
          supplier_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          deal_id: string
          expires_at?: string | null
          id?: string
          issued_at?: string
          metadata?: Json
          redeemed_at?: string | null
          redeemed_by_supplier_id?: string | null
          reference_number: string
          rotation_secret?: string
          status?: string
          supplier_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          deal_id?: string
          expires_at?: string | null
          id?: string
          issued_at?: string
          metadata?: Json
          redeemed_at?: string | null
          redeemed_by_supplier_id?: string | null
          reference_number?: string
          rotation_secret?: string
          status?: string
          supplier_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      waitlist_leads: {
        Row: {
          business_name: string | null
          category: string | null
          city: string | null
          created_at: string
          deleted_at: string | null
          full_name: string
          id: string
          is_deleted: boolean
          is_demo: boolean
          lead_type: string
          phone: string
          project_name: string | null
          service_areas: string | null
        }
        Insert: {
          business_name?: string | null
          category?: string | null
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          full_name: string
          id?: string
          is_deleted?: boolean
          is_demo?: boolean
          lead_type: string
          phone: string
          project_name?: string | null
          service_areas?: string | null
        }
        Update: {
          business_name?: string | null
          category?: string | null
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          full_name?: string
          id?: string
          is_deleted?: boolean
          is_demo?: boolean
          lead_type?: string
          phone?: string
          project_name?: string | null
          service_areas?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_lead_and_deposit: {
        Args: { _interest_id: string; _lead_status: string }
        Returns: undefined
      }
      auto_leave_expired_reapprovals: { Args: never; Returns: number }
      claim_supplier_profile_by_email: { Args: never; Returns: string }
      close_expired_deals: { Args: never; Returns: number }
      deal_effective_target: { Args: { _deal_id: string }; Returns: number }
      evaluate_conditional_joiners: {
        Args: { _deal_id: string }
        Returns: undefined
      }
      get_deal_interest_count: { Args: { _deal_id: string }; Returns: number }
      get_deal_paid_count: { Args: { _deal_id: string }; Returns: number }
      get_landing_stats: {
        Args: never
        Returns: {
          active_deals_count: number
          paid_deposits_count: number
          residents_count: number
          suppliers_count: number
          total_savings: number
        }[]
      }
      get_matching_deals_for_user: {
        Args: { _limit?: number; _stage_filter?: string }
        Returns: {
          deal_id: string
          match_priority: number
        }[]
      }
      get_supplier_rating: {
        Args: { _supplier_id: string }
        Returns: {
          avg_rating: number
          review_count: number
        }[]
      }
      get_voucher_resident_profiles: {
        Args: { _user_ids: string[] }
        Returns: {
          full_name: string
          id: string
          project_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_supplier_for_deal: {
        Args: { _deal_id: string; _user_id?: string }
        Returns: boolean
      }
      is_supplier_owner: {
        Args: { _supplier_id: string; _user_id?: string }
        Returns: boolean
      }
      issue_vouchers_for_deal: { Args: { _deal_id: string }; Returns: number }
      notify_admins: {
        Args: {
          _body: string
          _link?: string
          _metadata?: Json
          _title: string
          _type: string
        }
        Returns: undefined
      }
      notify_user: {
        Args: {
          _body: string
          _link?: string
          _metadata?: Json
          _title: string
          _type: string
          _user_id: string
        }
        Returns: undefined
      }
      purge_old_trashed_leads: { Args: never; Returns: Json }
      redeem_voucher: { Args: { _code: string }; Returns: Json }
      refresh_supplier_service_areas: {
        Args: { _supplier_id: string }
        Returns: undefined
      }
      set_deposit_hidden: {
        Args: { _deposit_id: string; _hidden: boolean }
        Returns: undefined
      }
      supplier_restore_inquiry: {
        Args: { _inquiry_id: string }
        Returns: undefined
      }
      supplier_restore_interest: {
        Args: { _interest_id: string }
        Returns: undefined
      }
      supplier_soft_delete_inquiry: {
        Args: { _inquiry_id: string }
        Returns: undefined
      }
      supplier_soft_delete_interest: {
        Args: { _interest_id: string }
        Returns: undefined
      }
      user_can_review: {
        Args: { _deal_id: string; _user_id: string }
        Returns: boolean
      }
      user_participates_in_deal: {
        Args: { _deal_id: string; _user_id?: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "resident" | "supplier"
      deposit_status: "pending" | "paid" | "failed" | "cancelled" | "refunded"
      payment_provider_enum: "grow" | "cardcom" | "grow_make" | "stripe"
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
      app_role: ["admin", "resident", "supplier"],
      deposit_status: ["pending", "paid", "failed", "cancelled", "refunded"],
      payment_provider_enum: ["grow", "cardcom", "grow_make", "stripe"],
    },
  },
} as const
