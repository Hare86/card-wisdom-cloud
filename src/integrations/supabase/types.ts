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
      ai_evaluations: {
        Row: {
          context_used: string[] | null
          created_at: string
          faithfulness_score: number | null
          id: string
          latency_ms: number | null
          model_used: string | null
          query: string
          relevance_score: number | null
          response: string
          user_feedback: number | null
          user_id: string | null
        }
        Insert: {
          context_used?: string[] | null
          created_at?: string
          faithfulness_score?: number | null
          id?: string
          latency_ms?: number | null
          model_used?: string | null
          query: string
          relevance_score?: number | null
          response: string
          user_feedback?: number | null
          user_id?: string | null
        }
        Update: {
          context_used?: string[] | null
          created_at?: string
          faithfulness_score?: number | null
          id?: string
          latency_ms?: number | null
          model_used?: string | null
          query?: string
          relevance_score?: number | null
          response?: string
          user_feedback?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      card_benefits: {
        Row: {
          bank_name: string
          benefit_category: string
          benefit_description: string
          benefit_title: string
          card_name: string
          conditions: string | null
          embedding: string | null
          id: string
          is_active: boolean | null
          last_updated: string
          source_url: string | null
          value_estimate: number | null
        }
        Insert: {
          bank_name: string
          benefit_category: string
          benefit_description: string
          benefit_title: string
          card_name: string
          conditions?: string | null
          embedding?: string | null
          id?: string
          is_active?: boolean | null
          last_updated?: string
          source_url?: string | null
          value_estimate?: number | null
        }
        Update: {
          bank_name?: string
          benefit_category?: string
          benefit_description?: string
          benefit_title?: string
          card_name?: string
          conditions?: string | null
          embedding?: string | null
          id?: string
          is_active?: boolean | null
          last_updated?: string
          source_url?: string | null
          value_estimate?: number | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      compliance_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          pii_accessed: boolean | null
          pii_masked: boolean | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          pii_accessed?: boolean | null
          pii_masked?: boolean | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          pii_accessed?: boolean | null
          pii_masked?: boolean | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      credit_cards: {
        Row: {
          bank_name: string
          card_name: string
          created_at: string
          id: string
          last_four: string | null
          point_value: number | null
          points: number | null
          updated_at: string
          user_id: string
          variant: string | null
        }
        Insert: {
          bank_name: string
          card_name: string
          created_at?: string
          id?: string
          last_four?: string | null
          point_value?: number | null
          points?: number | null
          updated_at?: string
          user_id: string
          variant?: string | null
        }
        Update: {
          bank_name?: string
          card_name?: string
          created_at?: string
          id?: string
          last_four?: string | null
          point_value?: number | null
          points?: number | null
          updated_at?: string
          user_id?: string
          variant?: string | null
        }
        Relationships: []
      }
      document_chunks: {
        Row: {
          chunk_index: number
          chunk_text: string
          created_at: string
          document_id: string | null
          embedding: string | null
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          chunk_index: number
          chunk_text: string
          created_at?: string
          document_id?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          chunk_index?: number
          chunk_text?: string
          created_at?: string
          document_id?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "pdf_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      extraction_audit_log: {
        Row: {
          confidence_score: number | null
          created_at: string
          document_id: string | null
          error_message: string | null
          extraction_method: string
          extraction_status: string
          fields_extracted: number
          id: string
          ip_address: string | null
          llm_model_used: string | null
          llm_tokens_input: number | null
          llm_tokens_output: number | null
          password_protected: boolean
          pii_fields_masked: number
          processing_time_ms: number | null
          template_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          document_id?: string | null
          error_message?: string | null
          extraction_method: string
          extraction_status?: string
          fields_extracted?: number
          id?: string
          ip_address?: string | null
          llm_model_used?: string | null
          llm_tokens_input?: number | null
          llm_tokens_output?: number | null
          password_protected?: boolean
          pii_fields_masked?: number
          processing_time_ms?: number | null
          template_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          document_id?: string | null
          error_message?: string | null
          extraction_method?: string
          extraction_status?: string
          fields_extracted?: number
          id?: string
          ip_address?: string | null
          llm_model_used?: string | null
          llm_tokens_input?: number | null
          llm_tokens_output?: number | null
          password_protected?: boolean
          pii_fields_masked?: number
          processing_time_ms?: number | null
          template_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "extraction_audit_log_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "pdf_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extraction_audit_log_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "statement_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      pdf_documents: {
        Row: {
          created_at: string
          document_type: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          parsed_data: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          document_type?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          parsed_data?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          document_type?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          parsed_data?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      pii_masking_log: {
        Row: {
          created_at: string
          fields_masked: number | null
          id: string
          pii_types_found: string[] | null
          source_type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          fields_masked?: number | null
          id?: string
          pii_types_found?: string[] | null
          source_type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          fields_masked?: number | null
          id?: string
          pii_types_found?: string[] | null
          source_type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      query_cache: {
        Row: {
          created_at: string
          expires_at: string
          hit_count: number | null
          id: string
          model_used: string
          query_embedding: string | null
          query_hash: string
          query_text: string
          response: string
          tokens_input: number | null
          tokens_output: number | null
        }
        Insert: {
          created_at?: string
          expires_at?: string
          hit_count?: number | null
          id?: string
          model_used: string
          query_embedding?: string | null
          query_hash: string
          query_text: string
          response: string
          tokens_input?: number | null
          tokens_output?: number | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          hit_count?: number | null
          id?: string
          model_used?: string
          query_embedding?: string | null
          query_hash?: string
          query_text?: string
          response?: string
          tokens_input?: number | null
          tokens_output?: number | null
        }
        Relationships: []
      }
      statement_templates: {
        Row: {
          bank_name: string
          confidence_threshold: number
          created_at: string
          extraction_failure_count: number
          extraction_success_count: number
          field_patterns: Json
          header_patterns: Json
          id: string
          is_active: boolean
          last_successful_extraction: string | null
          table_patterns: Json
          template_hash: string
          template_version: number
          updated_at: string
        }
        Insert: {
          bank_name: string
          confidence_threshold?: number
          created_at?: string
          extraction_failure_count?: number
          extraction_success_count?: number
          field_patterns?: Json
          header_patterns?: Json
          id?: string
          is_active?: boolean
          last_successful_extraction?: string | null
          table_patterns?: Json
          template_hash: string
          template_version?: number
          updated_at?: string
        }
        Update: {
          bank_name?: string
          confidence_threshold?: number
          created_at?: string
          extraction_failure_count?: number
          extraction_success_count?: number
          field_patterns?: Json
          header_patterns?: Json
          id?: string
          is_active?: boolean
          last_successful_extraction?: string | null
          table_patterns?: Json
          template_hash?: string
          template_version?: number
          updated_at?: string
        }
        Relationships: []
      }
      token_usage: {
        Row: {
          cache_hit: boolean | null
          created_at: string
          estimated_cost: number | null
          id: string
          model: string
          query_type: string | null
          tokens_input: number
          tokens_output: number
          user_id: string | null
        }
        Insert: {
          cache_hit?: boolean | null
          created_at?: string
          estimated_cost?: number | null
          id?: string
          model: string
          query_type?: string | null
          tokens_input?: number
          tokens_output?: number
          user_id?: string | null
        }
        Update: {
          cache_hit?: boolean | null
          created_at?: string
          estimated_cost?: number | null
          id?: string
          model?: string
          query_type?: string | null
          tokens_input?: number
          tokens_output?: number
          user_id?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          card_id: string | null
          category: string | null
          created_at: string
          description: string
          document_id: string | null
          id: string
          is_masked: boolean | null
          merchant_name: string | null
          points_earned: number | null
          raw_data: Json | null
          transaction_date: string
          user_id: string
        }
        Insert: {
          amount: number
          card_id?: string | null
          category?: string | null
          created_at?: string
          description: string
          document_id?: string | null
          id?: string
          is_masked?: boolean | null
          merchant_name?: string | null
          points_earned?: number | null
          raw_data?: Json | null
          transaction_date: string
          user_id: string
        }
        Update: {
          amount?: number
          card_id?: string | null
          category?: string | null
          created_at?: string
          description?: string
          document_id?: string | null
          id?: string
          is_masked?: boolean | null
          merchant_name?: string | null
          points_earned?: number | null
          raw_data?: Json | null
          transaction_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "pdf_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      user_alerts: {
        Row: {
          action_url: string | null
          alert_type: string
          card_id: string | null
          created_at: string
          description: string | null
          expires_at: string | null
          id: string
          is_read: boolean | null
          priority: string | null
          title: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          alert_type: string
          card_id?: string | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          priority?: string | null
          title: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          alert_type?: string
          card_id?: string | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          priority?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_alerts_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      find_similar_cache: {
        Args: {
          max_results?: number
          query_emb: string
          similarity_threshold?: number
        }
        Returns: {
          id: string
          query_text: string
          response: string
          similarity: number
        }[]
      }
      increment_cache_hit: { Args: { cache_id: string }; Returns: undefined }
      search_benefits: {
        Args: { match_count?: number; query_emb: string }
        Returns: {
          bank_name: string
          benefit_description: string
          benefit_title: string
          card_name: string
          id: string
          similarity: number
        }[]
      }
      search_documents: {
        Args: { match_count?: number; query_emb: string; user_uuid: string }
        Returns: {
          chunk_text: string
          id: string
          metadata: Json
          similarity: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
