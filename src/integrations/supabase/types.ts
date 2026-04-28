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
      deposits: {
        Row: {
          amount: number
          created_at: string
          currency: string
          deal_id: string
          id: string
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
          id?: string
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
          id?: string
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
      profiles: {
        Row: {
          address: string | null
          business_name: string | null
          city: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          interest_categories: string[]
          is_active: boolean
          notification_prefs: Json
          phone: string | null
          project_id: string | null
          region: string | null
          updated_at: string
          user_type: string
        }
        Insert: {
          address?: string | null
          business_name?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          interest_categories?: string[]
          is_active?: boolean
          notification_prefs?: Json
          phone?: string | null
          project_id?: string | null
          region?: string | null
          updated_at?: string
          user_type?: string
        }
        Update: {
          address?: string | null
          business_name?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          interest_categories?: string[]
          is_active?: boolean
          notification_prefs?: Json
          phone?: string | null
          project_id?: string | null
          region?: string | null
          updated_at?: string
          user_type?: string
        }
        Relationships: []
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
          categories: string[]
          contact_name: string | null
          created_at: string
          description: string | null
          email: string | null
          id: string
          is_active: boolean
          phone: string | null
          serves_all_country: boolean
          updated_at: string
          user_id: string | null
        }
        Insert: {
          approval_status?: string
          business_name: string
          categories?: string[]
          contact_name?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          serves_all_country?: boolean
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          approval_status?: string
          business_name?: string
          categories?: string[]
          contact_name?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          serves_all_country?: boolean
          updated_at?: string
          user_id?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_deal_paid_count: { Args: { _deal_id: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
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
