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
      cities: {
        Row: {
          created_at: string
          id: string
          name_he: string
          region_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name_he: string
          region_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name_he?: string
          region_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cities_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_interests: {
        Row: {
          city: string | null
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
          lead_status: string
          notes: string | null
          phone: string | null
          project_name: string | null
          status: string
          terms_accepted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          city?: string | null
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
          lead_status?: string
          notes?: string | null
          phone?: string | null
          project_name?: string | null
          status?: string
          terms_accepted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string | null
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
          lead_status?: string
          notes?: string | null
          phone?: string | null
          project_name?: string | null
          status?: string
          terms_accepted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      deals: {
        Row: {
          base_price: number | null
          category_id: string | null
          created_at: string
          deleted_at: string | null
          deposit_amount: number
          deposit_required: boolean
          description: string | null
          discount_percentage: number | null
          discounted_price: number | null
          ends_at: string | null
          highlights: Json
          id: string
          is_deleted: boolean
          is_demo: boolean
          offer_type: string
          original_price: number
          project_id: string | null
          status: string
          supplier_id: string
          tiers: Json
          title: string
          updated_at: string
        }
        Insert: {
          base_price?: number | null
          category_id?: string | null
          created_at?: string
          deleted_at?: string | null
          deposit_amount?: number
          deposit_required?: boolean
          description?: string | null
          discount_percentage?: number | null
          discounted_price?: number | null
          ends_at?: string | null
          highlights?: Json
          id?: string
          is_deleted?: boolean
          is_demo?: boolean
          offer_type?: string
          original_price?: number
          project_id?: string | null
          status?: string
          supplier_id: string
          tiers?: Json
          title: string
          updated_at?: string
        }
        Update: {
          base_price?: number | null
          category_id?: string | null
          created_at?: string
          deleted_at?: string | null
          deposit_amount?: number
          deposit_required?: boolean
          description?: string | null
          discount_percentage?: number | null
          discounted_price?: number | null
          ends_at?: string | null
          highlights?: Json
          id?: string
          is_deleted?: boolean
          is_demo?: boolean
          offer_type?: string
          original_price?: number
          project_id?: string | null
          status?: string
          supplier_id?: string
          tiers?: Json
          title?: string
          updated_at?: string
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
      deposits: {
        Row: {
          amount: number
          created_at: string
          currency: string
          deal_id: string
          deleted_at: string | null
          id: string
          is_deleted: boolean
          is_demo: boolean
          metadata: Json | null
          paid_at: string | null
          payment_provider: Database["public"]["Enums"]["payment_provider_enum"]
          provider_payment_url: string | null
          provider_transaction_id: string | null
          refunded_at: string | null
          status: Database["public"]["Enums"]["deposit_status"]
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          deal_id: string
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean
          is_demo?: boolean
          metadata?: Json | null
          paid_at?: string | null
          payment_provider: Database["public"]["Enums"]["payment_provider_enum"]
          provider_payment_url?: string | null
          provider_transaction_id?: string | null
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["deposit_status"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          deal_id?: string
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean
          is_demo?: boolean
          metadata?: Json | null
          paid_at?: string | null
          payment_provider?: Database["public"]["Enums"]["payment_provider_enum"]
          provider_payment_url?: string | null
          provider_transaction_id?: string | null
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["deposit_status"]
          user_id?: string
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
          business_name: string | null
          city: string | null
          city_id: string | null
          created_at: string
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
          updated_at: string
          user_type: string
        }
        Insert: {
          address?: string | null
          admin_notes?: string | null
          business_name?: string | null
          city?: string | null
          city_id?: string | null
          created_at?: string
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
          updated_at?: string
          user_type?: string
        }
        Update: {
          address?: string | null
          admin_notes?: string | null
          business_name?: string | null
          city?: string | null
          city_id?: string | null
          created_at?: string
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
          business_name: string
          catalog_url: string | null
          categories: string[]
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
          logo_url: string | null
          phone: string | null
          serves_all_country: boolean
          service_areas: string[]
          short_description: string | null
          updated_at: string
          user_id: string | null
          website_url: string | null
          whatsapp_url: string | null
        }
        Insert: {
          approval_status?: string
          business_name: string
          catalog_url?: string | null
          categories?: string[]
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
          logo_url?: string | null
          phone?: string | null
          serves_all_country?: boolean
          service_areas?: string[]
          short_description?: string | null
          updated_at?: string
          user_id?: string | null
          website_url?: string | null
          whatsapp_url?: string | null
        }
        Update: {
          approval_status?: string
          business_name?: string
          catalog_url?: string | null
          categories?: string[]
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
          logo_url?: string | null
          phone?: string | null
          serves_all_country?: boolean
          service_areas?: string[]
          short_description?: string | null
          updated_at?: string
          user_id?: string | null
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
          id: string
          updated_at: string
        }
        Insert: {
          active_payment_provider?: string
          commission_percent?: number
          created_at?: string
          deposit_default_amount?: number
          id?: string
          updated_at?: string
        }
        Update: {
          active_payment_provider?: string
          commission_percent?: number
          created_at?: string
          deposit_default_amount?: number
          id?: string
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
      waitlist_leads: {
        Row: {
          business_name: string | null
          category: string | null
          city: string | null
          created_at: string
          full_name: string
          id: string
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
          full_name: string
          id?: string
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
          full_name?: string
          id?: string
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
      get_deal_interest_count: { Args: { _deal_id: string }; Returns: number }
      get_deal_paid_count: { Args: { _deal_id: string }; Returns: number }
      get_supplier_rating: {
        Args: { _supplier_id: string }
        Returns: {
          avg_rating: number
          review_count: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      refresh_supplier_service_areas: {
        Args: { _supplier_id: string }
        Returns: undefined
      }
      user_can_review: {
        Args: { _deal_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "resident" | "supplier"
      deposit_status: "pending" | "paid" | "failed" | "cancelled" | "refunded"
      payment_provider_enum: "grow" | "cardcom"
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
      payment_provider_enum: ["grow", "cardcom"],
    },
  },
} as const
