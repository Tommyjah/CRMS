'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Define explicit status type to prevent string bugs
export type RequestStatus = 'PENDING_DEPT_1' | 'PENDING_DEPT_2' | 'PENDING_DEPT_3' | 'APPROVED' | 'REJECTED' | 'DRAFT'

export async function createChangeRequest(
  formData: FormData, 
  activities: { serial_number: number; activity: string; unit: string; contract_qty: string; executed_qty: string; reason: string }[],
extraFields?: {
     site_coordinates?: string
     route_impact?: string
     duct_sizes?: string
     material_cost_variation?: string
     route_deviations?: string
     estimated_downtime?: string
     technical_reason?: string
     fixed_network_approver?: string
     wire_line_approver?: string
     engineering_approver?: string
     target_segments?: string
   }
) {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return { error: userError?.message ?? 'Not authenticated' }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('department, role')
    .eq('id', user.id)
    .single()

  // Step 1: Restrict Request Creation Permissions (Initiator Only)
  if (profileError || !profile) {
    return { error: profileError?.message ?? 'Profile not found' }
  }
  if (profile.role !== 'INITIATOR' && profile.role !== 'REQUESTER') {
    return { error: 'Access Denied: Only Initiators can create new requests.' }
  }

  // 1. Build the payload object with explicit type guards
  const payload = {
    project_name: String(formData.get('project_name') ?? ''),
    project_number: String(formData.get('project_number') ?? ''),
    initiator_name: String(formData.get('initiator_name') ?? ''),
    priority_level: String(formData.get('priority_level') ?? ''),
    change_description: String(formData.get('change_description') ?? ''),
    user_id: user.id,
    // Use the nullish coalescing operator (??) to guarantee a strict string
    initiated_by: profile.department ?? 'Initiator',
status: 'PENDING_DEPT_1',
     target_segments: extraFields?.target_segments ?? null,
     // Step 3: Add extra technical and approver fields
     site_coordinates: extraFields?.site_coordinates ?? null,
     route_impact: extraFields?.route_impact ?? null,
     duct_sizes: extraFields?.duct_sizes ?? null,
     material_cost_variation: extraFields?.material_cost_variation ?? null,
     route_deviations: extraFields?.route_deviations ?? null,
     estimated_downtime: extraFields?.estimated_downtime ?? null,
     technical_reason: extraFields?.technical_reason ?? null,
     fixed_network_approver: extraFields?.fixed_network_approver ?? null,
     wire_line_approver: extraFields?.wire_line_approver ?? null,
     engineering_approver: extraFields?.engineering_approver ?? null,
   }

  // 2. Cast the payload 'as any' inside the insert function to satisfy the Supabase client
  const { data, error } = await supabase
    .from('change_requests')
    .insert(payload as any) // 👈 Typecast here to clear strict schema check errors
    .select('id')
    .single()

  if (error) {
    return { error: error.message }
  }

  if (data && activities.length > 0) {
    const { error: activitiesError } = await supabase
      .from('request_activities')
      .insert(
        activities.map((activity) => ({
          ...activity,
          request_id: data.id,
        })),
      )

    if (activitiesError) {
      return { error: activitiesError.message }
    }
  }

  revalidatePath('/')
  return { success: true }
}

export async function getRequestActivities(requestId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('request_activities')
    .select('serial_number, activity, unit, contract_qty, executed_qty, reason')
    .eq('request_id', requestId)
    .order('serial_number', { ascending: true })

  if (error) {
    return { error: error.message, data: null }
  }

  return { error: null, data: (data ?? []) as { serial_number: number; activity: string; unit: string | null; contract_qty: string | null; executed_qty: string | null; reason: string | null }[] }
}

/**
 * 🔥 UPGRADED: Handles progressive sequential department approvals securely
 */
export async function updateRequestStatus(requestId: string, action: 'APPROVE' | 'REJECT') {
  const supabase = await createClient()

  // 1. Authenticate user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Not authenticated' }

  // 2. Fetch user role and department details
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('department, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) return { error: 'Failed to authenticate department details.' }
  if (profile.role !== 'APPROVER') return { error: 'Unauthorized: Only designated Approvers can perform this action.' }

  // 3. Fetch current status of the target ticket
  const { data: request, error: requestError } = await supabase
    .from('change_requests')
    .select('status')
    .eq('id', requestId)
    .single()

  if (requestError || !request) return { error: 'Change request ticket not found.' }

  let nextStatus: RequestStatus = request.status as RequestStatus

  // 4. Handle Rejection (Rejection immediately stops the pipeline)
  if (action === 'REJECT') {
    nextStatus = 'REJECTED'
  } else {
    // 5. Compute Sequential State Engine Logic for Approval Actions
    switch (request.status) {
      case 'PENDING_DEPT_1': // Fixed Network Queue
        if (profile.department !== 'Fixed Network') return { error: 'Action denied: Requires Fixed Network Approver credentials.' }
        nextStatus = 'PENDING_DEPT_2' // Pass forward to Wire Line Planning
        break;

      case 'PENDING_DEPT_2': // Wire Line Planning Queue
        if (profile.department !== 'Wire Line Planning') return { error: 'Action denied: Requires Wire Line Planning Approver credentials.' }
        nextStatus = 'PENDING_DEPT_3' // Pass forward to Engineering
        break;

      case 'PENDING_DEPT_3': // Engineering Queue
        if (profile.department !== 'Engineering') return { error: 'Action denied: Requires Engineering Approver credentials.' }
        nextStatus = 'APPROVED' // Complete final sign-off
        break;

      default:
        return { error: 'This ticket is not active or has already reached a finalized state.' }
    }
  }

  // 6. Persist status migration change safely
  const { error: updateError } = await supabase
    .from('change_requests')
    .update({ status: nextStatus })
    .eq('id', requestId)

  if (updateError) return { error: updateError.message }

  revalidatePath('/')
  return { success: true }
}

export async function getUserProfile() {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return { error: userError?.message ?? 'Not authenticated', data: null }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, full_name, department, role, created_at, updated_at, is_active')
    .eq('id', user.id)
    .single()

  if (profileError && profileError.code !== 'PGRST116') {
    return { error: profileError.message, data: null }
  }

  const defaultProfile = {
    id: user.id,
    email: user.email ?? null,
    full_name: (user.user_metadata?.full_name ?? '') as string,
    department: null,
    role: 'REQUESTER',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_active: true,
  }

  return { error: null, data: profile ?? defaultProfile }
}

export async function updateUserProfile(department: string) {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return { error: userError?.message ?? 'Not authenticated' }
  }

  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      email: user.email ?? '',
      department,
      role: 'REQUESTER',
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'id',
    })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/')
  return { success: true }
}