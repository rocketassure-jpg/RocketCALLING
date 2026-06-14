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
      admin_renewal_settings: {
        Row: {
          alert_days: number[]
          auto_assign_logic: string
          auto_send_enabled: boolean
          company_id: string
          created_at: string
          default_channel: string
          default_telecaller_id: string | null
          default_template_id: string | null
          updated_at: string
        }
        Insert: {
          alert_days?: number[]
          auto_assign_logic?: string
          auto_send_enabled?: boolean
          company_id: string
          created_at?: string
          default_channel?: string
          default_telecaller_id?: string | null
          default_template_id?: string | null
          updated_at?: string
        }
        Update: {
          alert_days?: number[]
          auto_assign_logic?: string
          auto_send_enabled?: boolean
          company_id?: string
          created_at?: string
          default_channel?: string
          default_telecaller_id?: string | null
          default_template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_renewal_settings_default_template_id_fkey"
            columns: ["default_template_id"]
            isOneToOne: false
            referencedRelation: "renewal_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_payouts: {
        Row: {
          agent_id: string
          company_id: string
          created_at: string | null
          id: string
          net_payable: number | null
          notes: string | null
          paid_amount: number | null
          payment_date: string | null
          payment_mode: string | null
          period_month: number
          period_year: number
          status: string | null
          tds_deducted: number | null
          total_business: number | null
          total_commission: number | null
          total_reward: number | null
          updated_at: string | null
          utr_ref: string | null
        }
        Insert: {
          agent_id: string
          company_id: string
          created_at?: string | null
          id?: string
          net_payable?: number | null
          notes?: string | null
          paid_amount?: number | null
          payment_date?: string | null
          payment_mode?: string | null
          period_month: number
          period_year: number
          status?: string | null
          tds_deducted?: number | null
          total_business?: number | null
          total_commission?: number | null
          total_reward?: number | null
          updated_at?: string | null
          utr_ref?: string | null
        }
        Update: {
          agent_id?: string
          company_id?: string
          created_at?: string | null
          id?: string
          net_payable?: number | null
          notes?: string | null
          paid_amount?: number | null
          payment_date?: string | null
          payment_mode?: string | null
          period_month?: number
          period_year?: number
          status?: string | null
          tds_deducted?: number | null
          total_business?: number | null
          total_commission?: number | null
          total_reward?: number | null
          updated_at?: string | null
          utr_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_payouts_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_payouts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      agents_profile: {
        Row: {
          aadhaar: string | null
          agent_code: string | null
          agent_type: string | null
          bank_account: string | null
          bank_name: string | null
          company_id: string
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          ifsc: string | null
          is_active: boolean | null
          notes: string | null
          pan: string | null
          parent_agent_id: string | null
          phone: string | null
          posp_license_expiry: string | null
          posp_license_no: string | null
          split_percent: number | null
          updated_at: string | null
        }
        Insert: {
          aadhaar?: string | null
          agent_code?: string | null
          agent_type?: string | null
          bank_account?: string | null
          bank_name?: string | null
          company_id: string
          created_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          ifsc?: string | null
          is_active?: boolean | null
          notes?: string | null
          pan?: string | null
          parent_agent_id?: string | null
          phone?: string | null
          posp_license_expiry?: string | null
          posp_license_no?: string | null
          split_percent?: number | null
          updated_at?: string | null
        }
        Update: {
          aadhaar?: string | null
          agent_code?: string | null
          agent_type?: string | null
          bank_account?: string | null
          bank_name?: string | null
          company_id?: string
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          ifsc?: string | null
          is_active?: boolean | null
          notes?: string | null
          pan?: string | null
          parent_agent_id?: string | null
          phone?: string | null
          posp_license_expiry?: string | null
          posp_license_no?: string | null
          split_percent?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agents_profile_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agents_profile_parent_agent_id_fkey"
            columns: ["parent_agent_id"]
            isOneToOne: false
            referencedRelation: "agents_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_suggestions: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          id: string
          lead_id: string
          model: string
          suggestion: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id: string
          model?: string
          suggestion: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id?: string
          model?: string
          suggestion?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_suggestions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_dismissible: boolean
          message: string
          show_from: string
          show_until: string | null
          target: string
          target_company_ids: string[] | null
          target_roles: string[] | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_dismissible?: boolean
          message: string
          show_from?: string
          show_until?: string | null
          target?: string
          target_company_ids?: string[] | null
          target_roles?: string[] | null
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_dismissible?: boolean
          message?: string
          show_from?: string
          show_until?: string | null
          target?: string
          target_company_ids?: string[] | null
          target_roles?: string[] | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string
          id: string
          key_hash: string
          last_used_at: string | null
          name: string
          prefix: string
          revoked: boolean
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          key_hash: string
          last_used_at?: string | null
          name: string
          prefix: string
          revoked?: boolean
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          key_hash?: string
          last_used_at?: string | null
          name?: string
          prefix?: string
          revoked?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          allow_logout_mobile: boolean
          allow_logout_web: boolean
          auto_start_allocation: boolean
          brand_config: Json
          company_id: string | null
          id: string
          invite_code: string | null
          masking_config: Json
          master_sheet_url: string | null
          post_interaction_actions: boolean
          renewal_alert_days: string | null
          renewal_auto_assign_logic: string | null
          renewal_auto_send: boolean
          renewal_default_channel: string | null
          renewal_default_telecaller_id: string | null
          renewal_default_template_id: string | null
          retry_1_hours: number
          retry_2_hours: number
          updated_at: string
          variable_retry_enabled: boolean
          whatsapp_business_messaging: boolean
          whatsapp_notifications: boolean
        }
        Insert: {
          allow_logout_mobile?: boolean
          allow_logout_web?: boolean
          auto_start_allocation?: boolean
          brand_config?: Json
          company_id?: string | null
          id?: string
          invite_code?: string | null
          masking_config?: Json
          master_sheet_url?: string | null
          post_interaction_actions?: boolean
          renewal_alert_days?: string | null
          renewal_auto_assign_logic?: string | null
          renewal_auto_send?: boolean
          renewal_default_channel?: string | null
          renewal_default_telecaller_id?: string | null
          renewal_default_template_id?: string | null
          retry_1_hours?: number
          retry_2_hours?: number
          updated_at?: string
          variable_retry_enabled?: boolean
          whatsapp_business_messaging?: boolean
          whatsapp_notifications?: boolean
        }
        Update: {
          allow_logout_mobile?: boolean
          allow_logout_web?: boolean
          auto_start_allocation?: boolean
          brand_config?: Json
          company_id?: string | null
          id?: string
          invite_code?: string | null
          masking_config?: Json
          master_sheet_url?: string | null
          post_interaction_actions?: boolean
          renewal_alert_days?: string | null
          renewal_auto_assign_logic?: string | null
          renewal_auto_send?: boolean
          renewal_default_channel?: string | null
          renewal_default_telecaller_id?: string | null
          renewal_default_template_id?: string | null
          retry_1_hours?: number
          retry_2_hours?: number
          updated_at?: string
          variable_retry_enabled?: boolean
          whatsapp_business_messaging?: boolean
          whatsapp_notifications?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_settings_renewal_default_telecaller_id_fkey"
            columns: ["renewal_default_telecaller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_settings_renewal_default_template_id_fkey"
            columns: ["renewal_default_template_id"]
            isOneToOne: false
            referencedRelation: "marketing_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      areas: {
        Row: {
          company_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "areas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      audience_sync_configs: {
        Row: {
          audience_name: string
          category: string
          company_id: string
          created_at: string
          days_after_expiry: number
          days_before_expiry: number
          enabled: boolean
          id: string
          integration_id: string | null
          meta_audience_id: string | null
        }
        Insert: {
          audience_name: string
          category?: string
          company_id: string
          created_at?: string
          days_after_expiry?: number
          days_before_expiry?: number
          enabled?: boolean
          id?: string
          integration_id?: string | null
          meta_audience_id?: string | null
        }
        Update: {
          audience_name?: string
          category?: string
          company_id?: string
          created_at?: string
          days_after_expiry?: number
          days_before_expiry?: number
          enabled?: boolean
          id?: string
          integration_id?: string | null
          meta_audience_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audience_sync_configs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audience_sync_configs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "marketing_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      audience_sync_logs: {
        Row: {
          company_id: string
          config_id: string | null
          id: string
          message: string | null
          records_matched: number
          records_sent: number
          run_at: string
          status: string | null
        }
        Insert: {
          company_id: string
          config_id?: string | null
          id?: string
          message?: string | null
          records_matched?: number
          records_sent?: number
          run_at?: string
          status?: string | null
        }
        Update: {
          company_id?: string
          config_id?: string | null
          id?: string
          message?: string | null
          records_matched?: number
          records_sent?: number
          run_at?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audience_sync_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audience_sync_logs_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "audience_sync_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          company_id: string | null
          created_at: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          company_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          company_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      branches: {
        Row: {
          address: string | null
          city: string | null
          code: string | null
          company_id: string
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          is_active: boolean
          manager_id: string | null
          name: string
          phone: string | null
          pincode: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          code?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          manager_id?: string | null
          name: string
          phone?: string | null
          pincode?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          code?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          manager_id?: string | null
          name?: string
          phone?: string | null
          pincode?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      break_logs: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          reason: string
          started_at: string
          telecaller_id: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          reason: string
          started_at?: string
          telecaller_id: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          reason?: string
          started_at?: string
          telecaller_id?: string
        }
        Relationships: []
      }
      broker_achievements: {
        Row: {
          achieved_amount: number
          broker_id: string
          company_id: string
          id: string
          last_updated: string
          target_id: string
        }
        Insert: {
          achieved_amount?: number
          broker_id: string
          company_id: string
          id?: string
          last_updated?: string
          target_id: string
        }
        Update: {
          achieved_amount?: number
          broker_id?: string
          company_id?: string
          id?: string
          last_updated?: string
          target_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "broker_achievements_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broker_achievements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broker_achievements_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: true
            referencedRelation: "broker_targets"
            referencedColumns: ["id"]
          },
        ]
      }
      broker_company_mapping: {
        Row: {
          broker_code: string | null
          broker_id: string
          company_id: string
          created_at: string
          id: string
          insurer_id: string
          is_active: boolean
        }
        Insert: {
          broker_code?: string | null
          broker_id: string
          company_id: string
          created_at?: string
          id?: string
          insurer_id: string
          is_active?: boolean
        }
        Update: {
          broker_code?: string | null
          broker_id?: string
          company_id?: string
          created_at?: string
          id?: string
          insurer_id?: string
          is_active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "broker_company_mapping_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broker_company_mapping_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broker_company_mapping_insurer_id_fkey"
            columns: ["insurer_id"]
            isOneToOne: false
            referencedRelation: "insurers"
            referencedColumns: ["id"]
          },
        ]
      }
      broker_payouts: {
        Row: {
          broker_id: string
          company_id: string
          created_at: string
          created_by: string | null
          expected_amount: number
          id: string
          payout_date: string | null
          period_end: string | null
          period_label: string
          period_start: string | null
          received_amount: number
          remarks: string | null
          status: string
          updated_at: string
          utr_number: string | null
        }
        Insert: {
          broker_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          expected_amount?: number
          id?: string
          payout_date?: string | null
          period_end?: string | null
          period_label: string
          period_start?: string | null
          received_amount?: number
          remarks?: string | null
          status?: string
          updated_at?: string
          utr_number?: string | null
        }
        Update: {
          broker_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          expected_amount?: number
          id?: string
          payout_date?: string | null
          period_end?: string | null
          period_label?: string
          period_start?: string | null
          received_amount?: number
          remarks?: string | null
          status?: string
          updated_at?: string
          utr_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "broker_payouts_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broker_payouts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      broker_slabs: {
        Row: {
          broker_id: string
          commission_rate: number
          company_id: string
          created_at: string
          effective_from: string
          effective_to: string | null
          id: string
          notes: string | null
          slab_max: number | null
          slab_min: number
          target_id: string | null
          updated_at: string
        }
        Insert: {
          broker_id: string
          commission_rate: number
          company_id: string
          created_at?: string
          effective_from: string
          effective_to?: string | null
          id?: string
          notes?: string | null
          slab_max?: number | null
          slab_min?: number
          target_id?: string | null
          updated_at?: string
        }
        Update: {
          broker_id?: string
          commission_rate?: number
          company_id?: string
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          notes?: string | null
          slab_max?: number | null
          slab_min?: number
          target_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "broker_slabs_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broker_slabs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broker_slabs_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "broker_targets"
            referencedColumns: ["id"]
          },
        ]
      }
      broker_targets: {
        Row: {
          broker_id: string
          company_id: string
          created_at: string
          id: string
          notes: string | null
          period_end: string
          period_start: string
          period_type: string
          product_category: string
          target_amount: number
          updated_at: string
        }
        Insert: {
          broker_id: string
          company_id: string
          created_at?: string
          id?: string
          notes?: string | null
          period_end: string
          period_start: string
          period_type: string
          product_category: string
          target_amount?: number
          updated_at?: string
        }
        Update: {
          broker_id?: string
          company_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          period_type?: string
          product_category?: string
          target_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "broker_targets_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broker_targets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      brokers: {
        Row: {
          agreement_end: string | null
          agreement_start: string | null
          company_id: string
          contact_person: string | null
          created_at: string
          created_by: string | null
          email: string | null
          gstin: string | null
          id: string
          mobile: string | null
          name: string
          notes: string | null
          pan: string | null
          status: string
          updated_at: string
        }
        Insert: {
          agreement_end?: string | null
          agreement_start?: string | null
          company_id: string
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          gstin?: string | null
          id?: string
          mobile?: string | null
          name: string
          notes?: string | null
          pan?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          agreement_end?: string | null
          agreement_start?: string | null
          company_id?: string
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          gstin?: string | null
          id?: string
          mobile?: string | null
          name?: string
          notes?: string | null
          pan?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brokers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      call_logs: {
        Row: {
          called_at: string
          id: string
          lead_id: string
          notes: string | null
          status: Database["public"]["Enums"]["lead_status"]
          telecaller_id: string
        }
        Insert: {
          called_at?: string
          id?: string
          lead_id: string
          notes?: string | null
          status: Database["public"]["Enums"]["lead_status"]
          telecaller_id: string
        }
        Update: {
          called_at?: string
          id?: string
          lead_id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          telecaller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "renewal_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "untouched_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_logs: {
        Row: {
          campaign_id: string | null
          channel: string
          company_id: string
          created_at: string
          customer_id: string | null
          customer_name: string | null
          delivered_at: string | null
          error: string | null
          id: string
          lead_id: string | null
          phone_number: string | null
          provider_message_id: string | null
          renewal_id: string | null
          replied_at: string | null
          response_at: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          campaign_id?: string | null
          channel: string
          company_id: string
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          delivered_at?: string | null
          error?: string | null
          id?: string
          lead_id?: string | null
          phone_number?: string | null
          provider_message_id?: string | null
          renewal_id?: string | null
          replied_at?: string | null
          response_at?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          campaign_id?: string | null
          channel?: string
          company_id?: string
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          delivered_at?: string | null
          error?: string | null
          id?: string
          lead_id?: string | null
          phone_number?: string | null
          provider_message_id?: string | null
          renewal_id?: string | null
          replied_at?: string | null
          response_at?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "renewal_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "renewal_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "untouched_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_logs_renewal_id_fkey"
            columns: ["renewal_id"]
            isOneToOne: false
            referencedRelation: "renewals"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_documents: {
        Row: {
          claim_id: string
          company_id: string
          created_at: string
          document_name: string
          document_type: string | null
          file_path: string | null
          id: string
          is_received: boolean | null
          is_required: boolean | null
          uploaded_by: string | null
        }
        Insert: {
          claim_id: string
          company_id: string
          created_at?: string
          document_name: string
          document_type?: string | null
          file_path?: string | null
          id?: string
          is_received?: boolean | null
          is_required?: boolean | null
          uploaded_by?: string | null
        }
        Update: {
          claim_id?: string
          company_id?: string
          created_at?: string
          document_name?: string
          document_type?: string | null
          file_path?: string | null
          id?: string
          is_received?: boolean | null
          is_required?: boolean | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "claim_documents_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_status_history: {
        Row: {
          changed_by: string | null
          claim_id: string
          company_id: string
          created_at: string
          from_status: string | null
          id: string
          remarks: string | null
          to_status: string
        }
        Insert: {
          changed_by?: string | null
          claim_id: string
          company_id: string
          created_at?: string
          from_status?: string | null
          id?: string
          remarks?: string | null
          to_status: string
        }
        Update: {
          changed_by?: string | null
          claim_id?: string
          company_id?: string
          created_at?: string
          from_status?: string | null
          id?: string
          remarks?: string | null
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "claim_status_history_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
        ]
      }
      claims: {
        Row: {
          approved_amount: number | null
          assigned_to: string | null
          branch_id: string | null
          claim_amount: number | null
          claim_number: string
          claim_type: string | null
          client_lead_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          customer_id: string | null
          garage_name: string | null
          hospital_name: string | null
          id: string
          incident_date: string | null
          insurer_id: string | null
          intimation_date: string | null
          policy_id: string | null
          policy_type: string
          remarks: string | null
          settled_amount: number | null
          sla_breached: boolean
          sla_due_at: string | null
          status: string
          surveyor_contact: string | null
          surveyor_name: string | null
          updated_at: string
        }
        Insert: {
          approved_amount?: number | null
          assigned_to?: string | null
          branch_id?: string | null
          claim_amount?: number | null
          claim_number: string
          claim_type?: string | null
          client_lead_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          garage_name?: string | null
          hospital_name?: string | null
          id?: string
          incident_date?: string | null
          insurer_id?: string | null
          intimation_date?: string | null
          policy_id?: string | null
          policy_type: string
          remarks?: string | null
          settled_amount?: number | null
          sla_breached?: boolean
          sla_due_at?: string | null
          status?: string
          surveyor_contact?: string | null
          surveyor_name?: string | null
          updated_at?: string
        }
        Update: {
          approved_amount?: number | null
          assigned_to?: string | null
          branch_id?: string | null
          claim_amount?: number | null
          claim_number?: string
          claim_type?: string | null
          client_lead_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          garage_name?: string | null
          hospital_name?: string | null
          id?: string
          incident_date?: string | null
          insurer_id?: string | null
          intimation_date?: string | null
          policy_id?: string | null
          policy_type?: string
          remarks?: string | null
          settled_amount?: number | null
          sla_breached?: boolean
          sla_due_at?: string | null
          status?: string
          surveyor_contact?: string | null
          surveyor_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "claims_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_insurer_id_fkey"
            columns: ["insurer_id"]
            isOneToOne: false
            referencedRelation: "insurers"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_rates: {
        Row: {
          company_id: string
          created_at: string | null
          effective_from: string | null
          effective_to: string | null
          id: string
          insurer_id: string
          net_rate: number | null
          notes: string | null
          od_rate: number | null
          policy_type: string
          product_subtype: string | null
          reward_rate: number | null
          tp_rate: number | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          insurer_id: string
          net_rate?: number | null
          notes?: string | null
          od_rate?: number | null
          policy_type: string
          product_subtype?: string | null
          reward_rate?: number | null
          tp_rate?: number | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          insurer_id?: string
          net_rate?: number | null
          notes?: string | null
          od_rate?: number | null
          policy_type?: string
          product_subtype?: string | null
          reward_rate?: number | null
          tp_rate?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_rates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_rates_insurer_id_fkey"
            columns: ["insurer_id"]
            isOneToOne: false
            referencedRelation: "insurers"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          plan: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          plan?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          plan?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_subscriptions: {
        Row: {
          activated_by: string | null
          billing_cycle: string
          company_id: string
          created_at: string
          end_date: string | null
          id: string
          module_key: string
          notes: string | null
          price_paid: number
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          activated_by?: string | null
          billing_cycle?: string
          company_id: string
          created_at?: string
          end_date?: string | null
          id?: string
          module_key: string
          notes?: string | null
          price_paid?: number
          start_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          activated_by?: string | null
          billing_cycle?: string
          company_id?: string
          created_at?: string
          end_date?: string | null
          id?: string
          module_key?: string
          notes?: string | null
          price_paid?: number
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_subscriptions_module_key_fkey"
            columns: ["module_key"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["module_key"]
          },
        ]
      }
      complaints: {
        Row: {
          assigned_to: string | null
          company_id: string
          created_at: string
          created_by: string | null
          customer_id: string | null
          description: string | null
          id: string
          opened_at: string
          resolution_notes: string | null
          resolved_at: string | null
          severity: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          id?: string
          opened_at?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          id?: string
          opened_at?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "complaints_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_tracker: {
        Row: {
          agent_id: string | null
          agent_name: string
          company_id: string
          created_at: string
          created_by: string | null
          expiry_date: string
          id: string
          issue_date: string | null
          license_no: string | null
          license_type: string | null
          notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          agent_name: string
          company_id: string
          created_at?: string
          created_by?: string | null
          expiry_date: string
          id?: string
          issue_date?: string | null
          license_no?: string | null
          license_type?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          agent_name?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          expiry_date?: string
          id?: string
          issue_date?: string | null
          license_no?: string | null
          license_type?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      crm_fields: {
        Row: {
          company_id: string | null
          created_at: string
          field_type: string
          id: string
          mandatory: boolean
          name: string
          options: string[] | null
          sort_order: number
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          field_type?: string
          id?: string
          mandatory?: boolean
          name: string
          options?: string[] | null
          sort_order?: number
        }
        Update: {
          company_id?: string | null
          created_at?: string
          field_type?: string
          id?: string
          mandatory?: boolean
          name?: string
          options?: string[] | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_fields_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_documents: {
        Row: {
          company_id: string
          created_at: string
          customer_id: string
          doc_type: string
          id: string
          label: string | null
          mime_type: string | null
          size_bytes: number | null
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          customer_id: string
          doc_type: string
          id?: string
          label?: string | null
          mime_type?: string | null
          size_bytes?: number | null
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          customer_id?: string
          doc_type?: string
          id?: string
          label?: string | null
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          aadhaar_last4: string | null
          address_line1: string | null
          address_line2: string | null
          agent_id: string | null
          alt_mobile: string | null
          branch_id: string | null
          city: string | null
          company_id: string
          created_at: string
          created_by: string | null
          dob: string | null
          email: string | null
          family_head_id: string | null
          full_name: string
          gender: string | null
          id: string
          kyc_status: string
          mobile: string
          notes: string | null
          occupation: string | null
          pan: string | null
          pincode: string | null
          relation_to_head: string | null
          source_lead_id: string | null
          state: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          aadhaar_last4?: string | null
          address_line1?: string | null
          address_line2?: string | null
          agent_id?: string | null
          alt_mobile?: string | null
          branch_id?: string | null
          city?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          dob?: string | null
          email?: string | null
          family_head_id?: string | null
          full_name: string
          gender?: string | null
          id?: string
          kyc_status?: string
          mobile: string
          notes?: string | null
          occupation?: string | null
          pan?: string | null
          pincode?: string | null
          relation_to_head?: string | null
          source_lead_id?: string | null
          state?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          aadhaar_last4?: string | null
          address_line1?: string | null
          address_line2?: string | null
          agent_id?: string | null
          alt_mobile?: string | null
          branch_id?: string | null
          city?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          dob?: string | null
          email?: string | null
          family_head_id?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          kyc_status?: string
          mobile?: string
          notes?: string | null
          occupation?: string | null
          pan?: string | null
          pincode?: string | null
          relation_to_head?: string | null
          source_lead_id?: string | null
          state?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_family_head_id_fkey"
            columns: ["family_head_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_source_lead_id_fkey"
            columns: ["source_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_source_lead_id_fkey"
            columns: ["source_lead_id"]
            isOneToOne: false
            referencedRelation: "renewal_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_source_lead_id_fkey"
            columns: ["source_lead_id"]
            isOneToOne: false
            referencedRelation: "untouched_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      dial_logs: {
        Row: {
          call_type: string
          clicked_at: string
          connected: boolean
          duration_seconds: number
          id: string
          lead_id: string
          telecaller_id: string
        }
        Insert: {
          call_type?: string
          clicked_at?: string
          connected?: boolean
          duration_seconds?: number
          id?: string
          lead_id: string
          telecaller_id: string
        }
        Update: {
          call_type?: string
          clicked_at?: string
          connected?: boolean
          duration_seconds?: number
          id?: string
          lead_id?: string
          telecaller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dial_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dial_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "renewal_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dial_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "untouched_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      enquiries: {
        Row: {
          company_id: string | null
          created_at: string
          customer_name: string
          handled: boolean
          id: string
          insurance_type: Database["public"]["Enums"]["policy_type"]
          message: string | null
          phone_number: string
          vehicle_number: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          customer_name: string
          handled?: boolean
          id?: string
          insurance_type?: Database["public"]["Enums"]["policy_type"]
          message?: string | null
          phone_number: string
          vehicle_number?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          customer_name?: string
          handled?: boolean
          id?: string
          insurance_type?: Database["public"]["Enums"]["policy_type"]
          message?: string | null
          phone_number?: string
          vehicle_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enquiries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          branch_id: string | null
          category: string
          company_id: string
          created_at: string
          created_by: string | null
          expense_date: string
          id: string
          notes: string | null
          paid_to: string | null
          payment_mode: string | null
          reference_no: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          branch_id?: string | null
          category: string
          company_id: string
          created_at?: string
          created_by?: string | null
          expense_date?: string
          id?: string
          notes?: string | null
          paid_to?: string | null
          payment_mode?: string | null
          reference_no?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          branch_id?: string | null
          category?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          expense_date?: string
          id?: string
          notes?: string | null
          paid_to?: string | null
          payment_mode?: string | null
          reference_no?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          company_id: string | null
          created_at: string
          description: string | null
          enabled_for_roles: string[] | null
          flag_key: string
          id: string
          is_enabled: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          enabled_for_roles?: string[] | null
          flag_key: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          enabled_for_roles?: string[] | null
          flag_key?: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      fitness_certificates: {
        Row: {
          certificate_number: string | null
          company_id: string
          created_at: string
          created_by: string | null
          document_url: string | null
          expiry_date: string
          id: string
          issue_date: string | null
          notes: string | null
          rto_office: string | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          certificate_number?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          document_url?: string | null
          expiry_date: string
          id?: string
          issue_date?: string | null
          notes?: string | null
          rto_office?: string | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          certificate_number?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          document_url?: string | null
          expiry_date?: string
          id?: string
          issue_date?: string | null
          notes?: string | null
          rto_office?: string | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fitness_certificates_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      global_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      health_policies: {
        Row: {
          addons: Json | null
          agent_id: string | null
          base_sum_insured: number | null
          client_lead_id: string | null
          company_id: string
          copay_percent: number | null
          cover_type: string | null
          created_at: string
          created_by: string | null
          document_url: string | null
          end_date: string | null
          gross_premium: number | null
          gst_amount: number | null
          id: string
          insurer_id: string | null
          issue_date: string | null
          net_premium: number | null
          network_hospitals: string | null
          no_claim_bonus_percent: number | null
          notes: string | null
          payment_mode: string | null
          payment_status: string | null
          plan_name: string | null
          plan_type: string | null
          policy_number: string | null
          pre_existing_disease: string | null
          pre_existing_waiting_period: number | null
          proposer_dob: string | null
          proposer_name: string | null
          proposer_phone: string | null
          restore_benefit: boolean | null
          room_rent_limit: string | null
          start_date: string | null
          status: string | null
          sum_insured: number | null
          tpa_card_number: string | null
          tpa_name: string | null
          updated_at: string
        }
        Insert: {
          addons?: Json | null
          agent_id?: string | null
          base_sum_insured?: number | null
          client_lead_id?: string | null
          company_id: string
          copay_percent?: number | null
          cover_type?: string | null
          created_at?: string
          created_by?: string | null
          document_url?: string | null
          end_date?: string | null
          gross_premium?: number | null
          gst_amount?: number | null
          id?: string
          insurer_id?: string | null
          issue_date?: string | null
          net_premium?: number | null
          network_hospitals?: string | null
          no_claim_bonus_percent?: number | null
          notes?: string | null
          payment_mode?: string | null
          payment_status?: string | null
          plan_name?: string | null
          plan_type?: string | null
          policy_number?: string | null
          pre_existing_disease?: string | null
          pre_existing_waiting_period?: number | null
          proposer_dob?: string | null
          proposer_name?: string | null
          proposer_phone?: string | null
          restore_benefit?: boolean | null
          room_rent_limit?: string | null
          start_date?: string | null
          status?: string | null
          sum_insured?: number | null
          tpa_card_number?: string | null
          tpa_name?: string | null
          updated_at?: string
        }
        Update: {
          addons?: Json | null
          agent_id?: string | null
          base_sum_insured?: number | null
          client_lead_id?: string | null
          company_id?: string
          copay_percent?: number | null
          cover_type?: string | null
          created_at?: string
          created_by?: string | null
          document_url?: string | null
          end_date?: string | null
          gross_premium?: number | null
          gst_amount?: number | null
          id?: string
          insurer_id?: string | null
          issue_date?: string | null
          net_premium?: number | null
          network_hospitals?: string | null
          no_claim_bonus_percent?: number | null
          notes?: string | null
          payment_mode?: string | null
          payment_status?: string | null
          plan_name?: string | null
          plan_type?: string | null
          policy_number?: string | null
          pre_existing_disease?: string | null
          pre_existing_waiting_period?: number | null
          proposer_dob?: string | null
          proposer_name?: string | null
          proposer_phone?: string | null
          restore_benefit?: boolean | null
          room_rent_limit?: string | null
          start_date?: string | null
          status?: string | null
          sum_insured?: number | null
          tpa_card_number?: string | null
          tpa_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_policies_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_policies_client_lead_id_fkey"
            columns: ["client_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_policies_client_lead_id_fkey"
            columns: ["client_lead_id"]
            isOneToOne: false
            referencedRelation: "renewal_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_policies_client_lead_id_fkey"
            columns: ["client_lead_id"]
            isOneToOne: false
            referencedRelation: "untouched_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_policies_insurer_id_fkey"
            columns: ["insurer_id"]
            isOneToOne: false
            referencedRelation: "insurers"
            referencedColumns: ["id"]
          },
        ]
      }
      health_policy_members: {
        Row: {
          age: number | null
          company_id: string
          created_at: string
          date_of_birth: string | null
          gender: string | null
          id: string
          member_name: string
          policy_id: string
          pre_existing_conditions: string | null
          relationship: string | null
          sum_insured_share: number | null
        }
        Insert: {
          age?: number | null
          company_id: string
          created_at?: string
          date_of_birth?: string | null
          gender?: string | null
          id?: string
          member_name: string
          policy_id: string
          pre_existing_conditions?: string | null
          relationship?: string | null
          sum_insured_share?: number | null
        }
        Update: {
          age?: number | null
          company_id?: string
          created_at?: string
          date_of_birth?: string | null
          gender?: string | null
          id?: string
          member_name?: string
          policy_id?: string
          pre_existing_conditions?: string | null
          relationship?: string | null
          sum_insured_share?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "health_policy_members_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "health_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      impersonation_sessions: {
        Row: {
          actions_taken: string[] | null
          ended_at: string | null
          id: string
          is_active: boolean
          reason: string | null
          started_at: string
          super_admin_id: string
          target_company_id: string | null
          target_user_id: string
        }
        Insert: {
          actions_taken?: string[] | null
          ended_at?: string | null
          id?: string
          is_active?: boolean
          reason?: string | null
          started_at?: string
          super_admin_id: string
          target_company_id?: string | null
          target_user_id: string
        }
        Update: {
          actions_taken?: string[] | null
          ended_at?: string | null
          id?: string
          is_active?: boolean
          reason?: string | null
          started_at?: string
          super_admin_id?: string
          target_company_id?: string | null
          target_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "impersonation_sessions_target_company_id_fkey"
            columns: ["target_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      insurers: {
        Row: {
          category: string | null
          company_id: string
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          created_at: string | null
          gst_applicable: boolean | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          payout_cycle: string | null
          short_code: string | null
          tds_rate: number | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          company_id: string
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string | null
          gst_applicable?: boolean | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          payout_cycle?: string | null
          short_code?: string | null
          tds_rate?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          company_id?: string
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string | null
          gst_applicable?: boolean | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          payout_cycle?: string | null
          short_code?: string | null
          tds_rate?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insurers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_notes: {
        Row: {
          author_id: string
          created_at: string
          id: string
          lead_id: string
          note: string
        }
        Insert: {
          author_id: string
          created_at?: string
          id?: string
          lead_id: string
          note: string
        }
        Update: {
          author_id?: string
          created_at?: string
          id?: string
          lead_id?: string
          note?: string
        }
        Relationships: []
      }
      lead_statuses: {
        Row: {
          bucket: string
          color: string
          company_id: string | null
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          bucket?: string
          color?: string
          company_id?: string | null
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          bucket?: string
          color?: string
          company_id?: string | null
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "lead_statuses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          agent_sm_name: string | null
          area_id: string
          assigned_telecaller: string | null
          authorised_person: string | null
          call_date: string
          campaign_name: string | null
          cash_back: number | null
          chassis_number: string | null
          city_village: string | null
          company_id: string
          created_at: string
          current_address: string | null
          customer_id: string | null
          customer_name: string
          deadline: string | null
          delivery_address: string | null
          engine_number: string | null
          expiry_date: string | null
          father_name: string | null
          fitness_upto: string | null
          follow_up_date: string | null
          follow_up_notes: string | null
          fuel_type: string | null
          id: string
          insurance_company: string | null
          issue_date: string | null
          last_called_at: string | null
          lead_source: string | null
          maker_name: string | null
          manager_id: string | null
          mobile_2: string | null
          model_name: string | null
          net_od: number | null
          notes: string | null
          payment_mode: string | null
          payment_status: string | null
          permanent_address: string | null
          phone_number: string
          policy_copy_url: string | null
          policy_expiry_date: string | null
          policy_number: string | null
          policy_type: Database["public"]["Enums"]["policy_type"]
          premium_amount: number
          priority: string
          pucc_upto: string | null
          reg_date: string | null
          registration_number: string | null
          remark: string | null
          status: Database["public"]["Enums"]["lead_status"]
          total_premium_incl_gst: number | null
          tp_premium: number | null
          updated_at: string
          vehicle_type: string | null
          vendor_name: string | null
        }
        Insert: {
          agent_sm_name?: string | null
          area_id: string
          assigned_telecaller?: string | null
          authorised_person?: string | null
          call_date?: string
          campaign_name?: string | null
          cash_back?: number | null
          chassis_number?: string | null
          city_village?: string | null
          company_id: string
          created_at?: string
          current_address?: string | null
          customer_id?: string | null
          customer_name: string
          deadline?: string | null
          delivery_address?: string | null
          engine_number?: string | null
          expiry_date?: string | null
          father_name?: string | null
          fitness_upto?: string | null
          follow_up_date?: string | null
          follow_up_notes?: string | null
          fuel_type?: string | null
          id?: string
          insurance_company?: string | null
          issue_date?: string | null
          last_called_at?: string | null
          lead_source?: string | null
          maker_name?: string | null
          manager_id?: string | null
          mobile_2?: string | null
          model_name?: string | null
          net_od?: number | null
          notes?: string | null
          payment_mode?: string | null
          payment_status?: string | null
          permanent_address?: string | null
          phone_number: string
          policy_copy_url?: string | null
          policy_expiry_date?: string | null
          policy_number?: string | null
          policy_type: Database["public"]["Enums"]["policy_type"]
          premium_amount?: number
          priority?: string
          pucc_upto?: string | null
          reg_date?: string | null
          registration_number?: string | null
          remark?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          total_premium_incl_gst?: number | null
          tp_premium?: number | null
          updated_at?: string
          vehicle_type?: string | null
          vendor_name?: string | null
        }
        Update: {
          agent_sm_name?: string | null
          area_id?: string
          assigned_telecaller?: string | null
          authorised_person?: string | null
          call_date?: string
          campaign_name?: string | null
          cash_back?: number | null
          chassis_number?: string | null
          city_village?: string | null
          company_id?: string
          created_at?: string
          current_address?: string | null
          customer_id?: string | null
          customer_name?: string
          deadline?: string | null
          delivery_address?: string | null
          engine_number?: string | null
          expiry_date?: string | null
          father_name?: string | null
          fitness_upto?: string | null
          follow_up_date?: string | null
          follow_up_notes?: string | null
          fuel_type?: string | null
          id?: string
          insurance_company?: string | null
          issue_date?: string | null
          last_called_at?: string | null
          lead_source?: string | null
          maker_name?: string | null
          manager_id?: string | null
          mobile_2?: string | null
          model_name?: string | null
          net_od?: number | null
          notes?: string | null
          payment_mode?: string | null
          payment_status?: string | null
          permanent_address?: string | null
          phone_number?: string
          policy_copy_url?: string | null
          policy_expiry_date?: string | null
          policy_number?: string | null
          policy_type?: Database["public"]["Enums"]["policy_type"]
          premium_amount?: number
          priority?: string
          pucc_upto?: string | null
          reg_date?: string | null
          registration_number?: string | null
          remark?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          total_premium_incl_gst?: number | null
          tp_premium?: number | null
          updated_at?: string
          vehicle_type?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      life_nominees: {
        Row: {
          appointee_name: string | null
          company_id: string
          created_at: string
          date_of_birth: string | null
          id: string
          is_minor: boolean | null
          nominee_name: string
          policy_id: string
          relationship: string | null
          share_percent: number | null
        }
        Insert: {
          appointee_name?: string | null
          company_id: string
          created_at?: string
          date_of_birth?: string | null
          id?: string
          is_minor?: boolean | null
          nominee_name: string
          policy_id: string
          relationship?: string | null
          share_percent?: number | null
        }
        Update: {
          appointee_name?: string | null
          company_id?: string
          created_at?: string
          date_of_birth?: string | null
          id?: string
          is_minor?: boolean | null
          nominee_name?: string
          policy_id?: string
          relationship?: string | null
          share_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "life_nominees_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "life_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      life_policies: {
        Row: {
          agent_id: string | null
          bonus_accumulated: number | null
          client_lead_id: string | null
          commencement_date: string | null
          company_id: string
          created_at: string
          created_by: string | null
          document_url: string | null
          fund_value: number | null
          grace_period_days: number | null
          gross_premium: number | null
          gst_amount: number | null
          id: string
          insurer_id: string | null
          issue_date: string | null
          lapsed_on: string | null
          last_paid_date: string | null
          life_assured_dob: string | null
          life_assured_name: string | null
          maturity_date: string | null
          net_premium: number | null
          next_due_date: string | null
          notes: string | null
          payment_mode: string | null
          plan_name: string | null
          plan_type: string | null
          policy_number: string | null
          policy_term_years: number | null
          policyholder_dob: string | null
          policyholder_name: string | null
          policyholder_phone: string | null
          premium_amount: number | null
          premium_frequency: string | null
          premium_paying_term_years: number | null
          revival_window_days: number | null
          rider_details: Json | null
          status: string | null
          sum_assured: number | null
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          bonus_accumulated?: number | null
          client_lead_id?: string | null
          commencement_date?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          document_url?: string | null
          fund_value?: number | null
          grace_period_days?: number | null
          gross_premium?: number | null
          gst_amount?: number | null
          id?: string
          insurer_id?: string | null
          issue_date?: string | null
          lapsed_on?: string | null
          last_paid_date?: string | null
          life_assured_dob?: string | null
          life_assured_name?: string | null
          maturity_date?: string | null
          net_premium?: number | null
          next_due_date?: string | null
          notes?: string | null
          payment_mode?: string | null
          plan_name?: string | null
          plan_type?: string | null
          policy_number?: string | null
          policy_term_years?: number | null
          policyholder_dob?: string | null
          policyholder_name?: string | null
          policyholder_phone?: string | null
          premium_amount?: number | null
          premium_frequency?: string | null
          premium_paying_term_years?: number | null
          revival_window_days?: number | null
          rider_details?: Json | null
          status?: string | null
          sum_assured?: number | null
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          bonus_accumulated?: number | null
          client_lead_id?: string | null
          commencement_date?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          document_url?: string | null
          fund_value?: number | null
          grace_period_days?: number | null
          gross_premium?: number | null
          gst_amount?: number | null
          id?: string
          insurer_id?: string | null
          issue_date?: string | null
          lapsed_on?: string | null
          last_paid_date?: string | null
          life_assured_dob?: string | null
          life_assured_name?: string | null
          maturity_date?: string | null
          net_premium?: number | null
          next_due_date?: string | null
          notes?: string | null
          payment_mode?: string | null
          plan_name?: string | null
          plan_type?: string | null
          policy_number?: string | null
          policy_term_years?: number | null
          policyholder_dob?: string | null
          policyholder_name?: string | null
          policyholder_phone?: string | null
          premium_amount?: number | null
          premium_frequency?: string | null
          premium_paying_term_years?: number | null
          revival_window_days?: number | null
          rider_details?: Json | null
          status?: string | null
          sum_assured?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "life_policies_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "life_policies_client_lead_id_fkey"
            columns: ["client_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "life_policies_client_lead_id_fkey"
            columns: ["client_lead_id"]
            isOneToOne: false
            referencedRelation: "renewal_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "life_policies_client_lead_id_fkey"
            columns: ["client_lead_id"]
            isOneToOne: false
            referencedRelation: "untouched_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "life_policies_insurer_id_fkey"
            columns: ["insurer_id"]
            isOneToOne: false
            referencedRelation: "insurers"
            referencedColumns: ["id"]
          },
        ]
      }
      life_premium_schedule: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          due_date: string
          id: string
          paid_amount: number | null
          paid_date: string | null
          payment_reference: string | null
          policy_id: string
          status: string | null
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string
          due_date: string
          id?: string
          paid_amount?: number | null
          paid_date?: string | null
          payment_reference?: string | null
          policy_id: string
          status?: string | null
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          due_date?: string
          id?: string
          paid_amount?: number | null
          paid_date?: string | null
          payment_reference?: string | null
          policy_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "life_premium_schedule_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "life_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_integrations: {
        Row: {
          access_token: string | null
          ad_account_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          label: string
          last_error: string | null
          page_id: string | null
          platform: string
          rcs_enabled: boolean | null
          sms_api_key: string | null
          sms_provider: string | null
          sms_sender_id: string | null
          status: string | null
          updated_at: string
          voice_api_key: string | null
          voice_caller_id: string | null
          voice_provider: string | null
          voice_tts_engine: string | null
          wa_api_key: string | null
          wa_phone_number_id: string | null
          wa_waba_id: string | null
          wa_webhook_secret: string | null
        }
        Insert: {
          access_token?: string | null
          ad_account_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          label: string
          last_error?: string | null
          page_id?: string | null
          platform: string
          rcs_enabled?: boolean | null
          sms_api_key?: string | null
          sms_provider?: string | null
          sms_sender_id?: string | null
          status?: string | null
          updated_at?: string
          voice_api_key?: string | null
          voice_caller_id?: string | null
          voice_provider?: string | null
          voice_tts_engine?: string | null
          wa_api_key?: string | null
          wa_phone_number_id?: string | null
          wa_waba_id?: string | null
          wa_webhook_secret?: string | null
        }
        Update: {
          access_token?: string | null
          ad_account_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string
          last_error?: string | null
          page_id?: string | null
          platform?: string
          rcs_enabled?: boolean | null
          sms_api_key?: string | null
          sms_provider?: string | null
          sms_sender_id?: string | null
          status?: string | null
          updated_at?: string
          voice_api_key?: string | null
          voice_caller_id?: string | null
          voice_provider?: string | null
          voice_tts_engine?: string | null
          wa_api_key?: string | null
          wa_phone_number_id?: string | null
          wa_waba_id?: string | null
          wa_webhook_secret?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_integrations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_templates: {
        Row: {
          body_text: string
          category: string | null
          channel: string
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          rcs_rich_card: Json | null
          rcs_suggestions: Json | null
          updated_at: string
          variables: Json
          voice_language: string | null
          voice_script: string | null
          wa_header_content: string | null
          wa_header_type: string | null
          wa_template_language: string | null
          wa_template_name: string | null
        }
        Insert: {
          body_text: string
          category?: string | null
          channel: string
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          rcs_rich_card?: Json | null
          rcs_suggestions?: Json | null
          updated_at?: string
          variables?: Json
          voice_language?: string | null
          voice_script?: string | null
          wa_header_content?: string | null
          wa_header_type?: string | null
          wa_template_language?: string | null
          wa_template_name?: string | null
        }
        Update: {
          body_text?: string
          category?: string | null
          channel?: string
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          rcs_rich_card?: Json | null
          rcs_suggestions?: Json | null
          updated_at?: string
          variables?: Json
          voice_language?: string | null
          voice_script?: string | null
          wa_header_content?: string | null
          wa_header_type?: string | null
          wa_template_language?: string | null
          wa_template_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          body: string
          category: string
          company_id: string | null
          created_at: string
          id: string
          owner_id: string
          shared: boolean
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          category?: string
          company_id?: string | null
          created_at?: string
          id?: string
          owner_id: string
          shared?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          category?: string
          company_id?: string | null
          created_at?: string
          id?: string
          owner_id?: string
          shared?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      modules: {
        Row: {
          base_monthly_price: number
          base_yearly_price: number
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_always_included: boolean
          module_key: string
          name: string
          sort_order: number
        }
        Insert: {
          base_monthly_price?: number
          base_yearly_price?: number
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_always_included?: boolean
          module_key: string
          name: string
          sort_order?: number
        }
        Update: {
          base_monthly_price?: number
          base_yearly_price?: number
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_always_included?: boolean
          module_key?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      motor_policies: {
        Row: {
          addon_premium: number | null
          addons: Json | null
          agent_id: string | null
          client_lead_id: string | null
          company_id: string
          cover_type: string | null
          created_at: string
          created_by: string | null
          document_url: string | null
          end_date: string | null
          gross_premium: number | null
          gst_amount: number | null
          id: string
          idv: number | null
          insurer_id: string | null
          issue_date: string | null
          ncb_percent: number | null
          net_premium: number | null
          notes: string | null
          od_end: string | null
          od_premium: number | null
          od_start: string | null
          payment_mode: string | null
          payment_status: string | null
          policy_number: string | null
          policy_type: string | null
          previous_insurer: string | null
          previous_policy_no: string | null
          start_date: string | null
          status: string | null
          tp_end: string | null
          tp_premium: number | null
          tp_start: string | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          addon_premium?: number | null
          addons?: Json | null
          agent_id?: string | null
          client_lead_id?: string | null
          company_id: string
          cover_type?: string | null
          created_at?: string
          created_by?: string | null
          document_url?: string | null
          end_date?: string | null
          gross_premium?: number | null
          gst_amount?: number | null
          id?: string
          idv?: number | null
          insurer_id?: string | null
          issue_date?: string | null
          ncb_percent?: number | null
          net_premium?: number | null
          notes?: string | null
          od_end?: string | null
          od_premium?: number | null
          od_start?: string | null
          payment_mode?: string | null
          payment_status?: string | null
          policy_number?: string | null
          policy_type?: string | null
          previous_insurer?: string | null
          previous_policy_no?: string | null
          start_date?: string | null
          status?: string | null
          tp_end?: string | null
          tp_premium?: number | null
          tp_start?: string | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          addon_premium?: number | null
          addons?: Json | null
          agent_id?: string | null
          client_lead_id?: string | null
          company_id?: string
          cover_type?: string | null
          created_at?: string
          created_by?: string | null
          document_url?: string | null
          end_date?: string | null
          gross_premium?: number | null
          gst_amount?: number | null
          id?: string
          idv?: number | null
          insurer_id?: string | null
          issue_date?: string | null
          ncb_percent?: number | null
          net_premium?: number | null
          notes?: string | null
          od_end?: string | null
          od_premium?: number | null
          od_start?: string | null
          payment_mode?: string | null
          payment_status?: string | null
          policy_number?: string | null
          policy_type?: string | null
          previous_insurer?: string | null
          previous_policy_no?: string | null
          start_date?: string | null
          status?: string | null
          tp_end?: string | null
          tp_premium?: number | null
          tp_start?: string | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "motor_policies_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "motor_policies_client_lead_id_fkey"
            columns: ["client_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "motor_policies_client_lead_id_fkey"
            columns: ["client_lead_id"]
            isOneToOne: false
            referencedRelation: "renewal_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "motor_policies_client_lead_id_fkey"
            columns: ["client_lead_id"]
            isOneToOne: false
            referencedRelation: "untouched_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "motor_policies_insurer_id_fkey"
            columns: ["insurer_id"]
            isOneToOne: false
            referencedRelation: "insurers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "motor_policies_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      permits: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          document_url: string | null
          expiry_date: string
          id: string
          issue_date: string | null
          issuing_authority: string | null
          notes: string | null
          permit_number: string | null
          permit_type: string | null
          states_covered: string | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          document_url?: string | null
          expiry_date: string
          id?: string
          issue_date?: string | null
          issuing_authority?: string | null
          notes?: string | null
          permit_number?: string | null
          permit_type?: string | null
          states_covered?: string | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          document_url?: string | null
          expiry_date?: string
          id?: string
          issue_date?: string | null
          issuing_authority?: string | null
          notes?: string | null
          permit_number?: string | null
          permit_type?: string | null
          states_covered?: string | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permits_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_templates: {
        Row: {
          created_at: string
          id: string
          included_modules: string[]
          is_active: boolean
          max_users: number | null
          monthly_price: number
          plan_name: string
          sort_order: number
          updated_at: string
          yearly_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          included_modules?: string[]
          is_active?: boolean
          max_users?: number | null
          monthly_price?: number
          plan_name: string
          sort_order?: number
          updated_at?: string
          yearly_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          included_modules?: string[]
          is_active?: boolean
          max_users?: number | null
          monthly_price?: number
          plan_name?: string
          sort_order?: number
          updated_at?: string
          yearly_price?: number
        }
        Relationships: []
      }
      policy_transactions: {
        Row: {
          agent_id: string | null
          agent_payout: number | null
          broker_id: string | null
          client_name: string | null
          client_phone: string | null
          commission_amount: number | null
          commission_rate: number | null
          company_id: string
          company_share: number | null
          created_at: string | null
          created_by: string | null
          expected_payout_date: string | null
          gross_premium: number | null
          gst_amount: number | null
          id: string
          insurer_id: string | null
          lead_id: string | null
          net_premium: number | null
          notes: string | null
          od_premium: number | null
          payment_mode: string | null
          policy_no: string | null
          policy_type: string | null
          product_subtype: string | null
          received_amount: number | null
          received_date: string | null
          reward_amount: number | null
          status: string | null
          tds_amount: number | null
          tp_premium: number | null
          txn_date: string
          updated_at: string | null
          utr_ref: string | null
        }
        Insert: {
          agent_id?: string | null
          agent_payout?: number | null
          broker_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          commission_amount?: number | null
          commission_rate?: number | null
          company_id: string
          company_share?: number | null
          created_at?: string | null
          created_by?: string | null
          expected_payout_date?: string | null
          gross_premium?: number | null
          gst_amount?: number | null
          id?: string
          insurer_id?: string | null
          lead_id?: string | null
          net_premium?: number | null
          notes?: string | null
          od_premium?: number | null
          payment_mode?: string | null
          policy_no?: string | null
          policy_type?: string | null
          product_subtype?: string | null
          received_amount?: number | null
          received_date?: string | null
          reward_amount?: number | null
          status?: string | null
          tds_amount?: number | null
          tp_premium?: number | null
          txn_date?: string
          updated_at?: string | null
          utr_ref?: string | null
        }
        Update: {
          agent_id?: string | null
          agent_payout?: number | null
          broker_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          commission_amount?: number | null
          commission_rate?: number | null
          company_id?: string
          company_share?: number | null
          created_at?: string | null
          created_by?: string | null
          expected_payout_date?: string | null
          gross_premium?: number | null
          gst_amount?: number | null
          id?: string
          insurer_id?: string | null
          lead_id?: string | null
          net_premium?: number | null
          notes?: string | null
          od_premium?: number | null
          payment_mode?: string | null
          policy_no?: string | null
          policy_type?: string | null
          product_subtype?: string | null
          received_amount?: number | null
          received_date?: string | null
          reward_amount?: number | null
          status?: string | null
          tds_amount?: number | null
          tp_premium?: number | null
          txn_date?: string
          updated_at?: string | null
          utr_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "policy_transactions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_transactions_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_transactions_insurer_id_fkey"
            columns: ["insurer_id"]
            isOneToOne: false
            referencedRelation: "insurers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_transactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_transactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "renewal_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_transactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "untouched_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      premium_remittance: {
        Row: {
          broker_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          customer_name: string | null
          discrepancy: boolean | null
          expected_amount: number
          id: string
          notes: string | null
          policy_number: string | null
          policy_type: string | null
          remittance_date: string | null
          remitted_amount: number
          status: string
          updated_at: string
          utr_no: string | null
        }
        Insert: {
          broker_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          discrepancy?: boolean | null
          expected_amount?: number
          id?: string
          notes?: string | null
          policy_number?: string | null
          policy_type?: string | null
          remittance_date?: string | null
          remitted_amount?: number
          status?: string
          updated_at?: string
          utr_no?: string | null
        }
        Update: {
          broker_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          discrepancy?: boolean | null
          expected_amount?: number
          id?: string
          notes?: string | null
          policy_number?: string | null
          policy_type?: string | null
          remittance_date?: string | null
          remitted_amount?: number
          status?: string
          updated_at?: string
          utr_no?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "premium_remittance_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          branch_id: string | null
          company_id: string
          created_at: string
          department: string | null
          full_name: string
          id: string
          is_active: boolean
          is_approved: boolean
          is_super_admin: boolean
          manager_id: string | null
          rejection_reason: string | null
          requested_role: string | null
          ui_theme: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          branch_id?: string | null
          company_id: string
          created_at?: string
          department?: string | null
          full_name?: string
          id: string
          is_active?: boolean
          is_approved?: boolean
          is_super_admin?: boolean
          manager_id?: string | null
          rejection_reason?: string | null
          requested_role?: string | null
          ui_theme?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          branch_id?: string | null
          company_id?: string
          created_at?: string
          department?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          is_approved?: boolean
          is_super_admin?: boolean
          manager_id?: string | null
          rejection_reason?: string | null
          requested_role?: string | null
          ui_theme?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      puc_records: {
        Row: {
          certificate_number: string | null
          company_id: string
          created_at: string
          created_by: string | null
          document_url: string | null
          expiry_date: string
          id: string
          issue_date: string | null
          notes: string | null
          reading: string | null
          test_center: string | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          certificate_number?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          document_url?: string | null
          expiry_date: string
          id?: string
          issue_date?: string | null
          notes?: string | null
          reading?: string | null
          test_center?: string | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          certificate_number?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          document_url?: string | null
          expiry_date?: string
          id?: string
          issue_date?: string | null
          notes?: string | null
          reading?: string | null
          test_center?: string | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "puc_records_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      rc_register: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          document_url: string | null
          id: string
          notes: string | null
          owner_address: string | null
          owner_name: string | null
          rc_expiry_date: string | null
          rc_issue_date: string | null
          rc_number: string | null
          rc_status: string | null
          rto_office: string | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          document_url?: string | null
          id?: string
          notes?: string | null
          owner_address?: string | null
          owner_name?: string | null
          rc_expiry_date?: string | null
          rc_issue_date?: string | null
          rc_number?: string | null
          rc_status?: string | null
          rto_office?: string | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          document_url?: string | null
          id?: string
          notes?: string | null
          owner_address?: string | null
          owner_name?: string | null
          rc_expiry_date?: string | null
          rc_issue_date?: string | null
          rc_number?: string | null
          rc_status?: string | null
          rto_office?: string | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rc_register_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      renewal_campaigns: {
        Row: {
          channel: string
          company_id: string
          converted_count: number
          created_at: string
          created_by: string | null
          delivered_count: number
          filter: Json
          filter_city: string | null
          filter_expiry_from: string | null
          filter_expiry_to: string | null
          filter_policy_type: string | null
          filter_telecaller_id: string | null
          id: string
          name: string
          replied_count: number
          response_count: number
          scheduled_at: string | null
          sent_count: number
          status: string
          template_id: string | null
          total_targets: number
          updated_at: string
        }
        Insert: {
          channel: string
          company_id: string
          converted_count?: number
          created_at?: string
          created_by?: string | null
          delivered_count?: number
          filter?: Json
          filter_city?: string | null
          filter_expiry_from?: string | null
          filter_expiry_to?: string | null
          filter_policy_type?: string | null
          filter_telecaller_id?: string | null
          id?: string
          name: string
          replied_count?: number
          response_count?: number
          scheduled_at?: string | null
          sent_count?: number
          status?: string
          template_id?: string | null
          total_targets?: number
          updated_at?: string
        }
        Update: {
          channel?: string
          company_id?: string
          converted_count?: number
          created_at?: string
          created_by?: string | null
          delivered_count?: number
          filter?: Json
          filter_city?: string | null
          filter_expiry_from?: string | null
          filter_expiry_to?: string | null
          filter_policy_type?: string | null
          filter_telecaller_id?: string | null
          id?: string
          name?: string
          replied_count?: number
          response_count?: number
          scheduled_at?: string | null
          sent_count?: number
          status?: string
          template_id?: string | null
          total_targets?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "renewal_campaigns_filter_telecaller_id_fkey"
            columns: ["filter_telecaller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renewal_campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "renewal_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      renewal_templates: {
        Row: {
          body_text: string
          channel: string
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
          variables: Json
        }
        Insert: {
          body_text: string
          channel: string
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          variables?: Json
        }
        Update: {
          body_text?: string
          channel?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          variables?: Json
        }
        Relationships: []
      }
      renewals: {
        Row: {
          assigned_telecaller_id: string | null
          company_id: string
          created_at: string
          customer_id: string | null
          customer_name: string | null
          expiry_date: string
          id: string
          last_contact_at: string | null
          lead_id: string | null
          notes: string | null
          original_telecaller_id: string | null
          phone_number: string | null
          policy_number: string | null
          policy_type: string | null
          premium_amount: number | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_telecaller_id?: string | null
          company_id: string
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          expiry_date: string
          id?: string
          last_contact_at?: string | null
          lead_id?: string | null
          notes?: string | null
          original_telecaller_id?: string | null
          phone_number?: string | null
          policy_number?: string | null
          policy_type?: string | null
          premium_amount?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_telecaller_id?: string | null
          company_id?: string
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          expiry_date?: string
          id?: string
          last_contact_at?: string | null
          lead_id?: string | null
          notes?: string | null
          original_telecaller_id?: string | null
          phone_number?: string | null
          policy_number?: string | null
          policy_type?: string | null
          premium_amount?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "renewals_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renewals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renewals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "renewal_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renewals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "untouched_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          company_id: string | null
          id: string
          manage_ivr: boolean
          mask_phone: boolean
          recording_request: boolean
          role: Database["public"]["Enums"]["app_role"]
          track_personal_calls: boolean
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          id?: string
          manage_ivr?: boolean
          mask_phone?: boolean
          recording_request?: boolean
          role: Database["public"]["Enums"]["app_role"]
          track_personal_calls?: boolean
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          id?: string
          manage_ivr?: boolean
          mask_phone?: boolean
          recording_request?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          track_personal_calls?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      rto_case_documents: {
        Row: {
          case_id: string
          collected_at: string | null
          company_id: string
          created_at: string
          document_name: string
          document_url: string | null
          id: string
          is_collected: boolean | null
          is_required: boolean | null
          is_verified: boolean | null
          notes: string | null
        }
        Insert: {
          case_id: string
          collected_at?: string | null
          company_id: string
          created_at?: string
          document_name: string
          document_url?: string | null
          id?: string
          is_collected?: boolean | null
          is_required?: boolean | null
          is_verified?: boolean | null
          notes?: string | null
        }
        Update: {
          case_id?: string
          collected_at?: string | null
          company_id?: string
          created_at?: string
          document_name?: string
          document_url?: string | null
          id?: string
          is_collected?: boolean | null
          is_required?: boolean | null
          is_verified?: boolean | null
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rto_case_documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "rto_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      rto_cases: {
        Row: {
          amount_collected: number | null
          application_number: string | null
          assigned_to: string | null
          client_lead_id: string | null
          company_id: string
          completed_date: string | null
          created_at: string
          created_by: string | null
          customer_name: string | null
          customer_phone: string | null
          expected_completion_date: string | null
          govt_fees: number | null
          id: string
          notes: string | null
          payment_status: string | null
          received_date: string | null
          rto_office: string | null
          service_charge: number | null
          service_type_id: string
          status: string
          submitted_date: string | null
          total_charges: number | null
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          amount_collected?: number | null
          application_number?: string | null
          assigned_to?: string | null
          client_lead_id?: string | null
          company_id: string
          completed_date?: string | null
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          expected_completion_date?: string | null
          govt_fees?: number | null
          id?: string
          notes?: string | null
          payment_status?: string | null
          received_date?: string | null
          rto_office?: string | null
          service_charge?: number | null
          service_type_id: string
          status?: string
          submitted_date?: string | null
          total_charges?: number | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          amount_collected?: number | null
          application_number?: string | null
          assigned_to?: string | null
          client_lead_id?: string | null
          company_id?: string
          completed_date?: string | null
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          expected_completion_date?: string | null
          govt_fees?: number | null
          id?: string
          notes?: string | null
          payment_status?: string | null
          received_date?: string | null
          rto_office?: string | null
          service_charge?: number | null
          service_type_id?: string
          status?: string
          submitted_date?: string | null
          total_charges?: number | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rto_cases_client_lead_id_fkey"
            columns: ["client_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rto_cases_client_lead_id_fkey"
            columns: ["client_lead_id"]
            isOneToOne: false
            referencedRelation: "renewal_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rto_cases_client_lead_id_fkey"
            columns: ["client_lead_id"]
            isOneToOne: false
            referencedRelation: "untouched_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rto_cases_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "rto_service_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rto_cases_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      rto_service_types: {
        Row: {
          category: string
          code: string
          created_at: string
          default_charges: number | null
          default_documents: Json | null
          description: string | null
          estimated_days: number | null
          govt_fees: number | null
          id: string
          is_active: boolean
          name: string
          service_charge: number | null
        }
        Insert: {
          category: string
          code: string
          created_at?: string
          default_charges?: number | null
          default_documents?: Json | null
          description?: string | null
          estimated_days?: number | null
          govt_fees?: number | null
          id?: string
          is_active?: boolean
          name: string
          service_charge?: number | null
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          default_charges?: number | null
          default_documents?: Json | null
          description?: string | null
          estimated_days?: number | null
          govt_fees?: number | null
          id?: string
          is_active?: boolean
          name?: string
          service_charge?: number | null
        }
        Relationships: []
      }
      rto_status_history: {
        Row: {
          case_id: string
          changed_at: string
          changed_by: string | null
          company_id: string
          from_status: string | null
          id: string
          notes: string | null
          to_status: string
        }
        Insert: {
          case_id: string
          changed_at?: string
          changed_by?: string | null
          company_id: string
          from_status?: string | null
          id?: string
          notes?: string | null
          to_status: string
        }
        Update: {
          case_id?: string
          changed_at?: string
          changed_by?: string | null
          company_id?: string
          from_status?: string | null
          id?: string
          notes?: string | null
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "rto_status_history_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "rto_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_posts: {
        Row: {
          category: string
          company_id: string
          content: string
          created_at: string
          created_by: string | null
          id: string
          media_url: string | null
          platforms: string[]
          scheduled_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          company_id: string
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          media_url?: string | null
          platforms: string[]
          scheduled_at: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          company_id?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          media_url?: string | null
          platforms?: string[]
          scheduled_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_posts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      service_requests: {
        Row: {
          assigned_to: string | null
          company_id: string
          created_at: string
          created_by: string | null
          customer_id: string | null
          description: string | null
          id: string
          opened_at: string
          priority: string
          request_type: string
          resolved_at: string | null
          status: string
          tat_hours: number | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          id?: string
          opened_at?: string
          priority?: string
          request_type: string
          resolved_at?: string | null
          status?: string
          tat_hours?: number | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          id?: string
          opened_at?: string
          priority?: string
          request_type?: string
          resolved_at?: string | null
          status?: string
          tat_hours?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_logs: {
        Row: {
          created_at: string
          error: string | null
          id: string
          lead_id: string | null
          message: string
          phone_number: string
          sent_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          lead_id?: string | null
          message: string
          phone_number: string
          sent_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          lead_id?: string | null
          message?: string
          phone_number?: string
          sent_by?: string | null
          status?: string
        }
        Relationships: []
      }
      social_post_logs: {
        Row: {
          company_id: string
          id: string
          platform: string
          post_id: string | null
          posted_at: string
          response: Json | null
          status: string | null
        }
        Insert: {
          company_id: string
          id?: string
          platform: string
          post_id?: string | null
          posted_at?: string
          response?: Json | null
          status?: string | null
        }
        Update: {
          company_id?: string
          id?: string
          platform?: string
          post_id?: string | null
          posted_at?: string
          response?: Json | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_post_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_post_logs_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      super_admin_audit_log: {
        Row: {
          action_type: string
          created_at: string
          description: string | null
          id: string
          ip_address: string | null
          new_value: Json | null
          old_value: Json | null
          super_admin_id: string | null
          target_company_id: string | null
          target_user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          description?: string | null
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          super_admin_id?: string | null
          target_company_id?: string | null
          target_user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          description?: string | null
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          super_admin_id?: string | null
          target_company_id?: string | null
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "super_admin_audit_log_target_company_id_fkey"
            columns: ["target_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          company_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          due_time: string | null
          id: string
          priority: string
          related_id: string | null
          related_type: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          priority?: string
          related_id?: string | null
          related_type?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          priority?: string
          related_id?: string | null
          related_type?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      telecaller_areas: {
        Row: {
          area_id: string
          id: string
          telecaller_id: string
        }
        Insert: {
          area_id: string
          id?: string
          telecaller_id: string
        }
        Update: {
          area_id?: string
          id?: string
          telecaller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "telecaller_areas_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
        ]
      }
      training_materials: {
        Row: {
          body: string | null
          category: string
          company_id: string | null
          content_type: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          sort_order: number
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          body?: string | null
          category?: string
          company_id?: string | null
          content_type?: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          sort_order?: number
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          body?: string | null
          category?: string
          company_id?: string | null
          content_type?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          sort_order?: number
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_materials_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          chassis_number: string | null
          client_lead_id: string | null
          color: string | null
          company_id: string
          created_at: string
          created_by: string | null
          cubic_capacity: number | null
          engine_number: string | null
          fuel_type: string | null
          hypothecation: string | null
          id: string
          make: string | null
          manufacturing_year: number | null
          model: string | null
          notes: string | null
          owner_name: string | null
          owner_phone: string | null
          registration_date: string | null
          registration_number: string
          rto_code: string | null
          seating_capacity: number | null
          updated_at: string
          variant: string | null
          vehicle_type: string | null
        }
        Insert: {
          chassis_number?: string | null
          client_lead_id?: string | null
          color?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          cubic_capacity?: number | null
          engine_number?: string | null
          fuel_type?: string | null
          hypothecation?: string | null
          id?: string
          make?: string | null
          manufacturing_year?: number | null
          model?: string | null
          notes?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          registration_date?: string | null
          registration_number: string
          rto_code?: string | null
          seating_capacity?: number | null
          updated_at?: string
          variant?: string | null
          vehicle_type?: string | null
        }
        Update: {
          chassis_number?: string | null
          client_lead_id?: string | null
          color?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          cubic_capacity?: number | null
          engine_number?: string | null
          fuel_type?: string | null
          hypothecation?: string | null
          id?: string
          make?: string | null
          manufacturing_year?: number | null
          model?: string | null
          notes?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          registration_date?: string | null
          registration_number?: string
          rto_code?: string | null
          seating_capacity?: number | null
          updated_at?: string
          variant?: string | null
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_client_lead_id_fkey"
            columns: ["client_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_client_lead_id_fkey"
            columns: ["client_lead_id"]
            isOneToOne: false
            referencedRelation: "renewal_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_client_lead_id_fkey"
            columns: ["client_lead_id"]
            isOneToOne: false
            referencedRelation: "untouched_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_webhook_messages: {
        Row: {
          campaign_log_id: string | null
          company_id: string | null
          direction: string
          from_number: string | null
          id: string
          lead_id: string | null
          media_url: string | null
          message_text: string | null
          message_type: string | null
          received_at: string
          wa_message_id: string | null
        }
        Insert: {
          campaign_log_id?: string | null
          company_id?: string | null
          direction?: string
          from_number?: string | null
          id?: string
          lead_id?: string | null
          media_url?: string | null
          message_text?: string | null
          message_type?: string | null
          received_at?: string
          wa_message_id?: string | null
        }
        Update: {
          campaign_log_id?: string | null
          company_id?: string | null
          direction?: string
          from_number?: string | null
          id?: string
          lead_id?: string | null
          media_url?: string | null
          message_text?: string | null
          message_type?: string | null
          received_at?: string
          wa_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wa_webhook_messages_campaign_log_id_fkey"
            columns: ["campaign_log_id"]
            isOneToOne: false
            referencedRelation: "campaign_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_webhook_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_webhook_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_webhook_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "renewal_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_webhook_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "untouched_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          company_id: string | null
          created_at: string
          error: string | null
          id: string
          lead_id: string | null
          payload: Json
          processed: boolean
          source: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          lead_id?: string | null
          payload: Json
          processed?: boolean
          source?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          lead_id?: string | null
          payload?: Json
          processed?: boolean
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "renewal_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "untouched_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_logs: {
        Row: {
          created_at: string
          error: string | null
          id: string
          lead_id: string | null
          message: string | null
          phone_number: string
          sent_by: string | null
          status: string
          template: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          lead_id?: string | null
          message?: string | null
          phone_number: string
          sent_by?: string | null
          status?: string
          template: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          lead_id?: string | null
          message?: string | null
          phone_number?: string
          sent_by?: string | null
          status?: string
          template?: string
        }
        Relationships: []
      }
    }
    Views: {
      leads_stats: {
        Row: {
          cold: number | null
          converted: number | null
          done: number | null
          follow_up: number | null
          interested: number | null
          negotiation: number | null
          not_interested: number | null
          not_picked: number | null
          overdue: number | null
          premium_quoted: number | null
          quote_sent: number | null
          to_call: number | null
          total_leads: number | null
          transfer_to_senior: number | null
          untouched: number | null
        }
        Relationships: []
      }
      renewal_leads: {
        Row: {
          agent_sm_name: string | null
          area_id: string | null
          assigned_telecaller: string | null
          authorised_person: string | null
          call_date: string | null
          cash_back: number | null
          chassis_number: string | null
          city_village: string | null
          created_at: string | null
          current_address: string | null
          customer_name: string | null
          delivery_address: string | null
          engine_number: string | null
          expiry_date: string | null
          father_name: string | null
          fitness_upto: string | null
          follow_up_date: string | null
          follow_up_notes: string | null
          fuel_type: string | null
          id: string | null
          insurance_company: string | null
          issue_date: string | null
          last_called_at: string | null
          lead_source: string | null
          maker_name: string | null
          manager_id: string | null
          mobile_2: string | null
          model_name: string | null
          net_od: number | null
          notes: string | null
          payment_mode: string | null
          payment_status: string | null
          permanent_address: string | null
          phone_number: string | null
          policy_copy_url: string | null
          policy_expiry_date: string | null
          policy_number: string | null
          policy_type: Database["public"]["Enums"]["policy_type"] | null
          premium_amount: number | null
          pucc_upto: string | null
          reg_date: string | null
          registration_number: string | null
          remark: string | null
          status: Database["public"]["Enums"]["lead_status"] | null
          total_premium_incl_gst: number | null
          tp_premium: number | null
          updated_at: string | null
          urgency: string | null
          vehicle_type: string | null
          vendor_name: string | null
        }
        Insert: {
          agent_sm_name?: string | null
          area_id?: string | null
          assigned_telecaller?: string | null
          authorised_person?: string | null
          call_date?: string | null
          cash_back?: number | null
          chassis_number?: string | null
          city_village?: string | null
          created_at?: string | null
          current_address?: string | null
          customer_name?: string | null
          delivery_address?: string | null
          engine_number?: string | null
          expiry_date?: string | null
          father_name?: string | null
          fitness_upto?: string | null
          follow_up_date?: string | null
          follow_up_notes?: string | null
          fuel_type?: string | null
          id?: string | null
          insurance_company?: string | null
          issue_date?: string | null
          last_called_at?: string | null
          lead_source?: string | null
          maker_name?: string | null
          manager_id?: string | null
          mobile_2?: string | null
          model_name?: string | null
          net_od?: number | null
          notes?: string | null
          payment_mode?: string | null
          payment_status?: string | null
          permanent_address?: string | null
          phone_number?: string | null
          policy_copy_url?: string | null
          policy_expiry_date?: string | null
          policy_number?: string | null
          policy_type?: Database["public"]["Enums"]["policy_type"] | null
          premium_amount?: number | null
          pucc_upto?: string | null
          reg_date?: string | null
          registration_number?: string | null
          remark?: string | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          total_premium_incl_gst?: number | null
          tp_premium?: number | null
          updated_at?: string | null
          urgency?: never
          vehicle_type?: string | null
          vendor_name?: string | null
        }
        Update: {
          agent_sm_name?: string | null
          area_id?: string | null
          assigned_telecaller?: string | null
          authorised_person?: string | null
          call_date?: string | null
          cash_back?: number | null
          chassis_number?: string | null
          city_village?: string | null
          created_at?: string | null
          current_address?: string | null
          customer_name?: string | null
          delivery_address?: string | null
          engine_number?: string | null
          expiry_date?: string | null
          father_name?: string | null
          fitness_upto?: string | null
          follow_up_date?: string | null
          follow_up_notes?: string | null
          fuel_type?: string | null
          id?: string | null
          insurance_company?: string | null
          issue_date?: string | null
          last_called_at?: string | null
          lead_source?: string | null
          maker_name?: string | null
          manager_id?: string | null
          mobile_2?: string | null
          model_name?: string | null
          net_od?: number | null
          notes?: string | null
          payment_mode?: string | null
          payment_status?: string | null
          permanent_address?: string | null
          phone_number?: string | null
          policy_copy_url?: string | null
          policy_expiry_date?: string | null
          policy_number?: string | null
          policy_type?: Database["public"]["Enums"]["policy_type"] | null
          premium_amount?: number | null
          pucc_upto?: string | null
          reg_date?: string | null
          registration_number?: string | null
          remark?: string | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          total_premium_incl_gst?: number | null
          tp_premium?: number | null
          updated_at?: string | null
          urgency?: never
          vehicle_type?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
        ]
      }
      unified_policies: {
        Row: {
          agent_id: string | null
          client_lead_id: string | null
          company_id: string | null
          created_at: string | null
          end_date: string | null
          id: string | null
          insurer_id: string | null
          policy_number: string | null
          policy_type: string | null
          premium: number | null
          start_date: string | null
          status: string | null
          sum_amount: number | null
        }
        Relationships: []
      }
      untouched_leads: {
        Row: {
          agent_sm_name: string | null
          area_id: string | null
          assigned_telecaller: string | null
          authorised_person: string | null
          call_date: string | null
          cash_back: number | null
          chassis_number: string | null
          city_village: string | null
          created_at: string | null
          current_address: string | null
          customer_name: string | null
          delivery_address: string | null
          engine_number: string | null
          expiry_date: string | null
          father_name: string | null
          fitness_upto: string | null
          follow_up_date: string | null
          follow_up_notes: string | null
          fuel_type: string | null
          id: string | null
          insurance_company: string | null
          issue_date: string | null
          last_called_at: string | null
          lead_source: string | null
          maker_name: string | null
          manager_id: string | null
          mobile_2: string | null
          model_name: string | null
          net_od: number | null
          notes: string | null
          payment_mode: string | null
          payment_status: string | null
          permanent_address: string | null
          phone_number: string | null
          policy_copy_url: string | null
          policy_expiry_date: string | null
          policy_number: string | null
          policy_type: Database["public"]["Enums"]["policy_type"] | null
          premium_amount: number | null
          pucc_upto: string | null
          reg_date: string | null
          registration_number: string | null
          remark: string | null
          status: Database["public"]["Enums"]["lead_status"] | null
          total_premium_incl_gst: number | null
          tp_premium: number | null
          updated_at: string | null
          vehicle_type: string | null
          vendor_name: string | null
        }
        Insert: {
          agent_sm_name?: string | null
          area_id?: string | null
          assigned_telecaller?: string | null
          authorised_person?: string | null
          call_date?: string | null
          cash_back?: number | null
          chassis_number?: string | null
          city_village?: string | null
          created_at?: string | null
          current_address?: string | null
          customer_name?: string | null
          delivery_address?: string | null
          engine_number?: string | null
          expiry_date?: string | null
          father_name?: string | null
          fitness_upto?: string | null
          follow_up_date?: string | null
          follow_up_notes?: string | null
          fuel_type?: string | null
          id?: string | null
          insurance_company?: string | null
          issue_date?: string | null
          last_called_at?: string | null
          lead_source?: string | null
          maker_name?: string | null
          manager_id?: string | null
          mobile_2?: string | null
          model_name?: string | null
          net_od?: number | null
          notes?: string | null
          payment_mode?: string | null
          payment_status?: string | null
          permanent_address?: string | null
          phone_number?: string | null
          policy_copy_url?: string | null
          policy_expiry_date?: string | null
          policy_number?: string | null
          policy_type?: Database["public"]["Enums"]["policy_type"] | null
          premium_amount?: number | null
          pucc_upto?: string | null
          reg_date?: string | null
          registration_number?: string | null
          remark?: string | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          total_premium_incl_gst?: number | null
          tp_premium?: number | null
          updated_at?: string | null
          vehicle_type?: string | null
          vendor_name?: string | null
        }
        Update: {
          agent_sm_name?: string | null
          area_id?: string | null
          assigned_telecaller?: string | null
          authorised_person?: string | null
          call_date?: string | null
          cash_back?: number | null
          chassis_number?: string | null
          city_village?: string | null
          created_at?: string | null
          current_address?: string | null
          customer_name?: string | null
          delivery_address?: string | null
          engine_number?: string | null
          expiry_date?: string | null
          father_name?: string | null
          fitness_upto?: string | null
          follow_up_date?: string | null
          follow_up_notes?: string | null
          fuel_type?: string | null
          id?: string | null
          insurance_company?: string | null
          issue_date?: string | null
          last_called_at?: string | null
          lead_source?: string | null
          maker_name?: string | null
          manager_id?: string | null
          mobile_2?: string | null
          model_name?: string | null
          net_od?: number | null
          notes?: string | null
          payment_mode?: string | null
          payment_status?: string | null
          permanent_address?: string | null
          phone_number?: string | null
          policy_copy_url?: string | null
          policy_expiry_date?: string | null
          policy_number?: string | null
          policy_type?: Database["public"]["Enums"]["policy_type"] | null
          premium_amount?: number | null
          pucc_upto?: string | null
          reg_date?: string | null
          registration_number?: string | null
          remark?: string | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          total_premium_incl_gst?: number | null
          tp_premium?: number | null
          updated_at?: string | null
          vehicle_type?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_active_modules: { Args: { _company_id: string }; Returns: string[] }
      get_applicable_slab: {
        Args: {
          _amount: number
          _broker_id: string
          _category: string
          _on_date?: string
        }
        Returns: {
          commission_rate: number
          slab_id: string
          slab_max: number
          slab_min: number
          target_id: string
        }[]
      }
      get_invite_code: { Args: never; Returns: string }
      has_module: {
        Args: { _company_id: string; _module_key: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      invite_code_required: { Args: never; Returns: boolean }
      is_approved: { Args: { _user_id: string }; Returns: boolean }
      is_manager_of: {
        Args: { _manager_id: string; _telecaller_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id?: string }; Returns: boolean }
      lookup_company_by_code: {
        Args: { _code: string }
        Returns: {
          id: string
          name: string
        }[]
      }
      manager_can_see_lead: {
        Args: { _area_id: string; _manager_id: string }
        Returns: boolean
      }
      telecaller_has_area: {
        Args: { _area_id: string; _user_id: string }
        Returns: boolean
      }
      user_branch_id: { Args: never; Returns: string }
      user_company_id: { Args: never; Returns: string }
      validate_invite_code: { Args: { _code: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "telecaller" | "manager" | "sub_agent"
      lead_status:
        | "New"
        | "Interested"
        | "Follow-up"
        | "Not Picked"
        | "Not Interested"
        | "Unsubscribed"
        | "Done"
        | "Transfer to Senior"
        | "Quote Sent"
        | "Premium Quoted"
        | "Negotiation"
        | "Converted"
      policy_type: "Life" | "Health" | "Motor"
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
      app_role: ["admin", "telecaller", "manager", "sub_agent"],
      lead_status: [
        "New",
        "Interested",
        "Follow-up",
        "Not Picked",
        "Not Interested",
        "Unsubscribed",
        "Done",
        "Transfer to Senior",
        "Quote Sent",
        "Premium Quoted",
        "Negotiation",
        "Converted",
      ],
      policy_type: ["Life", "Health", "Motor"],
    },
  },
} as const
