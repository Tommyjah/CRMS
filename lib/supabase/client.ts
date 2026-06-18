import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types_db'

export const supabase = createBrowserClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
export const createClientBrowser = () => supabase

export type ChangeRequest = Database['public']['Tables']['change_requests']['Row']
export type ChangeRequestInsert = Database['public']['Tables']['change_requests']['Insert']
export type ChangeRequestUpdate = Database['public']['Tables']['change_requests']['Update']
export type RequestAuditLog = Database['public']['Tables']['request_audit_log']['Row']
export type RequestAuditLogInsert = Database['public']['Tables']['request_audit_log']['Insert']
