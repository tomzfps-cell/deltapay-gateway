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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      api_keys: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          merchant_id: string
          mode: string
          name: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          merchant_id: string
          mode?: string
          name: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          merchant_id?: string
          mode?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      crypto_trades: {
        Row: {
          created_at: string
          exchange: string
          exchange_order_id: string | null
          exchange_trade_id: string | null
          executed_at: string | null
          fee: number | null
          fee_currency: string | null
          id: string
          price: number
          quantity: number
          raw_response: Json | null
          side: string
          status: string
          total: number
          trading_pair: string
          treasury_operation_id: string | null
        }
        Insert: {
          created_at?: string
          exchange: string
          exchange_order_id?: string | null
          exchange_trade_id?: string | null
          executed_at?: string | null
          fee?: number | null
          fee_currency?: string | null
          id?: string
          price: number
          quantity: number
          raw_response?: Json | null
          side: string
          status?: string
          total: number
          trading_pair: string
          treasury_operation_id?: string | null
        }
        Update: {
          created_at?: string
          exchange?: string
          exchange_order_id?: string | null
          exchange_trade_id?: string | null
          executed_at?: string | null
          fee?: number | null
          fee_currency?: string | null
          id?: string
          price?: number
          quantity?: number
          raw_response?: Json | null
          side?: string
          status?: string
          total?: number
          trading_pair?: string
          treasury_operation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crypto_trades_treasury_operation_id_fkey"
            columns: ["treasury_operation_id"]
            isOneToOne: false
            referencedRelation: "treasury_operations"
            referencedColumns: ["id"]
          },
        ]
      }
      fx_snapshots: {
        Row: {
          captured_at: string
          from_currency: Database["public"]["Enums"]["currency_code"]
          id: string
          rate: number
          rate_inverse: number
          source: string
          to_currency: string
        }
        Insert: {
          captured_at?: string
          from_currency: Database["public"]["Enums"]["currency_code"]
          id?: string
          rate: number
          rate_inverse: number
          source?: string
          to_currency?: string
        }
        Update: {
          captured_at?: string
          from_currency?: Database["public"]["Enums"]["currency_code"]
          id?: string
          rate?: number
          rate_inverse?: number
          source?: string
          to_currency?: string
        }
        Relationships: []
      }
      gateway_pool_accounts: {
        Row: {
          account_holder: string
          alias: string | null
          bank_name: string | null
          cbu: string | null
          created_at: string
          cvu: string | null
          id: string
          is_active: boolean
          is_primary: boolean
          label: string
          updated_at: string
        }
        Insert: {
          account_holder: string
          alias?: string | null
          bank_name?: string | null
          cbu?: string | null
          created_at?: string
          cvu?: string | null
          id?: string
          is_active?: boolean
          is_primary?: boolean
          label: string
          updated_at?: string
        }
        Update: {
          account_holder?: string
          alias?: string | null
          bank_name?: string | null
          cbu?: string | null
          created_at?: string
          cvu?: string | null
          id?: string
          is_active?: boolean
          is_primary?: boolean
          label?: string
          updated_at?: string
        }
        Relationships: []
      }
      ledger_entries: {
        Row: {
          amount_usdt: number
          balance_after: number
          created_at: string
          description: string | null
          entry_type: Database["public"]["Enums"]["ledger_entry_type"]
          id: string
          merchant_id: string
          metadata: Json | null
          payment_id: string | null
          payout_id: string | null
        }
        Insert: {
          amount_usdt: number
          balance_after: number
          created_at?: string
          description?: string | null
          entry_type: Database["public"]["Enums"]["ledger_entry_type"]
          id?: string
          merchant_id: string
          metadata?: Json | null
          payment_id?: string | null
          payout_id?: string | null
        }
        Update: {
          amount_usdt?: number
          balance_after?: number
          created_at?: string
          description?: string | null
          entry_type?: Database["public"]["Enums"]["ledger_entry_type"]
          id?: string
          merchant_id?: string
          metadata?: Json | null
          payment_id?: string | null
          payout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "payouts"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_settings: {
        Row: {
          checkout_instructions: string | null
          created_at: string
          display_currency: string
          id: string
          locale: string
          merchant_id: string
          push_enabled: boolean
          timezone: string
          updated_at: string
        }
        Insert: {
          checkout_instructions?: string | null
          created_at?: string
          display_currency?: string
          id?: string
          locale?: string
          merchant_id: string
          push_enabled?: boolean
          timezone?: string
          updated_at?: string
        }
        Update: {
          checkout_instructions?: string | null
          created_at?: string
          display_currency?: string
          id?: string
          locale?: string
          merchant_id?: string
          push_enabled?: boolean
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_settings_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: true
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchants: {
        Row: {
          allowed_domains: string[] | null
          bank_alias: string | null
          bank_cbu: string | null
          bank_instructions: string | null
          business_name: string
          country: string
          created_at: string
          default_currency: Database["public"]["Enums"]["currency_code"]
          default_locale: string
          email: string
          fee_percentage: number
          id: string
          is_active: boolean
          is_verified: boolean
          legal_name: string | null
          phone: string | null
          signing_secret: string | null
          tax_id: string | null
          updated_at: string
          usdt_wallet_address: string | null
          usdt_wallet_network: string | null
          user_id: string | null
        }
        Insert: {
          allowed_domains?: string[] | null
          bank_alias?: string | null
          bank_cbu?: string | null
          bank_instructions?: string | null
          business_name: string
          country?: string
          created_at?: string
          default_currency?: Database["public"]["Enums"]["currency_code"]
          default_locale?: string
          email: string
          fee_percentage?: number
          id?: string
          is_active?: boolean
          is_verified?: boolean
          legal_name?: string | null
          phone?: string | null
          signing_secret?: string | null
          tax_id?: string | null
          updated_at?: string
          usdt_wallet_address?: string | null
          usdt_wallet_network?: string | null
          user_id?: string | null
        }
        Update: {
          allowed_domains?: string[] | null
          bank_alias?: string | null
          bank_cbu?: string | null
          bank_instructions?: string | null
          business_name?: string
          country?: string
          created_at?: string
          default_currency?: Database["public"]["Enums"]["currency_code"]
          default_locale?: string
          email?: string
          fee_percentage?: number
          id?: string
          is_active?: boolean
          is_verified?: boolean
          legal_name?: string | null
          phone?: string | null
          signing_secret?: string | null
          tax_id?: string | null
          updated_at?: string
          usdt_wallet_address?: string | null
          usdt_wallet_network?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_local: number
          amount_usdt_gross: number | null
          amount_usdt_net: number | null
          confirmed_at: string | null
          created_at: string
          currency: Database["public"]["Enums"]["currency_code"]
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          expires_at: string
          fee_usdt: number | null
          fx_snapshot_id: string | null
          id: string
          idempotency_key: string | null
          merchant_id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_reference: string | null
          pool_account_id: string | null
          pool_account_snapshot_alias: string | null
          pool_account_snapshot_bank: string | null
          pool_account_snapshot_cbu: string | null
          pool_account_snapshot_cvu: string | null
          pool_account_snapshot_holder: string | null
          product_id: string | null
          redirect_url: string | null
          snapshot_currency: string | null
          snapshot_price: number | null
          snapshot_redirect_url: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount_local: number
          amount_usdt_gross?: number | null
          amount_usdt_net?: number | null
          confirmed_at?: string | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          expires_at?: string
          fee_usdt?: number | null
          fx_snapshot_id?: string | null
          id?: string
          idempotency_key?: string | null
          merchant_id: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_reference?: string | null
          pool_account_id?: string | null
          pool_account_snapshot_alias?: string | null
          pool_account_snapshot_bank?: string | null
          pool_account_snapshot_cbu?: string | null
          pool_account_snapshot_cvu?: string | null
          pool_account_snapshot_holder?: string | null
          product_id?: string | null
          redirect_url?: string | null
          snapshot_currency?: string | null
          snapshot_price?: number | null
          snapshot_redirect_url?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount_local?: number
          amount_usdt_gross?: number | null
          amount_usdt_net?: number | null
          confirmed_at?: string | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          expires_at?: string
          fee_usdt?: number | null
          fx_snapshot_id?: string | null
          id?: string
          idempotency_key?: string | null
          merchant_id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_reference?: string | null
          pool_account_id?: string | null
          pool_account_snapshot_alias?: string | null
          pool_account_snapshot_bank?: string | null
          pool_account_snapshot_cbu?: string | null
          pool_account_snapshot_cvu?: string | null
          pool_account_snapshot_holder?: string | null
          product_id?: string | null
          redirect_url?: string | null
          snapshot_currency?: string | null
          snapshot_price?: number | null
          snapshot_redirect_url?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_fx_snapshot_id_fkey"
            columns: ["fx_snapshot_id"]
            isOneToOne: false
            referencedRelation: "fx_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_pool_account_id_fkey"
            columns: ["pool_account_id"]
            isOneToOne: false
            referencedRelation: "gateway_pool_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          amount_usdt: number
          approved_at: string | null
          completed_at: string | null
          failed_at: string | null
          failure_reason: string | null
          fx_snapshot_id: string | null
          id: string
          idempotency_key: string | null
          merchant_id: string
          requested_at: string
          sent_at: string | null
          status: Database["public"]["Enums"]["payout_status"]
          tx_hash: string | null
          wallet_address: string
          wallet_network: string
        }
        Insert: {
          amount_usdt: number
          approved_at?: string | null
          completed_at?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          fx_snapshot_id?: string | null
          id?: string
          idempotency_key?: string | null
          merchant_id: string
          requested_at?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
          tx_hash?: string | null
          wallet_address: string
          wallet_network?: string
        }
        Update: {
          amount_usdt?: number
          approved_at?: string | null
          completed_at?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          fx_snapshot_id?: string | null
          id?: string
          idempotency_key?: string | null
          merchant_id?: string
          requested_at?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
          tx_hash?: string | null
          wallet_address?: string
          wallet_network?: string
        }
        Relationships: [
          {
            foreignKeyName: "payouts_fx_snapshot_id_fkey"
            columns: ["fx_snapshot_id"]
            isOneToOne: false
            referencedRelation: "fx_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string
          currency: Database["public"]["Enums"]["currency_code"]
          description: string | null
          id: string
          is_active: boolean
          merchant_id: string
          name: string
          price: number
          redirect_url: string | null
          slug: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          description?: string | null
          id?: string
          is_active?: boolean
          merchant_id: string
          name: string
          price: number
          redirect_url?: string | null
          slug?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          description?: string | null
          id?: string
          is_active?: boolean
          merchant_id?: string
          name?: string
          price?: number
          redirect_url?: string | null
          slug?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          is_active: boolean
          merchant_id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          is_active?: boolean
          merchant_id: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          is_active?: boolean
          merchant_id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      treasury_config: {
        Row: {
          created_at: string
          daily_conversion_limit: number
          id: string
          is_active: boolean
          liquidity_buffer_percentage: number
          max_ars_per_order: number
          min_ars_to_convert: number
          min_usdt_balance: number
          mode: Database["public"]["Enums"]["treasury_mode"]
          preferred_exchange: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          daily_conversion_limit?: number
          id?: string
          is_active?: boolean
          liquidity_buffer_percentage?: number
          max_ars_per_order?: number
          min_ars_to_convert?: number
          min_usdt_balance?: number
          mode?: Database["public"]["Enums"]["treasury_mode"]
          preferred_exchange?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          daily_conversion_limit?: number
          id?: string
          is_active?: boolean
          liquidity_buffer_percentage?: number
          max_ars_per_order?: number
          min_ars_to_convert?: number
          min_usdt_balance?: number
          mode?: Database["public"]["Enums"]["treasury_mode"]
          preferred_exchange?: string
          updated_at?: string
        }
        Relationships: []
      }
      treasury_operations: {
        Row: {
          amount_ars: number | null
          amount_usdt: number
          approved_by: string | null
          completed_at: string | null
          created_at: string
          exchange: string
          exchange_order_id: string | null
          executed_at: string | null
          failure_reason: string | null
          fx_rate: number
          id: string
          idempotency_key: string | null
          initiated_by: string | null
          operation_type: Database["public"]["Enums"]["treasury_op_type"]
          status: Database["public"]["Enums"]["treasury_op_status"]
        }
        Insert: {
          amount_ars?: number | null
          amount_usdt: number
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string
          exchange?: string
          exchange_order_id?: string | null
          executed_at?: string | null
          failure_reason?: string | null
          fx_rate: number
          id?: string
          idempotency_key?: string | null
          initiated_by?: string | null
          operation_type: Database["public"]["Enums"]["treasury_op_type"]
          status?: Database["public"]["Enums"]["treasury_op_status"]
        }
        Update: {
          amount_ars?: number | null
          amount_usdt?: number
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string
          exchange?: string
          exchange_order_id?: string | null
          executed_at?: string | null
          failure_reason?: string | null
          fx_rate?: number
          id?: string
          idempotency_key?: string | null
          initiated_by?: string | null
          operation_type?: Database["public"]["Enums"]["treasury_op_type"]
          status?: Database["public"]["Enums"]["treasury_op_status"]
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          merchant_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          merchant_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          merchant_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_deliveries: {
        Row: {
          attempt_count: number
          created_at: string
          delivered_at: string | null
          event_type: string
          id: string
          next_retry_at: string | null
          payload: Json
          response_body: string | null
          response_status: number | null
          webhook_id: string
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          delivered_at?: string | null
          event_type: string
          id?: string
          next_retry_at?: string | null
          payload: Json
          response_body?: string | null
          response_status?: number | null
          webhook_id: string
        }
        Update: {
          attempt_count?: number
          created_at?: string
          delivered_at?: string | null
          event_type?: string
          id?: string
          next_retry_at?: string | null
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          created_at: string
          events: string[]
          id: string
          is_active: boolean
          merchant_id: string
          secret_key: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          events?: string[]
          id?: string
          is_active?: boolean
          merchant_id: string
          secret_key?: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          events?: string[]
          id?: string
          is_active?: boolean
          merchant_id?: string
          secret_key?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      confirm_payment: {
        Args: { _fx_rate: number; _payment_id: string }
        Returns: Json
      }
      create_merchant_for_user: {
        Args: {
          _business_name: string
          _country?: string
          _email: string
          _user_id: string
        }
        Returns: Json
      }
      create_payment_from_product_slug: {
        Args: {
          _customer_email?: string
          _customer_name?: string
          _customer_phone?: string
          _product_slug: string
        }
        Returns: Json
      }
      generate_payment_redirect_signature: {
        Args: { _payment_id: string }
        Returns: Json
      }
      generate_payment_reference: { Args: never; Returns: string }
      get_merchant_balance: {
        Args: { _merchant_id: string }
        Returns: {
          balance_available: number
          balance_pending: number
          balance_total: number
        }[]
      }
      get_public_payment_view: { Args: { _payment_id: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      request_payout: {
        Args: {
          _amount_usdt: number
          _idempotency_key?: string
          _merchant_id: string
        }
        Returns: Json
      }
      user_belongs_to_merchant: {
        Args: { _merchant_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "merchant" | "merchant_user"
      currency_code: "ARS" | "BRL" | "USD"
      ledger_entry_type:
        | "credit_payment"
        | "debit_fee"
        | "debit_payout"
        | "credit_refund"
        | "debit_chargeback"
      payment_method: "qr" | "transfer"
      payment_status: "created" | "pending" | "confirmed" | "expired" | "failed"
      payout_status: "requested" | "approved" | "sent" | "completed" | "failed"
      treasury_mode: "manual" | "semi_automatic" | "automatic"
      treasury_op_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "cancelled"
      treasury_op_type:
        | "buy_usdt"
        | "sell_usdt"
        | "transfer_in"
        | "transfer_out"
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
      app_role: ["admin", "merchant", "merchant_user"],
      currency_code: ["ARS", "BRL", "USD"],
      ledger_entry_type: [
        "credit_payment",
        "debit_fee",
        "debit_payout",
        "credit_refund",
        "debit_chargeback",
      ],
      payment_method: ["qr", "transfer"],
      payment_status: ["created", "pending", "confirmed", "expired", "failed"],
      payout_status: ["requested", "approved", "sent", "completed", "failed"],
      treasury_mode: ["manual", "semi_automatic", "automatic"],
      treasury_op_status: [
        "pending",
        "processing",
        "completed",
        "failed",
        "cancelled",
      ],
      treasury_op_type: [
        "buy_usdt",
        "sell_usdt",
        "transfer_in",
        "transfer_out",
      ],
    },
  },
} as const
