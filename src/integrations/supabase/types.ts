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
      approval_history: {
        Row: {
          approval_role: Database["public"]["Enums"]["approval_role"]
          approved_by: string | null
          comments: string | null
          created_at: string
          id: string
          quotation_id: string
          status: string
        }
        Insert: {
          approval_role: Database["public"]["Enums"]["approval_role"]
          approved_by?: string | null
          comments?: string | null
          created_at?: string
          id?: string
          quotation_id: string
          status: string
        }
        Update: {
          approval_role?: Database["public"]["Enums"]["approval_role"]
          approved_by?: string | null
          comments?: string | null
          created_at?: string
          id?: string
          quotation_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_history_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_history_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      fees_tax: {
        Row: {
          admin_fee: number
          created_at: string
          effective_date: string
          id: string
          insurer_code: string
          notes: string | null
          stamp_duty: number
          updated_at: string
          vat_percent: number
        }
        Insert: {
          admin_fee?: number
          created_at?: string
          effective_date: string
          id?: string
          insurer_code: string
          notes?: string | null
          stamp_duty?: number
          updated_at?: string
          vat_percent?: number
        }
        Update: {
          admin_fee?: number
          created_at?: string
          effective_date?: string
          id?: string
          insurer_code?: string
          notes?: string | null
          stamp_duty?: number
          updated_at?: string
          vat_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "fees_tax_insurer_code_fkey"
            columns: ["insurer_code"]
            isOneToOne: false
            referencedRelation: "master_insurer"
            referencedColumns: ["insurer_code"]
          },
        ]
      }
      insurance_companies: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      master_benefit_item: {
        Row: {
          created_at: string
          display_order: number
          is_active: boolean
          is_group_header: boolean
          item_code: string
          item_name: string
          limit_period: string | null
          parent_item_code: string | null
          section_code: string
          sub_label: string | null
          unit_text: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          is_active?: boolean
          is_group_header?: boolean
          item_code: string
          item_name: string
          limit_period?: string | null
          parent_item_code?: string | null
          section_code: string
          sub_label?: string | null
          unit_text?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          is_active?: boolean
          is_group_header?: boolean
          item_code?: string
          item_name?: string
          limit_period?: string | null
          parent_item_code?: string | null
          section_code?: string
          sub_label?: string | null
          unit_text?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "master_benefit_item_parent_item_code_fkey"
            columns: ["parent_item_code"]
            isOneToOne: false
            referencedRelation: "master_benefit_item"
            referencedColumns: ["item_code"]
          },
          {
            foreignKeyName: "master_benefit_item_section_code_fkey"
            columns: ["section_code"]
            isOneToOne: false
            referencedRelation: "master_benefit_section"
            referencedColumns: ["section_code"]
          },
        ]
      }
      master_benefit_section: {
        Row: {
          created_at: string
          display_order: number
          is_active: boolean
          section_code: string
          section_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          is_active?: boolean
          section_code: string
          section_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          is_active?: boolean
          section_code?: string
          section_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      master_coverage_rule: {
        Row: {
          coverage_rule_code: string
          coverage_rule_name: string
          created_at: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          coverage_rule_code: string
          coverage_rule_name: string
          created_at?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          coverage_rule_code?: string
          coverage_rule_name?: string
          created_at?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      master_insurer: {
        Row: {
          created_at: string
          insurer_code: string
          insurer_name: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          insurer_code: string
          insurer_name: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          insurer_code?: string
          insurer_name?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      master_tier: {
        Row: {
          created_at: string
          insurer_code: string | null
          is_active: boolean
          section_code: string
          tier_code: string
          tier_label: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          insurer_code?: string | null
          is_active?: boolean
          section_code: string
          tier_code: string
          tier_label: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          insurer_code?: string | null
          is_active?: boolean
          section_code?: string
          tier_code?: string
          tier_label?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "master_tier_insurer_code_fkey"
            columns: ["insurer_code"]
            isOneToOne: false
            referencedRelation: "master_insurer"
            referencedColumns: ["insurer_code"]
          },
          {
            foreignKeyName: "master_tier_section_code_fkey"
            columns: ["section_code"]
            isOneToOne: false
            referencedRelation: "master_benefit_section"
            referencedColumns: ["section_code"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          quotation_id: string | null
          target_role: Database["public"]["Enums"]["user_role"] | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          quotation_id?: string | null
          target_role?: Database["public"]["Enums"]["user_role"] | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          quotation_id?: string | null
          target_role?: Database["public"]["Enums"]["user_role"] | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_section_age: {
        Row: {
          annual_premium: number
          coverage_rule_code: string
          created_at: string
          currency: string
          demographic: Database["public"]["Enums"]["demographic_type"]
          effective_date: string
          insurer_code: string
          section_code: string
          tier_code: string
          updated_at: string
        }
        Insert: {
          annual_premium?: number
          coverage_rule_code: string
          created_at?: string
          currency?: string
          demographic: Database["public"]["Enums"]["demographic_type"]
          effective_date: string
          insurer_code: string
          section_code: string
          tier_code: string
          updated_at?: string
        }
        Update: {
          annual_premium?: number
          coverage_rule_code?: string
          created_at?: string
          currency?: string
          demographic?: Database["public"]["Enums"]["demographic_type"]
          effective_date?: string
          insurer_code?: string
          section_code?: string
          tier_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_section_age_coverage_rule_code_fkey"
            columns: ["coverage_rule_code"]
            isOneToOne: false
            referencedRelation: "master_coverage_rule"
            referencedColumns: ["coverage_rule_code"]
          },
          {
            foreignKeyName: "pricing_section_age_insurer_code_fkey"
            columns: ["insurer_code"]
            isOneToOne: false
            referencedRelation: "master_insurer"
            referencedColumns: ["insurer_code"]
          },
          {
            foreignKeyName: "pricing_section_age_section_code_fkey"
            columns: ["section_code"]
            isOneToOne: false
            referencedRelation: "master_benefit_section"
            referencedColumns: ["section_code"]
          },
          {
            foreignKeyName: "pricing_section_age_tier_code_fkey"
            columns: ["tier_code"]
            isOneToOne: false
            referencedRelation: "master_tier"
            referencedColumns: ["tier_code"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          is_admin: boolean
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          is_active?: boolean
          is_admin?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          is_admin?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quotation_benefit_schedule_item: {
        Row: {
          created_at: string
          currency: string | null
          display_order: number
          id: string
          insurer_code: string
          is_group_header: boolean
          item_code: string
          item_name: string
          limit_period: string | null
          package_id: string
          quotation_id: string
          section_code: string
          sub_label: string | null
          unit_text: string | null
          value_amount: number | null
          value_text: string | null
          value_type: Database["public"]["Enums"]["value_type"]
        }
        Insert: {
          created_at?: string
          currency?: string | null
          display_order?: number
          id?: string
          insurer_code: string
          is_group_header?: boolean
          item_code: string
          item_name: string
          limit_period?: string | null
          package_id: string
          quotation_id: string
          section_code: string
          sub_label?: string | null
          unit_text?: string | null
          value_amount?: number | null
          value_text?: string | null
          value_type?: Database["public"]["Enums"]["value_type"]
        }
        Update: {
          created_at?: string
          currency?: string | null
          display_order?: number
          id?: string
          insurer_code?: string
          is_group_header?: boolean
          item_code?: string
          item_name?: string
          limit_period?: string | null
          package_id?: string
          quotation_id?: string
          section_code?: string
          sub_label?: string | null
          unit_text?: string | null
          value_amount?: number | null
          value_text?: string | null
          value_type?: Database["public"]["Enums"]["value_type"]
        }
        Relationships: [
          {
            foreignKeyName: "quotation_benefit_schedule_item_insurer_code_fkey"
            columns: ["insurer_code"]
            isOneToOne: false
            referencedRelation: "master_insurer"
            referencedColumns: ["insurer_code"]
          },
          {
            foreignKeyName: "quotation_benefit_schedule_item_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "quotation_package"
            referencedColumns: ["package_id"]
          },
          {
            foreignKeyName: "quotation_benefit_schedule_item_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_benefit_schedule_item_section_code_fkey"
            columns: ["section_code"]
            isOneToOne: false
            referencedRelation: "master_benefit_section"
            referencedColumns: ["section_code"]
          },
        ]
      }
      quotation_package: {
        Row: {
          created_at: string
          package_description: string | null
          package_id: string
          package_name: string
          quotation_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          package_description?: string | null
          package_id?: string
          package_name: string
          quotation_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          package_description?: string | null
          package_id?: string
          package_name?: string
          quotation_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotation_package_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_package_census: {
        Row: {
          created_at: string
          demographic: Database["public"]["Enums"]["demographic_type"]
          lives: number
          package_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          demographic: Database["public"]["Enums"]["demographic_type"]
          lives?: number
          package_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          demographic?: Database["public"]["Enums"]["demographic_type"]
          lives?: number
          package_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotation_package_census_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "quotation_package"
            referencedColumns: ["package_id"]
          },
        ]
      }
      quotation_package_insurer_offer: {
        Row: {
          created_at: string
          insurer_code: string
          notes: string | null
          offer_id: string
          offered_tier_code: string | null
          package_id: string
          pricing_effective_date_used: string | null
          section_code: string
          status: Database["public"]["Enums"]["offer_status"]
          template_id_used: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          insurer_code: string
          notes?: string | null
          offer_id?: string
          offered_tier_code?: string | null
          package_id: string
          pricing_effective_date_used?: string | null
          section_code: string
          status?: Database["public"]["Enums"]["offer_status"]
          template_id_used?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          insurer_code?: string
          notes?: string | null
          offer_id?: string
          offered_tier_code?: string | null
          package_id?: string
          pricing_effective_date_used?: string | null
          section_code?: string
          status?: Database["public"]["Enums"]["offer_status"]
          template_id_used?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotation_package_insurer_offer_insurer_code_fkey"
            columns: ["insurer_code"]
            isOneToOne: false
            referencedRelation: "master_insurer"
            referencedColumns: ["insurer_code"]
          },
          {
            foreignKeyName: "quotation_package_insurer_offer_offered_tier_code_fkey"
            columns: ["offered_tier_code"]
            isOneToOne: false
            referencedRelation: "master_tier"
            referencedColumns: ["tier_code"]
          },
          {
            foreignKeyName: "quotation_package_insurer_offer_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "quotation_package"
            referencedColumns: ["package_id"]
          },
          {
            foreignKeyName: "quotation_package_insurer_offer_section_code_fkey"
            columns: ["section_code"]
            isOneToOne: false
            referencedRelation: "master_benefit_section"
            referencedColumns: ["section_code"]
          },
          {
            foreignKeyName: "quotation_package_insurer_offer_template_id_used_fkey"
            columns: ["template_id_used"]
            isOneToOne: false
            referencedRelation: "schedule_template_section_header"
            referencedColumns: ["template_id"]
          },
        ]
      }
      quotation_package_requested_tier: {
        Row: {
          created_at: string
          package_id: string
          requested_tier_code: string | null
          section_code: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          package_id: string
          requested_tier_code?: string | null
          section_code: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          package_id?: string
          requested_tier_code?: string | null
          section_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotation_package_requested_tier_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "quotation_package"
            referencedColumns: ["package_id"]
          },
          {
            foreignKeyName: "quotation_package_requested_tier_requested_tier_code_fkey"
            columns: ["requested_tier_code"]
            isOneToOne: false
            referencedRelation: "master_tier"
            referencedColumns: ["tier_code"]
          },
          {
            foreignKeyName: "quotation_package_requested_tier_section_code_fkey"
            columns: ["section_code"]
            isOneToOne: false
            referencedRelation: "master_benefit_section"
            referencedColumns: ["section_code"]
          },
        ]
      }
      quotation_premium_detail: {
        Row: {
          annual_premium_per_member: number
          annual_premium_total: number
          created_at: string
          demographic: Database["public"]["Enums"]["demographic_type"]
          id: string
          insurer_code: string
          lives: number
          package_id: string
          quotation_id: string
          section_code: string
        }
        Insert: {
          annual_premium_per_member?: number
          annual_premium_total?: number
          created_at?: string
          demographic: Database["public"]["Enums"]["demographic_type"]
          id?: string
          insurer_code: string
          lives?: number
          package_id: string
          quotation_id: string
          section_code: string
        }
        Update: {
          annual_premium_per_member?: number
          annual_premium_total?: number
          created_at?: string
          demographic?: Database["public"]["Enums"]["demographic_type"]
          id?: string
          insurer_code?: string
          lives?: number
          package_id?: string
          quotation_id?: string
          section_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotation_premium_detail_insurer_code_fkey"
            columns: ["insurer_code"]
            isOneToOne: false
            referencedRelation: "master_insurer"
            referencedColumns: ["insurer_code"]
          },
          {
            foreignKeyName: "quotation_premium_detail_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "quotation_package"
            referencedColumns: ["package_id"]
          },
          {
            foreignKeyName: "quotation_premium_detail_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_premium_detail_section_code_fkey"
            columns: ["section_code"]
            isOneToOne: false
            referencedRelation: "master_benefit_section"
            referencedColumns: ["section_code"]
          },
        ]
      }
      quotation_premium_overall: {
        Row: {
          admin_fee: number | null
          created_at: string
          grand_total: number
          gross_total_all_packages: number
          id: string
          insurer_code: string
          quotation_id: string
          stamp_duty: number | null
          vat_amount: number | null
        }
        Insert: {
          admin_fee?: number | null
          created_at?: string
          grand_total?: number
          gross_total_all_packages?: number
          id?: string
          insurer_code: string
          quotation_id: string
          stamp_duty?: number | null
          vat_amount?: number | null
        }
        Update: {
          admin_fee?: number | null
          created_at?: string
          grand_total?: number
          gross_total_all_packages?: number
          id?: string
          insurer_code?: string
          quotation_id?: string
          stamp_duty?: number | null
          vat_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quotation_premium_overall_insurer_code_fkey"
            columns: ["insurer_code"]
            isOneToOne: false
            referencedRelation: "master_insurer"
            referencedColumns: ["insurer_code"]
          },
          {
            foreignKeyName: "quotation_premium_overall_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_premium_summary: {
        Row: {
          created_at: string
          fees_package: number | null
          gross_premium_package: number
          id: string
          insurer_code: string
          package_id: string
          quotation_id: string
          tax_package: number | null
        }
        Insert: {
          created_at?: string
          fees_package?: number | null
          gross_premium_package?: number
          id?: string
          insurer_code: string
          package_id: string
          quotation_id: string
          tax_package?: number | null
        }
        Update: {
          created_at?: string
          fees_package?: number | null
          gross_premium_package?: number
          id?: string
          insurer_code?: string
          package_id?: string
          quotation_id?: string
          tax_package?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quotation_premium_summary_insurer_code_fkey"
            columns: ["insurer_code"]
            isOneToOne: false
            referencedRelation: "master_insurer"
            referencedColumns: ["insurer_code"]
          },
          {
            foreignKeyName: "quotation_premium_summary_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "quotation_package"
            referencedColumns: ["package_id"]
          },
          {
            foreignKeyName: "quotation_premium_summary_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          benefits: Json
          benefits_option: string
          coverage_rule_code: string | null
          created_at: string
          created_by: string
          end_date: string
          id: string
          insurance_companies: string[]
          insured_address: string
          insured_groups: Json
          insured_name: string
          line_of_business: string | null
          quotation_number: string
          start_date: string
          status: Database["public"]["Enums"]["quotation_status"]
          updated_at: string
          version: number
        }
        Insert: {
          benefits: Json
          benefits_option: string
          coverage_rule_code?: string | null
          created_at?: string
          created_by: string
          end_date: string
          id?: string
          insurance_companies: string[]
          insured_address: string
          insured_groups: Json
          insured_name: string
          line_of_business?: string | null
          quotation_number: string
          start_date: string
          status?: Database["public"]["Enums"]["quotation_status"]
          updated_at?: string
          version?: number
        }
        Update: {
          benefits?: Json
          benefits_option?: string
          coverage_rule_code?: string | null
          created_at?: string
          created_by?: string
          end_date?: string
          id?: string
          insurance_companies?: string[]
          insured_address?: string
          insured_groups?: Json
          insured_name?: string
          line_of_business?: string | null
          quotation_number?: string
          start_date?: string
          status?: Database["public"]["Enums"]["quotation_status"]
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotations_coverage_rule_code_fkey"
            columns: ["coverage_rule_code"]
            isOneToOne: false
            referencedRelation: "master_coverage_rule"
            referencedColumns: ["coverage_rule_code"]
          },
          {
            foreignKeyName: "quotations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_template_section_header: {
        Row: {
          coverage_rule_code: string
          created_at: string
          effective_date: string
          insurer_code: string
          notes: string | null
          section_code: string
          status: Database["public"]["Enums"]["template_status"]
          template_id: string
          tier_code: string
          updated_at: string
        }
        Insert: {
          coverage_rule_code: string
          created_at?: string
          effective_date: string
          insurer_code: string
          notes?: string | null
          section_code: string
          status?: Database["public"]["Enums"]["template_status"]
          template_id?: string
          tier_code: string
          updated_at?: string
        }
        Update: {
          coverage_rule_code?: string
          created_at?: string
          effective_date?: string
          insurer_code?: string
          notes?: string | null
          section_code?: string
          status?: Database["public"]["Enums"]["template_status"]
          template_id?: string
          tier_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_template_section_header_coverage_rule_code_fkey"
            columns: ["coverage_rule_code"]
            isOneToOne: false
            referencedRelation: "master_coverage_rule"
            referencedColumns: ["coverage_rule_code"]
          },
          {
            foreignKeyName: "schedule_template_section_header_insurer_code_fkey"
            columns: ["insurer_code"]
            isOneToOne: false
            referencedRelation: "master_insurer"
            referencedColumns: ["insurer_code"]
          },
          {
            foreignKeyName: "schedule_template_section_header_section_code_fkey"
            columns: ["section_code"]
            isOneToOne: false
            referencedRelation: "master_benefit_section"
            referencedColumns: ["section_code"]
          },
          {
            foreignKeyName: "schedule_template_section_header_tier_code_fkey"
            columns: ["tier_code"]
            isOneToOne: false
            referencedRelation: "master_tier"
            referencedColumns: ["tier_code"]
          },
        ]
      }
      schedule_template_section_item: {
        Row: {
          created_at: string
          currency: string | null
          display_order: number
          item_code: string
          limit_period: string | null
          template_id: string
          unit_text: string | null
          updated_at: string
          value_amount: number | null
          value_text: string | null
          value_type: Database["public"]["Enums"]["value_type"]
        }
        Insert: {
          created_at?: string
          currency?: string | null
          display_order?: number
          item_code: string
          limit_period?: string | null
          template_id: string
          unit_text?: string | null
          updated_at?: string
          value_amount?: number | null
          value_text?: string | null
          value_type?: Database["public"]["Enums"]["value_type"]
        }
        Update: {
          created_at?: string
          currency?: string | null
          display_order?: number
          item_code?: string
          limit_period?: string | null
          template_id?: string
          unit_text?: string | null
          updated_at?: string
          value_amount?: number | null
          value_text?: string | null
          value_type?: Database["public"]["Enums"]["value_type"]
        }
        Relationships: [
          {
            foreignKeyName: "schedule_template_section_item_item_code_fkey"
            columns: ["item_code"]
            isOneToOne: false
            referencedRelation: "master_benefit_item"
            referencedColumns: ["item_code"]
          },
          {
            foreignKeyName: "schedule_template_section_item_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "schedule_template_section_header"
            referencedColumns: ["template_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      has_user_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_user: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      approval_role: "tenaga_pialang" | "tenaga_ahli"
      demographic_type: "M_0_59" | "F_0_59" | "C_0_59" | "M_60_64" | "F_60_64"
      offer_status: "QUOTED" | "NA" | "ERROR"
      quotation_status:
        | "draft"
        | "pending_pialang"
        | "pending_ahli"
        | "approved"
        | "rejected"
        | "locked"
      template_status: "ACTIVE" | "INACTIVE"
      user_role: "sales" | "tenaga_pialang" | "tenaga_ahli" | "admin"
      value_type: "AMOUNT" | "TEXT" | "BOOLEAN" | "NONE"
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
      approval_role: ["tenaga_pialang", "tenaga_ahli"],
      demographic_type: ["M_0_59", "F_0_59", "C_0_59", "M_60_64", "F_60_64"],
      offer_status: ["QUOTED", "NA", "ERROR"],
      quotation_status: [
        "draft",
        "pending_pialang",
        "pending_ahli",
        "approved",
        "rejected",
        "locked",
      ],
      template_status: ["ACTIVE", "INACTIVE"],
      user_role: ["sales", "tenaga_pialang", "tenaga_ahli", "admin"],
      value_type: ["AMOUNT", "TEXT", "BOOLEAN", "NONE"],
    },
  },
} as const
