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
          created_at: string
          created_by: string | null
          id: string
          lead_id: string
          model: string
          suggestion: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id: string
          model?: string
          suggestion: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id?: string
          model?: string
          suggestion?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
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
          created_at?: string
          created_by?: string
          id?: string
          key_hash?: string
          last_used_at?: string | null
          name?: string
          prefix?: string
          revoked?: boolean
        }
        Relationships: []
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
      crm_fields: {
        Row: {
          created_at: string
          field_type: string
          id: string
          mandatory: boolean
          name: string
          options: string[] | null
          sort_order: number
        }
        Insert: {
          created_at?: string
          field_type?: string
          id?: string
          mandatory?: boolean
          name: string
          options?: string[] | null
          sort_order?: number
        }
        Update: {
          created_at?: string
          field_type?: string
          id?: string
          mandatory?: boolean
          name?: string
          options?: string[] | null
          sort_order?: number
        }
        Relationships: []
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
          created_at?: string
          customer_name?: string
          handled?: boolean
          id?: string
          insurance_type?: Database["public"]["Enums"]["policy_type"]
          message?: string | null
          phone_number?: string
          vehicle_number?: string | null
        }
        Relationships: []
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
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          bucket?: string
          color?: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          bucket?: string
          color?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
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
      message_templates: {
        Row: {
          body: string
          category: string
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
      policy_transactions: {
        Row: {
          agent_id: string | null
          agent_payout: number | null
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
      profiles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
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
      role_permissions: {
        Row: {
          id: string
          manage_ivr: boolean
          mask_phone: boolean
          recording_request: boolean
          role: Database["public"]["Enums"]["app_role"]
          track_personal_calls: boolean
          updated_at: string
        }
        Insert: {
          id?: string
          manage_ivr?: boolean
          mask_phone?: boolean
          recording_request?: boolean
          role: Database["public"]["Enums"]["app_role"]
          track_personal_calls?: boolean
          updated_at?: string
        }
        Update: {
          id?: string
          manage_ivr?: boolean
          mask_phone?: boolean
          recording_request?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          track_personal_calls?: boolean
          updated_at?: string
        }
        Relationships: []
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
        Relationships: []
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
      webhook_events: {
        Row: {
          created_at: string
          error: string | null
          id: string
          lead_id: string | null
          payload: Json
          processed: boolean
          source: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          lead_id?: string | null
          payload: Json
          processed?: boolean
          source?: string
        }
        Update: {
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
      user_company_id: { Args: never; Returns: string }
      validate_invite_code: { Args: { _code: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "telecaller" | "manager"
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
      app_role: ["admin", "telecaller", "manager"],
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
