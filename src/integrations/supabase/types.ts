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
        Relationships: []
      }
      areas: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
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
          created_at: string
          current_address: string | null
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
          created_at?: string
          current_address?: string | null
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
          created_at?: string
          current_address?: string | null
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
      profiles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          department: string | null
          full_name: string
          id: string
          is_active: boolean
          is_approved: boolean
          manager_id: string | null
          rejection_reason: string | null
          requested_role: string | null
          ui_theme: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          department?: string | null
          full_name?: string
          id: string
          is_active?: boolean
          is_approved?: boolean
          manager_id?: string | null
          rejection_reason?: string | null
          requested_role?: string | null
          ui_theme?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          department?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          is_approved?: boolean
          manager_id?: string | null
          rejection_reason?: string | null
          requested_role?: string | null
          ui_theme?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_approved: { Args: { _user_id: string }; Returns: boolean }
      is_manager_of: {
        Args: { _manager_id: string; _telecaller_id: string }
        Returns: boolean
      }
      manager_can_see_lead: {
        Args: { _area_id: string; _manager_id: string }
        Returns: boolean
      }
      telecaller_has_area: {
        Args: { _area_id: string; _user_id: string }
        Returns: boolean
      }
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
