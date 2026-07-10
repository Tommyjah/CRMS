export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      change_requests: {
        Row: {
          change_description: string | null;
          change_number: string | null;
          change_type: string | null;
          created_at: string | null;
          description: string | null;
          duct_sizes: string | null;
          estimated_downtime: string | null;
          engineering_approver: string | null;
          fixed_network_approver: string | null;
          id: string;
          initiated_by: string | null;
          initiator_name: string;
          material_cost_variation: string | null;
          priority_level: string | null;
          project_name: string;
          project_number: string | null;
          route_deviations: string | null;
          route_impact: string | null;
          site_coordinates: string | null;
          status: string | null;
          technical_reason: string | null;
          updated_at: string | null;
          user_id: string;
          wire_line_approver: string | null;
          target_segments: string | null;
          work_order: string | null;
        };
        Insert: {
          change_description?: string | null;
          created_at?: string | null;
          description?: string | null;
          duct_sizes?: string | null;
          estimated_downtime?: string | null;
          engineering_approver?: string | null;
          id?: string;
          initiated_by?: string | null;
          initiator_name: string;
          material_cost_variation?: string | null;
          priority_level?: string | null;
          project_name: string;
          project_number?: string | null;
          route_deviations?: string | null;
          route_impact?: string | null;
          site_coordinates?: string | null;
          status?: string | null;
          target_segments?: string | null;
          technical_reason?: string | null;
          updated_at?: string | null;
          fixed_network_approver?: string | null;
          wire_line_approver?: string | null;
          work_order?: string | null;
          change_number?: string | null;
          change_type?: string | null;
          user_id?: string;
        };
        Update: {
          change_description?: string | null;
          created_at?: string | null;
          description?: string | null;
          duct_sizes?: string | null;
          estimated_downtime?: string | null;
          engineering_approver?: string | null;
          id?: string;
          initiated_by?: string | null;
          initiator_name?: string;
          material_cost_variation?: string | null;
          priority_level?: string | null;
          project_name?: string;
          project_number?: string | null;
          route_deviations?: string | null;
          route_impact?: string | null;
          site_coordinates?: string | null;
          status?: string | null;
          target_segments?: string | null;
          technical_reason?: string | null;
          updated_at?: string | null;
          fixed_network_approver?: string | null;
          wire_line_approver?: string | null;
          work_order?: string | null;
          change_number?: string | null;
          change_type?: string | null;
        };
        Relationships: [];
      };
      departments: {
        Row: {
          approval_order: number;
          code: string;
          created_at: string;
          description: string | null;
          head_approver_id: string | null;
          id: string;
          is_active: boolean;
          name: string;
          updated_at: string;
        };
        Insert: {
          approval_order: number;
          code: string;
          created_at?: string;
          description?: string | null;
          head_approver_id?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          updated_at?: string;
        };
        Update: {
          approval_order?: number;
          code?: string;
          created_at?: string;
          description?: string | null;
          head_approver_id?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "departments_head_approver_id_fkey";
            columns: ["head_approver_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          department: string | null;
          email: string | null;
          full_name: string;
          id: string;
          is_active: boolean;
          role: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          department?: string | null;
          email?: string | null;
          full_name?: string;
          id: string;
          is_active?: boolean;
          role?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          department?: string | null;
          email?: string | null;
          full_name?: string;
          id?: string;
          is_active?: boolean;
          role?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      request_activities: {
        Row: {
          activity: string;
          contract_qty: string | null;
          created_at: string | null;
          depth: number | null;
          executed_qty: string | null;
          id: string;
          length: number | null;
          reason: string | null;
          request_id: string;
          serial_number: number;
          unit: string | null;
          updated_at: string | null;
          width: number | null;
        };
        Insert: {
          activity: string;
          contract_qty?: string | null;
          created_at?: string | null;
          depth?: number | null;
          executed_qty?: string | null;
          id?: string;
          length?: number | null;
          reason?: string | null;
          request_id: string;
          serial_number: number;
          unit?: string | null;
          updated_at?: string | null;
          width?: number | null;
        };
        Update: {
          activity?: string;
          contract_qty?: string | null;
          created_at?: string | null;
          depth?: number | null;
          executed_qty?: string | null;
          id?: string;
          length?: number | null;
          reason?: string | null;
          request_id?: string;
          serial_number?: number;
          unit?: string | null;
          updated_at?: string | null;
          width?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "request_activities_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "change_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      request_attachments: {
        Row: {
          created_at: string | null;
          description: string | null;
          file_path: string;
          file_size: number;
          filename: string;
          id: string;
          mime_type: string;
          original_filename: string;
          request_id: string;
          updated_at: string | null;
          uploaded_by: string;
          version_number: number;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          file_path: string;
          file_size?: number;
          filename: string;
          id?: string;
          mime_type: string;
          original_filename: string;
          request_id: string;
          updated_at?: string | null;
          uploaded_by: string;
          version_number?: number;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          file_path?: string;
          file_size?: number;
          filename?: string;
          id?: string;
          mime_type?: string;
          original_filename?: string;
          request_id?: string;
          updated_at?: string | null;
          uploaded_by?: string;
          version_number?: number;
        };
        Relationships: [
          {
            foreignKeyName: "request_attachments_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "change_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "request_attachments_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      request_audit_log: {
        Row: {
          action: string;
          changed_by: string;
          comment: string | null;
          created_at: string | null;
          id: string;
          new_status: string | null;
          previous_status: string | null;
          request_id: string | null;
          timestamp: string | null;
        };
        Insert: {
          action: string;
          changed_by: string;
          comment?: string | null;
          created_at?: string | null;
          id?: string;
          new_status?: string | null;
          previous_status?: string | null;
          request_id?: string | null;
          timestamp?: string | null;
        };
        Update: {
          action?: string;
          changed_by?: string;
          comment?: string | null;
          created_at?: string | null;
          id?: string;
          new_status?: string | null;
          previous_status?: string | null;
          request_id?: string | null;
          timestamp?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "request_audit_log_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "change_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      delegations: {
        Row: {
          created_at: string | null;
          from_user_id: string;
          id: string;
          request_id: string;
          status: string | null;
          to_user_id: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          from_user_id: string;
          id?: string;
          request_id: string;
          status?: string | null;
          to_user_id: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          from_user_id?: string;
          id?: string;
          request_id?: string;
          status?: string | null;
          to_user_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "delegations_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "change_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "delegations_from_user_id_fkey";
            columns: ["from_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
