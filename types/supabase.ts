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
      agencies: {
        Row: {
          brand_color: string | null
          brand_logo_url: string | null
          created_at: string
          id: string
          name: string
          request_count: number
          slug: string
          updated_at: string
        }
        Insert: {
          brand_color?: string | null
          brand_logo_url?: string | null
          created_at?: string
          id?: string
          name: string
          request_count?: number
          slug: string
          updated_at?: string
        }
        Update: {
          brand_color?: string | null
          brand_logo_url?: string | null
          created_at?: string
          id?: string
          name?: string
          request_count?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      agency_members: {
        Row: {
          agency_id: string
          created_at: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_members_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_operator_links: {
        Row: {
          agency_id: string
          created_at: string
          created_by: string | null
          operator_id: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          created_by?: string | null
          operator_id: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          created_by?: string | null
          operator_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_operator_links_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_operator_links_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      attachments: {
        Row: {
          agency_id: string
          created_at: string
          file_name: string
          id: string
          kind: Database["public"]["Enums"]["attachment_kind"]
          mime_type: string | null
          operator_id: string | null
          passenger_id: string | null
          quote_request_id: string
          size_bytes: number | null
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          agency_id: string
          created_at?: string
          file_name: string
          id?: string
          kind: Database["public"]["Enums"]["attachment_kind"]
          mime_type?: string | null
          operator_id?: string | null
          passenger_id?: string | null
          quote_request_id: string
          size_bytes?: number | null
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          agency_id?: string
          created_at?: string
          file_name?: string
          id?: string
          kind?: Database["public"]["Enums"]["attachment_kind"]
          mime_type?: string | null
          operator_id?: string | null
          passenger_id?: string | null
          quote_request_id?: string
          size_bytes?: number | null
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attachments_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "passengers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      bsp_calendar: {
        Row: {
          payment_date: string
          period_code: string
          period_from: string
          period_to: string
        }
        Insert: {
          payment_date: string
          period_code: string
          period_from: string
          period_to: string
        }
        Update: {
          payment_date?: string
          period_code?: string
          period_from?: string
          period_to?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          agency_id: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          kind: Database["public"]["Enums"]["invitation_kind"]
          operator_id: string | null
          role: Database["public"]["Enums"]["member_role"] | null
          status: Database["public"]["Enums"]["invitation_status"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          agency_id?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          kind: Database["public"]["Enums"]["invitation_kind"]
          operator_id?: string | null
          role?: Database["public"]["Enums"]["member_role"] | null
          status?: Database["public"]["Enums"]["invitation_status"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          agency_id?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          kind?: Database["public"]["Enums"]["invitation_kind"]
          operator_id?: string | null
          role?: Database["public"]["Enums"]["member_role"] | null
          status?: Database["public"]["Enums"]["invitation_status"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      operator_members: {
        Row: {
          created_at: string
          operator_id: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          operator_id: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          operator_id?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operator_members_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      operators: {
        Row: {
          contact_email: string | null
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      passengers: {
        Row: {
          agency_id: string
          birth_date: string | null
          created_at: string
          created_by: string | null
          document_number: string | null
          document_type: string | null
          email: string | null
          full_name: string
          id: string
          notes: string | null
          passenger_type: Database["public"]["Enums"]["passenger_type"]
          phone: string | null
          quote_request_id: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          birth_date?: string | null
          created_at?: string
          created_by?: string | null
          document_number?: string | null
          document_type?: string | null
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          passenger_type?: Database["public"]["Enums"]["passenger_type"]
          phone?: string | null
          quote_request_id: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          birth_date?: string | null
          created_at?: string
          created_by?: string | null
          document_number?: string | null
          document_type?: string | null
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          passenger_type?: Database["public"]["Enums"]["passenger_type"]
          phone?: string | null
          quote_request_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "passengers_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "passengers_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          agency_id: string
          amount: number
          created_at: string
          currency: Database["public"]["Enums"]["currency"]
          due_date: string | null
          id: string
          notes: string | null
          operator_id: string
          quote_request_id: string
          receipt_uploaded_at: string | null
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          agency_id: string
          amount: number
          created_at?: string
          currency: Database["public"]["Enums"]["currency"]
          due_date?: string | null
          id?: string
          notes?: string | null
          operator_id: string
          quote_request_id: string
          receipt_uploaded_at?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          agency_id?: string
          amount?: number
          created_at?: string
          currency?: Database["public"]["Enums"]["currency"]
          due_date?: string | null
          id?: string
          notes?: string | null
          operator_id?: string
          quote_request_id?: string
          receipt_uploaded_at?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: true
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_items: {
        Row: {
          accepted_at: string | null
          amount: number
          created_at: string
          description: string
          id: string
          quote_id: string
          sort_order: number
        }
        Insert: {
          accepted_at?: string | null
          amount: number
          created_at?: string
          description: string
          id?: string
          quote_id: string
          sort_order?: number
        }
        Update: {
          accepted_at?: string | null
          amount?: number
          created_at?: string
          description?: string
          id?: string
          quote_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_request_dispatches: {
        Row: {
          id: string
          operator_id: string
          quote_request_id: string
          sent_at: string
        }
        Insert: {
          id?: string
          operator_id: string
          quote_request_id: string
          sent_at?: string
        }
        Update: {
          id?: string
          operator_id?: string
          quote_request_id?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_request_dispatches_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_request_dispatches_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_request_status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          from_status: Database["public"]["Enums"]["request_status"] | null
          id: string
          notes: string | null
          quote_request_id: string
          to_status: Database["public"]["Enums"]["request_status"]
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          from_status?: Database["public"]["Enums"]["request_status"] | null
          id?: string
          notes?: string | null
          quote_request_id: string
          to_status: Database["public"]["Enums"]["request_status"]
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          from_status?: Database["public"]["Enums"]["request_status"] | null
          id?: string
          notes?: string | null
          quote_request_id?: string
          to_status?: Database["public"]["Enums"]["request_status"]
        }
        Relationships: [
          {
            foreignKeyName: "quote_request_status_history_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_requests: {
        Row: {
          agency_id: string
          bsp_due_date: string | null
          client_email: string | null
          client_name: string
          client_phone: string | null
          code: string
          created_at: string
          created_by: string | null
          departure_date: string | null
          destination: string
          flexible_dates: boolean
          id: string
          issued_at: string | null
          notes: string | null
          pax_adults: number
          pax_children: number
          pax_infants: number
          return_date: string | null
          services: Database["public"]["Enums"]["service_type"][]
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
        }
        Insert: {
          agency_id: string
          bsp_due_date?: string | null
          client_email?: string | null
          client_name: string
          client_phone?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          departure_date?: string | null
          destination: string
          flexible_dates?: boolean
          id?: string
          issued_at?: string | null
          notes?: string | null
          pax_adults?: number
          pax_children?: number
          pax_infants?: number
          return_date?: string | null
          services?: Database["public"]["Enums"]["service_type"][]
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
        }
        Update: {
          agency_id?: string
          bsp_due_date?: string | null
          client_email?: string | null
          client_name?: string
          client_phone?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          departure_date?: string | null
          destination?: string
          flexible_dates?: boolean
          id?: string
          issued_at?: string | null
          notes?: string | null
          pax_adults?: number
          pax_children?: number
          pax_infants?: number
          return_date?: string | null
          services?: Database["public"]["Enums"]["service_type"][]
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_requests_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          currency: Database["public"]["Enums"]["currency"]
          exchange_rate_usd_ars: number | null
          id: string
          notes: string | null
          operator_id: string
          payment_terms: string | null
          quote_request_id: string
          status: Database["public"]["Enums"]["quote_status"]
          submitted_at: string
          submitted_by: string | null
          total_amount: number
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          currency: Database["public"]["Enums"]["currency"]
          exchange_rate_usd_ars?: number | null
          id?: string
          notes?: string | null
          operator_id: string
          payment_terms?: string | null
          quote_request_id: string
          status?: Database["public"]["Enums"]["quote_status"]
          submitted_at?: string
          submitted_by?: string | null
          total_amount: number
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          currency?: Database["public"]["Enums"]["currency"]
          exchange_rate_usd_ars?: number | null
          id?: string
          notes?: string | null
          operator_id?: string
          payment_terms?: string | null
          quote_request_id?: string
          status?: Database["public"]["Enums"]["quote_status"]
          submitted_at?: string
          submitted_by?: string | null
          total_amount?: number
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          agency_id: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          operator_id: string
          quote_request_id: string
          reservation_code: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          operator_id: string
          quote_request_id: string
          reservation_code: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          operator_id?: string
          quote_request_id?: string
          reservation_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: true
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invitation: { Args: { p_token: string }; Returns: Json }
      accept_quote: { Args: { p_quote_id: string }; Returns: undefined }
      accept_quote_items: {
        Args: { p_item_ids: string[]; p_quote_id: string }
        Returns: undefined
      }
      cancel_quote_request: {
        Args: { p_notes?: string; p_request_id: string }
        Returns: undefined
      }
      compute_bsp_due_date: {
        Args: { p_issued_at_date: string }
        Returns: string
      }
      create_agency: {
        Args: { p_name: string; p_slug: string }
        Returns: string
      }
      create_operator: {
        Args: { p_contact_email?: string; p_name: string; p_slug: string }
        Returns: string
      }
      create_operator_link_invitation: {
        Args: { p_agency_id: string; p_email: string }
        Returns: {
          id: string
          token: string
        }[]
      }
      create_quote_request: {
        Args: {
          p_agency_id: string
          p_client_email?: string
          p_client_name: string
          p_client_phone?: string
          p_departure_date?: string
          p_destination: string
          p_flexible_dates?: boolean
          p_notes?: string
          p_pax_adults?: number
          p_pax_children?: number
          p_pax_infants?: number
          p_return_date?: string
          p_services?: Database["public"]["Enums"]["service_type"][]
        }
        Returns: string
      }
      delete_attachment: { Args: { p_id: string }; Returns: string }
      delete_passenger: { Args: { p_id: string }; Returns: undefined }
      delete_quote_request: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      get_invitation_preview: {
        Args: { p_token: string }
        Returns: {
          agency_name: string
          email: string
          expires_at: string
          kind: Database["public"]["Enums"]["invitation_kind"]
          operator_name: string
          status: Database["public"]["Enums"]["invitation_status"]
        }[]
      }
      is_agency_admin: { Args: { p_agency_id: string }; Returns: boolean }
      is_agency_member: { Args: { p_agency_id: string }; Returns: boolean }
      is_operator_admin: { Args: { p_operator_id: string }; Returns: boolean }
      is_operator_dispatched_to_request: {
        Args: { p_request_id: string }
        Returns: boolean
      }
      is_operator_member: { Args: { p_operator_id: string }; Returns: boolean }
      mark_request_issued: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      pending_invitations_for_email: {
        Args: { p_email: string }
        Returns: {
          agency_name: string
          created_at: string
          email: string
          expires_at: string
          id: string
          kind: Database["public"]["Enums"]["invitation_kind"]
          operator_name: string
          token: string
        }[]
      }
      register_attachment: {
        Args: {
          p_file_name: string
          p_kind: Database["public"]["Enums"]["attachment_kind"]
          p_mime_type?: string
          p_operator_id?: string
          p_passenger_id?: string
          p_request_id: string
          p_size_bytes?: number
          p_storage_path: string
        }
        Returns: string
      }
      register_payment_receipt: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      reject_quote: { Args: { p_quote_id: string }; Returns: undefined }
      revoke_invitation: {
        Args: { p_invitation_id: string }
        Returns: undefined
      }
      send_quote_request: {
        Args: { p_operator_ids: string[]; p_request_id: string }
        Returns: undefined
      }
      submit_quote: {
        Args: {
          p_currency: Database["public"]["Enums"]["currency"]
          p_exchange_rate_usd_ars?: number
          p_items?: Json
          p_notes?: string
          p_payment_terms?: string
          p_request_id: string
          p_total_amount: number
          p_valid_until?: string
        }
        Returns: string
      }
      unregister_payment_receipt: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      update_quote_request: {
        Args: {
          p_client_email?: string
          p_client_name: string
          p_client_phone?: string
          p_departure_date?: string
          p_destination: string
          p_flexible_dates?: boolean
          p_notes?: string
          p_pax_adults?: number
          p_pax_children?: number
          p_pax_infants?: number
          p_request_id: string
          p_return_date?: string
          p_services?: Database["public"]["Enums"]["service_type"][]
        }
        Returns: undefined
      }
      upsert_passenger: {
        Args: {
          p_birth_date?: string
          p_document_number?: string
          p_document_type?: string
          p_email?: string
          p_full_name: string
          p_id?: string
          p_notes?: string
          p_passenger_type: Database["public"]["Enums"]["passenger_type"]
          p_phone?: string
          p_request_id: string
        }
        Returns: string
      }
      upsert_reservation: {
        Args: {
          p_notes?: string
          p_request_id: string
          p_reservation_code: string
        }
        Returns: string
      }
      verify_payment: {
        Args: { p_notes?: string; p_payment_id: string }
        Returns: undefined
      }
      withdraw_quote: { Args: { p_quote_id: string }; Returns: undefined }
    }
    Enums: {
      attachment_kind:
        | "passenger_doc"
        | "reservation"
        | "voucher"
        | "invoice"
        | "file_doc"
        | "payment_receipt"
      currency: "USD" | "ARS"
      invitation_kind: "agency_member" | "operator_member" | "operator_link"
      invitation_status: "pending" | "accepted" | "revoked" | "expired"
      member_role: "owner" | "admin" | "member"
      passenger_type: "adult" | "child" | "infant"
      quote_status:
        | "submitted"
        | "withdrawn"
        | "superseded"
        | "accepted"
        | "rejected"
      request_status:
        | "draft"
        | "sent"
        | "quoted"
        | "partially_accepted"
        | "accepted"
        | "reserved"
        | "docs_uploaded"
        | "issued"
        | "payment_pending"
        | "closed"
        | "cancelled"
      service_type:
        | "flights"
        | "hotel"
        | "transfers"
        | "excursions"
        | "package"
        | "cruise"
        | "insurance"
        | "other"
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
      attachment_kind: [
        "passenger_doc",
        "reservation",
        "voucher",
        "invoice",
        "file_doc",
        "payment_receipt",
      ],
      currency: ["USD", "ARS"],
      invitation_kind: ["agency_member", "operator_member", "operator_link"],
      invitation_status: ["pending", "accepted", "revoked", "expired"],
      member_role: ["owner", "admin", "member"],
      passenger_type: ["adult", "child", "infant"],
      quote_status: [
        "submitted",
        "withdrawn",
        "superseded",
        "accepted",
        "rejected",
      ],
      request_status: [
        "draft",
        "sent",
        "quoted",
        "partially_accepted",
        "accepted",
        "reserved",
        "docs_uploaded",
        "issued",
        "payment_pending",
        "closed",
        "cancelled",
      ],
      service_type: [
        "flights",
        "hotel",
        "transfers",
        "excursions",
        "package",
        "cruise",
        "insurance",
        "other",
      ],
    },
  },
} as const
