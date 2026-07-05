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
      category_project_stages: {
        Row: {
          category_id: string
          created_at: string
          display_order: number
          id: string
          project_type: string
          stage_key: string
        }
        Insert: {
          category_id: string
          created_at?: string
          display_order?: number
          id?: string
          project_type: string
          stage_key: string
        }
        Update: {
          category_id?: string
          created_at?: string
          display_order?: number
          id?: string
          project_type?: string
          stage_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_project_stages_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
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
      committee_quote_requests: {
        Row: {
          category_id: string | null
          created_at: string
          deadline: string | null
          description: string | null
          id: string
          project_id: string
          residents_count: number
          status: string
          supplier_id: string | null
          target_price_per_unit: number | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          project_id: string
          residents_count: number
          status?: string
          supplier_id?: string | null
          target_price_per_unit?: number | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          project_id?: string
          residents_count?: number
          status?: string
          supplier_id?: string | null
          target_price_per_unit?: number | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      committee_requests: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_notes: string | null
          id: string
          notes: string | null
          project_id: string
          requested_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_notes?: string | null
          id?: string
          notes?: string | null
          project_id: string
          requested_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_notes?: string | null
          id?: string
          notes?: string | null
          project_id?: string
          requested_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "committee_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
      deal_cities: {
        Row: {
          city_id: string
          created_at: string
          deal_id: string
        }
        Insert: {
          city_id: string
          created_at?: string
          deal_id: string
        }
        Update: {
          city_id?: string
          created_at?: string
          deal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_cities_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_cities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
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
          direct_deposit_amount: number | null
          direct_deposit_status: string | null
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
          project_id: string | null
          project_name: string | null
          reapproval_deadline_at: string | null
          resident_marked_paid_at: string | null
          status: string
          supplier_confirmed_at: string | null
          supplier_confirmed_by: string | null
          supplier_dispute_reason: string | null
          supplier_notes: string | null
          supplier_starred: boolean
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
          direct_deposit_amount?: number | null
          direct_deposit_status?: string | null
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
          project_id?: string | null
          project_name?: string | null
          reapproval_deadline_at?: string | null
          resident_marked_paid_at?: string | null
          status?: string
          supplier_confirmed_at?: string | null
          supplier_confirmed_by?: string | null
          supplier_dispute_reason?: string | null
          supplier_notes?: string | null
          supplier_starred?: boolean
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
          direct_deposit_amount?: number | null
          direct_deposit_status?: string | null
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
          project_id?: string | null
          project_name?: string | null
          reapproval_deadline_at?: string | null
          resident_marked_paid_at?: string | null
          status?: string
          supplier_confirmed_at?: string | null
          supplier_confirmed_by?: string | null
          supplier_dispute_reason?: string | null
          supplier_notes?: string | null
          supplier_starred?: boolean
          terms_accepted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_interests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "user_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_marketing_ai: {
        Row: {
          created_at: string
          cta: string | null
          deal_id: string
          enhanced_image_url: string | null
          headline: string | null
          id: string
          recommended_template: string | null
          subheadline: string | null
          updated_at: string
          urgency_tag: string | null
        }
        Insert: {
          created_at?: string
          cta?: string | null
          deal_id: string
          enhanced_image_url?: string | null
          headline?: string | null
          id?: string
          recommended_template?: string | null
          subheadline?: string | null
          updated_at?: string
          urgency_tag?: string | null
        }
        Update: {
          created_at?: string
          cta?: string | null
          deal_id?: string
          enhanced_image_url?: string | null
          headline?: string | null
          id?: string
          recommended_template?: string | null
          subheadline?: string | null
          updated_at?: string
          urgency_tag?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_marketing_ai_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: true
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_regions: {
        Row: {
          created_at: string
          deal_id: string
          region_id: string
        }
        Insert: {
          created_at?: string
          deal_id: string
          region_id: string
        }
        Update: {
          created_at?: string
          deal_id?: string
          region_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_regions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_regions_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_reminder_log: {
        Row: {
          deadline_date: string
          deal_id: string
          id: string
          reminder_kind: string
          sent_at: string
          user_id: string
        }
        Insert: {
          deadline_date: string
          deal_id: string
          id?: string
          reminder_kind: string
          sent_at?: string
          user_id: string
        }
        Update: {
          deadline_date?: string
          deal_id?: string
          id?: string
          reminder_kind?: string
          sent_at?: string
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
          listing_type: string
          max_redemptions: number | null
          offer_terms: string | null
          offer_type: string
          original_price: number
          product_details: string | null
          project_id: string | null
          redemption_deadline: string | null
          restrictions: string | null
          serves_all_country: boolean
          service_areas: string[]
          status: string
          supplier_commitment_accepted: boolean
          supplier_id: string
          supplier_payment_instructions: string | null
          supplier_payment_link: string | null
          target_participants: number | null
          tiers: Json
          title: string
          updated_at: string
          visibility_project_id: string | null
          visibility_region_ids: string[]
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
          listing_type?: string
          max_redemptions?: number | null
          offer_terms?: string | null
          offer_type?: string
          original_price?: number
          product_details?: string | null
          project_id?: string | null
          redemption_deadline?: string | null
          restrictions?: string | null
          serves_all_country?: boolean
          service_areas?: string[]
          status?: string
          supplier_commitment_accepted?: boolean
          supplier_id: string
          supplier_payment_instructions?: string | null
          supplier_payment_link?: string | null
          target_participants?: number | null
          tiers?: Json
          title: string
          updated_at?: string
          visibility_project_id?: string | null
          visibility_region_ids?: string[]
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
          listing_type?: string
          max_redemptions?: number | null
          offer_terms?: string | null
          offer_type?: string
          original_price?: number
          product_details?: string | null
          project_id?: string | null
          redemption_deadline?: string | null
          restrictions?: string | null
          serves_all_country?: boolean
          service_areas?: string[]
          status?: string
          supplier_commitment_accepted?: boolean
          supplier_id?: string
          supplier_payment_instructions?: string | null
          supplier_payment_link?: string | null
          target_participants?: number | null
          tiers?: Json
          title?: string
          updated_at?: string
          visibility_project_id?: string | null
          visibility_region_ids?: string[]
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
      demand_activity_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          demand_id: string
          id: string
          payload: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          demand_id: string
          id?: string
          payload?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          demand_id?: string
          id?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "demand_activity_log_demand_id_fkey"
            columns: ["demand_id"]
            isOneToOne: false
            referencedRelation: "demand_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      demand_invitations: {
        Row: {
          created_at: string
          demand_id: string
          id: string
          invited_at: string
          offer_deal_id: string | null
          responded_at: string | null
          status: string
          supplier_id: string
          updated_at: string
          viewed_at: string | null
        }
        Insert: {
          created_at?: string
          demand_id: string
          id?: string
          invited_at?: string
          offer_deal_id?: string | null
          responded_at?: string | null
          status?: string
          supplier_id: string
          updated_at?: string
          viewed_at?: string | null
        }
        Update: {
          created_at?: string
          demand_id?: string
          id?: string
          invited_at?: string
          offer_deal_id?: string | null
          responded_at?: string | null
          status?: string
          supplier_id?: string
          updated_at?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "demand_invitations_demand_id_fkey"
            columns: ["demand_id"]
            isOneToOne: false
            referencedRelation: "demand_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demand_invitations_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      demand_messages: {
        Row: {
          admin_id: string | null
          body: string
          demand_id: string
          id: string
          recipients_count: number
          sent_at: string
          subject: string
        }
        Insert: {
          admin_id?: string | null
          body: string
          demand_id: string
          id?: string
          recipients_count?: number
          sent_at?: string
          subject: string
        }
        Update: {
          admin_id?: string | null
          body?: string
          demand_id?: string
          id?: string
          recipients_count?: number
          sent_at?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "demand_messages_demand_id_fkey"
            columns: ["demand_id"]
            isOneToOne: false
            referencedRelation: "demand_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      demand_participants: {
        Row: {
          demand_id: string
          full_name: string
          id: string
          joined_at: string
          phone: string | null
          user_id: string | null
        }
        Insert: {
          demand_id: string
          full_name: string
          id?: string
          joined_at?: string
          phone?: string | null
          user_id?: string | null
        }
        Update: {
          demand_id?: string
          full_name?: string
          id?: string
          joined_at?: string
          phone?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "demand_participants_demand_id_fkey"
            columns: ["demand_id"]
            isOneToOne: false
            referencedRelation: "demand_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      demand_requests: {
        Row: {
          admin_notes: string | null
          admin_status: string
          budget_max: number | null
          budget_min: number | null
          category_id: string | null
          city_id: string | null
          closed_at: string | null
          created_at: string
          deadline: string | null
          deal_id: string | null
          description: string
          first_reviewed_at: string | null
          id: string
          matched_count: number
          participants_count: number
          project_id: string | null
          project_type: string | null
          region_id: string | null
          resident_user_id: string
          status: string
          target_qty: number | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          admin_status?: string
          budget_max?: number | null
          budget_min?: number | null
          category_id?: string | null
          city_id?: string | null
          closed_at?: string | null
          created_at?: string
          deadline?: string | null
          deal_id?: string | null
          description: string
          first_reviewed_at?: string | null
          id?: string
          matched_count?: number
          participants_count?: number
          project_id?: string | null
          project_type?: string | null
          region_id?: string | null
          resident_user_id: string
          status?: string
          target_qty?: number | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          admin_status?: string
          budget_max?: number | null
          budget_min?: number | null
          category_id?: string | null
          city_id?: string | null
          closed_at?: string | null
          created_at?: string
          deadline?: string | null
          deal_id?: string | null
          description?: string
          first_reviewed_at?: string | null
          id?: string
          matched_count?: number
          participants_count?: number
          project_id?: string | null
          project_type?: string | null
          region_id?: string | null
          resident_user_id?: string
          status?: string
          target_qty?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "demand_requests_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demand_requests_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demand_requests_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demand_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demand_requests_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
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
          confirmed_by: string | null
          created_at: string
          currency: string
          deal_id: string
          declared_paid_at: string | null
          declared_payment_method: string | null
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
          project_id: string | null
          provider_payment_url: string | null
          provider_transaction_id: string | null
          refunded_at: string | null
          status: Database["public"]["Enums"]["deposit_status"]
          supplier_deduction_amount: number
          supplier_deduction_basis: string
          supplier_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          confirmed_by?: string | null
          created_at?: string
          currency?: string
          deal_id: string
          declared_paid_at?: string | null
          declared_payment_method?: string | null
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
          project_id?: string | null
          provider_payment_url?: string | null
          provider_transaction_id?: string | null
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["deposit_status"]
          supplier_deduction_amount: number
          supplier_deduction_basis?: string
          supplier_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          confirmed_by?: string | null
          created_at?: string
          currency?: string
          deal_id?: string
          declared_paid_at?: string | null
          declared_payment_method?: string | null
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
          project_id?: string | null
          provider_payment_url?: string | null
          provider_transaction_id?: string | null
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["deposit_status"]
          supplier_deduction_amount?: number
          supplier_deduction_basis?: string
          supplier_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deposits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "user_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposits_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
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
          project_id: string | null
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
          project_id?: string | null
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
          project_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "user_projects"
            referencedColumns: ["id"]
          },
        ]
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
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          deal_id: string
          id: string
          project_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          deal_id: string
          id?: string
          project_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          deal_id?: string
          id?: string
          project_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "user_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      group_buy_requests: {
        Row: {
          created_at: string
          deal_id: string
          full_name: string
          id: string
          message: string | null
          phone: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          deal_id: string
          full_name: string
          id?: string
          message?: string | null
          phone: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          deal_id?: string
          full_name?: string
          id?: string
          message?: string | null
          phone?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_buy_requests_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      image_migration_log: {
        Row: {
          bucket: string
          column_name: string
          created_at: string
          error: string | null
          id: string
          new_bytes: number | null
          new_path: string | null
          new_url: string | null
          old_bytes: number | null
          old_path: string
          old_url: string
          row_id: string
          run_id: string
          status: string
          table_name: string
        }
        Insert: {
          bucket: string
          column_name: string
          created_at?: string
          error?: string | null
          id?: string
          new_bytes?: number | null
          new_path?: string | null
          new_url?: string | null
          old_bytes?: number | null
          old_path: string
          old_url: string
          row_id: string
          run_id: string
          status: string
          table_name: string
        }
        Update: {
          bucket?: string
          column_name?: string
          created_at?: string
          error?: string | null
          id?: string
          new_bytes?: number | null
          new_path?: string | null
          new_url?: string | null
          old_bytes?: number | null
          old_path?: string
          old_url?: string
          row_id?: string
          run_id?: string
          status?: string
          table_name?: string
        }
        Relationships: []
      }
      notification_dispatch_log: {
        Row: {
          attempts: number
          created_at: string
          dispatch_error: string | null
          dispatch_status: string
          email_error: string | null
          email_sent_at: string | null
          email_status: string | null
          id: string
          notification_id: string
          notification_type: string
          push_error: string | null
          push_sent_at: string | null
          push_status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          dispatch_error?: string | null
          dispatch_status?: string
          email_error?: string | null
          email_sent_at?: string | null
          email_status?: string | null
          id?: string
          notification_id: string
          notification_type: string
          push_error?: string | null
          push_sent_at?: string | null
          push_status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          dispatch_error?: string | null
          dispatch_status?: string
          email_error?: string | null
          email_sent_at?: string | null
          email_status?: string | null
          id?: string
          notification_id?: string
          notification_type?: string
          push_error?: string | null
          push_sent_at?: string | null
          push_status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_dispatch_log_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: true
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
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
          demand_invitation_email_enabled: boolean
          demand_invitation_push_enabled: boolean
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
          demand_invitation_email_enabled?: boolean
          demand_invitation_push_enabled?: boolean
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
          demand_invitation_email_enabled?: boolean
          demand_invitation_push_enabled?: boolean
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
          project_id: string | null
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
          project_id?: string | null
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
          project_id?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "user_projects"
            referencedColumns: ["id"]
          },
        ]
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
          journey: string
          notification_prefs: Json
          onboarding_completed: boolean
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
          journey?: string
          notification_prefs?: Json
          onboarding_completed?: boolean
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
          journey?: string
          notification_prefs?: Json
          onboarding_completed?: boolean
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
          image_url: string | null
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
          image_url?: string | null
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
          image_url?: string | null
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
          project_id: string | null
          project_name: string | null
          source: string
          status: string
          supplier_id: string
          supplier_notes: string | null
          supplier_starred: boolean
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
          project_id?: string | null
          project_name?: string | null
          source?: string
          status?: string
          supplier_id: string
          supplier_notes?: string | null
          supplier_starred?: boolean
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
          project_id?: string | null
          project_name?: string | null
          source?: string
          status?: string
          supplier_id?: string
          supplier_notes?: string | null
          supplier_starred?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_inquiries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "user_projects"
            referencedColumns: ["id"]
          },
        ]
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
          bank_account_holder: string | null
          bank_account_number: string | null
          bank_branch: string | null
          bank_name: string | null
          billing_notes: string | null
          billing_status: string
          bit_phone: string | null
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
          lead_fee: number
          logo_url: string | null
          monthly_subscription: number
          offers_products: boolean
          offers_services: boolean
          payment_instructions_note: string | null
          phone: string | null
          profile_reminder_sent_at: string | null
          serves_all_country: boolean
          service_areas: string[]
          short_description: string | null
          success_fee: number
          success_fee_type: string
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
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          billing_notes?: string | null
          billing_status?: string
          bit_phone?: string | null
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
          lead_fee?: number
          logo_url?: string | null
          monthly_subscription?: number
          offers_products?: boolean
          offers_services?: boolean
          payment_instructions_note?: string | null
          phone?: string | null
          profile_reminder_sent_at?: string | null
          serves_all_country?: boolean
          service_areas?: string[]
          short_description?: string | null
          success_fee?: number
          success_fee_type?: string
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
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          billing_notes?: string | null
          billing_status?: string
          bit_phone?: string | null
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
          lead_fee?: number
          logo_url?: string | null
          monthly_subscription?: number
          offers_products?: boolean
          offers_services?: boolean
          payment_instructions_note?: string | null
          phone?: string | null
          profile_reminder_sent_at?: string | null
          serves_all_country?: boolean
          service_areas?: string[]
          short_description?: string | null
          success_fee?: number
          success_fee_type?: string
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
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
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
          support_whatsapp: string | null
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
          support_whatsapp?: string | null
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
          support_whatsapp?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_project_data: {
        Row: {
          budget: Json
          budget_total: number
          current_idx: number
          info: Json
          progress: Json
          project_id: string
          schedule: Json
          tasks: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          budget?: Json
          budget_total?: number
          current_idx?: number
          info?: Json
          progress?: Json
          project_id: string
          schedule?: Json
          tasks?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          budget?: Json
          budget_total?: number
          current_idx?: number
          info?: Json
          progress?: Json
          project_id?: string
          schedule?: Json
          tasks?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_project_data_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "user_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_project_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          expires_at: string
          id: string
          invited_by: string
          invited_email: string | null
          invited_phone: string | null
          project_id: string
          role: Database["public"]["Enums"]["user_project_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          invited_by: string
          invited_email?: string | null
          invited_phone?: string | null
          project_id: string
          role?: Database["public"]["Enums"]["user_project_role"]
          token: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          invited_by?: string
          invited_email?: string | null
          invited_phone?: string | null
          project_id?: string
          role?: Database["public"]["Enums"]["user_project_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_project_invitations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "user_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_project_members: {
        Row: {
          id: string
          joined_at: string
          project_id: string
          role: Database["public"]["Enums"]["user_project_role"]
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          project_id: string
          role?: Database["public"]["Enums"]["user_project_role"]
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          project_id?: string
          role?: Database["public"]["Enums"]["user_project_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "user_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_projects: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          project_type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name?: string
          project_type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          project_type?: string | null
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
          project_id: string | null
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
          project_id?: string | null
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
          project_id?: string | null
          redeemed_at?: string | null
          redeemed_by_supplier_id?: string | null
          reference_number?: string
          rotation_secret?: string
          status?: string
          supplier_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vouchers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "user_projects"
            referencedColumns: ["id"]
          },
        ]
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
      accept_user_project_invitation: {
        Args: { _token: string }
        Returns: string
      }
      admin_change_demand_status: {
        Args: { _demand_id: string; _new_status: string; _note?: string }
        Returns: undefined
      }
      admin_close_demand: {
        Args: { _demand_id: string; _reason?: string }
        Returns: undefined
      }
      admin_convert_demand_to_deal: {
        Args: { _demand_id: string; _supplier_id: string; _title: string }
        Returns: string
      }
      admin_decide_committee_request: {
        Args: { _approve: boolean; _id: string; _notes?: string }
        Returns: undefined
      }
      admin_get_supplier_billing: {
        Args: { _supplier_id: string }
        Returns: {
          billing_notes: string
          billing_status: string
          commission_percent: number
          monthly_subscription: number
        }[]
      }
      admin_invite_suppliers_to_demand: {
        Args: { _demand_id: string; _supplier_ids: string[] }
        Returns: number
      }
      admin_list_supplier_billing: {
        Args: never
        Returns: {
          billing_notes: string
          billing_status: string
          commission_percent: number
          id: string
          monthly_subscription: number
        }[]
      }
      admin_message_demand_participants: {
        Args: { _body: string; _demand_id: string; _subject: string }
        Returns: number
      }
      admin_revoke_committee_role: {
        Args: { _project_id?: string; _reason?: string; _user_id: string }
        Returns: undefined
      }
      approve_lead_and_deposit: {
        Args: { _interest_id: string; _lead_status: string }
        Returns: undefined
      }
      auto_leave_expired_reapprovals: { Args: never; Returns: number }
      can_edit_user_project: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      claim_supplier_profile_by_email: { Args: never; Returns: string }
      close_expired_deals: { Args: never; Returns: number }
      complete_onboarding: {
        Args: {
          _business_name: string
          _city: string
          _full_name: string
          _role: string
        }
        Returns: undefined
      }
      confirm_deposit_received: {
        Args: { _deposit_id: string }
        Returns: undefined
      }
      deal_effective_target: { Args: { _deal_id: string }; Returns: number }
      declare_deposit_paid: {
        Args: { _deposit_id: string; _method: string }
        Returns: undefined
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      ensure_user_project: { Args: never; Returns: string }
      evaluate_conditional_joiners: {
        Args: { _deal_id: string }
        Returns: undefined
      }
      get_admin_demand_kpis: { Args: never; Returns: Json }
      get_committee_dashboard: { Args: { _project_id?: string }; Returns: Json }
      get_deal_interest_count: { Args: { _deal_id: string }; Returns: number }
      get_deal_paid_count: { Args: { _deal_id: string }; Returns: number }
      get_deal_reviews_public: {
        Args: { _deal_id: string }
        Returns: {
          comment: string
          created_at: string
          id: string
          rating: number
        }[]
      }
      get_deal_supplier_payment_info: {
        Args: { _deal_id: string }
        Returns: {
          bank_account_holder: string
          bank_account_number: string
          bank_branch: string
          bank_name: string
          bit_phone: string
          business_name: string
          payment_instructions_note: string
        }[]
      }
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
      get_own_supplier_payment_info: {
        Args: never
        Returns: {
          bank_account_holder: string
          bank_account_number: string
          bank_branch: string
          bank_name: string
          bit_phone: string
          payment_instructions_note: string
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
      is_committee_for_project: {
        Args: { _project_id: string; _user_id?: string }
        Returns: boolean
      }
      is_resident_owner_of_demand: {
        Args: { _demand_id: string }
        Returns: boolean
      }
      is_supplier_for_deal: {
        Args: { _deal_id: string; _user_id?: string }
        Returns: boolean
      }
      is_supplier_invited_to_demand: {
        Args: { _demand_id: string }
        Returns: boolean
      }
      is_supplier_owner: {
        Args: { _supplier_id: string; _user_id?: string }
        Returns: boolean
      }
      is_user_project_member: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      issue_vouchers_for_deal: { Args: { _deal_id: string }; Returns: number }
      lookup_voucher_for_supplier: { Args: { _code: string }; Returns: Json }
      match_suppliers_for_demand: {
        Args: { _demand_id: string }
        Returns: number
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
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
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      redeem_voucher: { Args: { _code: string }; Returns: Json }
      refresh_supplier_service_areas: {
        Args: { _supplier_id: string }
        Returns: undefined
      }
      request_committee_role: {
        Args: { _notes?: string; _project_id: string }
        Returns: string
      }
      request_group_buy: {
        Args: {
          _deal_id: string
          _full_name: string
          _message?: string
          _phone: string
        }
        Returns: string
      }
      resident_mark_deposit_paid: {
        Args: { _interest_id: string }
        Returns: undefined
      }
      set_deposit_hidden: {
        Args: { _deposit_id: string; _hidden: boolean }
        Returns: undefined
      }
      supplier_confirm_deposit: {
        Args: { _interest_id: string }
        Returns: undefined
      }
      supplier_dispute_deposit: {
        Args: { _interest_id: string; _reason?: string }
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
      supplier_update_interest_meta: {
        Args: { _interest_id: string; _notes?: string; _starred?: boolean }
        Returns: undefined
      }
      transfer_user_project_ownership: {
        Args: { _project_id: string; _to_user: string }
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
      user_primary_project_id: { Args: { _user_id: string }; Returns: string }
      user_project_role_of: {
        Args: { _project_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["user_project_role"]
      }
      viewer_insert_allowed: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "resident" | "supplier" | "committee"
      deposit_status:
        | "pending"
        | "paid"
        | "failed"
        | "cancelled"
        | "refunded"
        | "awaiting_confirmation"
      payment_provider_enum:
        | "grow"
        | "cardcom"
        | "grow_make"
        | "stripe"
        | "direct_to_supplier"
        | "manual"
      user_project_role: "owner" | "partner" | "viewer"
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
      app_role: ["admin", "resident", "supplier", "committee"],
      deposit_status: [
        "pending",
        "paid",
        "failed",
        "cancelled",
        "refunded",
        "awaiting_confirmation",
      ],
      payment_provider_enum: [
        "grow",
        "cardcom",
        "grow_make",
        "stripe",
        "direct_to_supplier",
        "manual",
      ],
      user_project_role: ["owner", "partner", "viewer"],
    },
  },
} as const
