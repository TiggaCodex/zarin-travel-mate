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
      airlines: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          scope: Database["public"]["Enums"]["airline_scope"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          scope: Database["public"]["Enums"]["airline_scope"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          scope?: Database["public"]["Enums"]["airline_scope"]
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          created_at: string
          created_by: string | null
          email: string | null
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          note: string | null
          paid_on: string
          recorded_by: string | null
          reference: string | null
          transaction_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          note?: string | null
          paid_on?: string
          recorded_by?: string | null
          reference?: string | null
          transaction_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          note?: string | null
          paid_on?: string
          recorded_by?: string | null
          reference?: string | null
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transaction_financials"
            referencedColumns: ["transaction_id"]
          },
          {
            foreignKeyName: "payments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string
          id: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          channel: string | null
          created_at: string
          due_date: string
          id: string
          kind: Database["public"]["Enums"]["reminder_kind"]
          sent_at: string | null
          sent_by: string | null
          status: Database["public"]["Enums"]["reminder_status"]
          transaction_id: string
          updated_at: string
        }
        Insert: {
          channel?: string | null
          created_at?: string
          due_date: string
          id?: string
          kind: Database["public"]["Enums"]["reminder_kind"]
          sent_at?: string | null
          sent_by?: string | null
          status?: Database["public"]["Enums"]["reminder_status"]
          transaction_id: string
          updated_at?: string
        }
        Update: {
          channel?: string | null
          created_at?: string
          due_date?: string
          id?: string
          kind?: Database["public"]["Enums"]["reminder_kind"]
          sent_at?: string | null
          sent_by?: string | null
          status?: Database["public"]["Enums"]["reminder_status"]
          transaction_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transaction_financials"
            referencedColumns: ["transaction_id"]
          },
          {
            foreignKeyName: "reminders_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          airline_id: string
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          client_fare: number
          client_id: string
          created_at: string
          created_by: string | null
          departure_date: string
          id: string
          payable: number
          pickup_dropoff: string | null
          pnr: string | null
          register_date: string
          remark: string | null
          return_date: string | null
          serial_number: number
          status: Database["public"]["Enums"]["transaction_status"]
          travel_class: Database["public"]["Enums"]["travel_class"]
          updated_at: string
        }
        Insert: {
          airline_id: string
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          client_fare: number
          client_id: string
          created_at?: string
          created_by?: string | null
          departure_date: string
          id?: string
          payable: number
          pickup_dropoff?: string | null
          pnr?: string | null
          register_date?: string
          remark?: string | null
          return_date?: string | null
          serial_number?: number
          status?: Database["public"]["Enums"]["transaction_status"]
          travel_class?: Database["public"]["Enums"]["travel_class"]
          updated_at?: string
        }
        Update: {
          airline_id?: string
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          client_fare?: number
          client_id?: string
          created_at?: string
          created_by?: string | null
          departure_date?: string
          id?: string
          payable?: number
          pickup_dropoff?: string | null
          pnr?: string | null
          register_date?: string
          remark?: string | null
          return_date?: string | null
          serial_number?: number
          status?: Database["public"]["Enums"]["transaction_status"]
          travel_class?: Database["public"]["Enums"]["travel_class"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_airline_id_fkey"
            columns: ["airline_id"]
            isOneToOne: false
            referencedRelation: "airlines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
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
      transaction_financials: {
        Row: {
          airline_id: string | null
          amount_paid: number | null
          client_fare: number | null
          client_id: string | null
          commission_scope: Database["public"]["Enums"]["airline_scope"] | null
          departure_date: string | null
          outstanding: number | null
          payable: number | null
          payment_status: string | null
          pending_commission: number | null
          potential_commission: number | null
          recognized_commission: number | null
          register_date: string | null
          return_date: string | null
          serial_number: number | null
          status: Database["public"]["Enums"]["transaction_status"] | null
          transaction_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_airline_id_fkey"
            columns: ["airline_id"]
            isOneToOne: false
            referencedRelation: "airlines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_staff_member: { Args: never; Returns: boolean }
    }
    Enums: {
      airline_scope: "local" | "international"
      app_role: "admin" | "staff"
      payment_method: "cash" | "transfer" | "pos" | "other"
      reminder_kind: "departure" | "return"
      reminder_status: "pending" | "sent" | "dismissed"
      transaction_status: "active" | "cancelled"
      travel_class: "economy" | "premium_economy" | "business" | "first"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      airline_scope: ["local", "international"],
      app_role: ["admin", "staff"],
      payment_method: ["cash", "transfer", "pos", "other"],
      reminder_kind: ["departure", "return"],
      reminder_status: ["pending", "sent", "dismissed"],
      transaction_status: ["active", "cancelled"],
      travel_class: ["economy", "premium_economy", "business", "first"],
    },
  },
} as const
