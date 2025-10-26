// Database type definitions for Supabase
// This file will be auto-generated later using Supabase CLI
// For now, we define the basic structure manually

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          auth_user_id: string | null;
          email: string;
          role: "hr_admin" | "sodexo" | "omc" | "payroll" | "toplux";
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          auth_user_id?: string | null;
          email: string;
          role: "hr_admin" | "sodexo" | "omc" | "payroll" | "toplux";
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          auth_user_id?: string | null;
          email?: string;
          role?: "hr_admin" | "sodexo" | "omc" | "payroll" | "toplux";
          is_active?: boolean;
          created_at?: string;
        };
      };
      employees: {
        Row: {
          id: string;
          first_name: string;
          surname: string;
          ssn: string;
          email: string | null;
          mobile: string | null;
          rank: string | null;
          gender: string | null;
          town_district: string | null;
          hire_date: string;
          termination_date: string | null;
          termination_reason: string | null;
          is_terminated: boolean;
          is_archived: boolean;
          comments: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          first_name: string;
          surname: string;
          ssn: string;
          email?: string | null;
          mobile?: string | null;
          rank?: string | null;
          gender?: string | null;
          town_district?: string | null;
          hire_date: string;
          termination_date?: string | null;
          termination_reason?: string | null;
          is_terminated?: boolean;
          is_archived?: boolean;
          comments?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          first_name?: string;
          surname?: string;
          ssn?: string;
          email?: string | null;
          mobile?: string | null;
          rank?: string | null;
          gender?: string | null;
          town_district?: string | null;
          hire_date?: string;
          termination_date?: string | null;
          termination_reason?: string | null;
          is_terminated?: boolean;
          is_archived?: boolean;
          comments?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      column_config: {
        Row: {
          id: string;
          column_name: string;
          column_type: "text" | "number" | "date" | "boolean";
          role_permissions: Json;
          is_masterdata: boolean;
          category: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          column_name: string;
          column_type: "text" | "number" | "date" | "boolean";
          role_permissions?: Json;
          is_masterdata?: boolean;
          category?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          column_name?: string;
          column_type?: "text" | "number" | "date" | "boolean";
          role_permissions?: Json;
          is_masterdata?: boolean;
          category?: string | null;
          created_at?: string;
        };
      };
      important_dates: {
        Row: {
          id: string;
          week_number: number | null;
          year: number;
          category: string;
          date_description: string;
          date_value: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          week_number?: number | null;
          year: number;
          category: string;
          date_description: string;
          date_value: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          week_number?: number | null;
          year?: number;
          category?: string;
          date_description?: string;
          date_value?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      sodexo_data: {
        Row: {
          id: string;
          employee_id: string;
          data: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          employee_id: string;
          data?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          employee_id?: string;
          data?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      omc_data: {
        Row: {
          id: string;
          employee_id: string;
          data: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          employee_id: string;
          data?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          employee_id?: string;
          data?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      payroll_data: {
        Row: {
          id: string;
          employee_id: string;
          data: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          employee_id: string;
          data?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          employee_id?: string;
          data?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      toplux_data: {
        Row: {
          id: string;
          employee_id: string;
          data: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          employee_id: string;
          data?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          employee_id?: string;
          data?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
