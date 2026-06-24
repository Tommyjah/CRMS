'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { isDepartmentResponsible } from '@/lib/security-constants'
import { REQUEST_STATUSES, PRIORITY_LEVELS, isStatus, isPriority, isRole, isDepartment } from '@/lib/constants'
import { getCurrentProfile, resolveInitiatorRole } from '@/lib/auth'
import type { ChangeRequest } from '@/lib/supabase/client'
import type { Database } from '@/types_db'

type RequestStatus = (typeof REQUEST_STATUSES)[number]
type PriorityLevel = (typeof PRIORITY_LEVELS)[number]

function logAuthFailure(userId: string, action: string, reason: string, metadata?: Record<string, unknown>) {
  console.warn(`[AUTH FAILURE] User ${userId} - Action: ${action} - Reason: ${reason}`, metadata)
}

function requireString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback
}

type ExtraFields = {
  priority_level?: PriorityLevel
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

type CreateChangeRequestInput = {
  project_name: string
  project_number?: string | null
  initiator_name: string
  priority_level: PriorityLevel
  change_description?: string | null
  site_coordinates?: string | null
  route_impact?: string | null
  duct_sizes?: string | null
  material_cost_variation?: string | null
  route_deviations?: string | null
  estimated_downtime?: string | null
  technical_reason?: string | null
  fixed_network_approver?: string | null
  wire_line_approver?: string | null
  engineering_approver?: string | null
  target_segments?: string | null
}

/**
 * Security Model:
 * - ALL authenticated users can SELECT * FROM change_requests (full transparency)
 * - ONLY the responsible department for the current status can APPROVE
 * - ANY APPROVER role can REJECT (immediate pipeline stop with accountability)
 * - RLS policies in supabase/migrations/0002_rls_change_requests.sql enforce DB-level security
 */

/**
 * Creates a new change request with validated form data.
 * Only users with INITIATOR or REQUESTER role can create requests.
 */
export async function createChangeRequest(
  formData: FormData,
  activities: { serial_number: number; activity: string; unit: string; contract_qty: string; executed_qty: string; reason: string }[],
  extraFields: ExtraFields = {}
) {
  const { profile, user, error: authError } = await getCurrentProfile()
  if (authError || !user || !profile) {
    return { success: false, error: authError ?? 'Not authenticated' }
  }
  if (profile.role !== 'INITIATOR' && profile.role !== 'REQUESTER') {
    return { success: false, error: 'Access Denied: Only Initiators can create new requests.' }
  }

  const rawPriorityCandidate = formData.get('priority_level') ?? extraFields.priority_level
  if (!isPriority(rawPriorityCandidate)) {
    return { success: false, error: 'Invalid priority level' }
  }
  const rawPriority: PriorityLevel = rawPriorityCandidate

  const getString = (key: string, fallback: string | null = null): string | null => {
    const val = formData.get(key)
    return typeof val === 'string' && val.length > 0 ? val : fallback
  }

  const input: CreateChangeRequestInput = {
    project_name: requireString(formData.get('project_name'), ''),
    project_number: getString('project_number'),
    initiator_name: requireString(formData.get('initiator_name'), ''),
    priority_level: rawPriority,
    change_description: getString('change_description'),
    site_coordinates: getString('site_coordinates'),
    route_impact: getString('route_impact'),
    duct_sizes: getString('duct_sizes'),
    material_cost_variation: getString('material_cost_variation'),
    route_deviations: getString('route_deviations'),
    estimated_downtime: getString('estimated_downtime'),
    technical_reason: getString('technical_reason'),
    fixed_network_approver: getString('fixed_network_approver'),
    wire_line_approver: getString('wire_line_approver'),
    engineering_approver: getString('engineering_approver'),
    target_segments: getString('target_segments'),
  }

  const payload: Database['public']['Tables']['change_requests']['Insert'] = {
    project_name: input.project_name,
    project_number: input.project_number ?? null,
    initiator_name: input.initiator_name,
    priority_level: input.priority_level,
    change_description: input.change_description ?? null,
    initiated_by: profile.department ?? 'Initiator',
    status: 'PENDING_DEPT_1',
    site_coordinates: input.site_coordinates ?? null,
    route_impact: input.route_impact ?? null,
    duct_sizes: input.duct_sizes ?? null,
    material_cost_variation: input.material_cost_variation ?? null,
    route_deviations: input.route_deviations ?? null,
    estimated_downtime: input.estimated_downtime ?? null,
    technical_reason: input.technical_reason ?? null,
    fixed_network_approver: input.fixed_network_approver ?? null,
    wire_line_approver: input.wire_line_approver ?? null,
    engineering_approver: input.engineering_approver ?? null,
    target_segments: input.target_segments ?? null,
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('change_requests')
    .insert(payload)
    .select('id')
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  if (data && activities.length > 0) {
    const activitiesPayload: Database['public']['Tables']['request_activities']['Insert'][] = activities.map((activity) => ({
      ...activity,
      request_id: data.id,
    }))

    const { error: activitiesError } = await supabase
      .from('request_activities')
      .insert(activitiesPayload)

    if (activitiesError) {
      return { success: false, error: activitiesError.message }
    }
  }

  revalidatePath('/')
  return { success: true, message: 'Change request created successfully' }
}

/**
 * Fetches activities for a specific change request.
 * Returns properly typed activity data with null-safe fields.
 */
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

  const activities = (data ?? []) as Database['public']['Tables']['request_activities']['Row'][]
  return { error: null, data: activities }
}

/**
 * Handles progressive sequential department approvals with defense in depth.
 * - RLS policies in DB provide first layer
 * - Server-side checks provide second layer
 * Only APPROVER role can act; responsible department for current status can APPROVE; any approver can REJECT.
 */
export async function updateRequestStatus(requestId: string, action: 'APPROVE' | 'REJECT') {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    logAuthFailure('unknown', action, 'Not authenticated')
    return { success: false, error: 'Not authenticated' }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('department, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    logAuthFailure(user.id, action, 'Profile lookup failed', { profileError })
    return { success: false, error: 'Failed to authenticate department details.' }
  }

  if (profile.role !== 'APPROVER') {
    logAuthFailure(user.id, action, 'User is not an approver', { role: profile.role })
    return { success: false, error: 'Unauthorized: Only designated Approvers can perform this action.' }
  }

  const { data: request, error: requestError } = await supabase
    .from('change_requests')
    .select('status')
    .eq('id', requestId)
    .single()

  if (requestError || !request) {
    logAuthFailure(user.id, action, 'Request not found', { requestId })
    return { success: false, error: 'Change request ticket not found.' }
  }

  if (!isStatus(request.status)) {
    logAuthFailure(user.id, action, 'Invalid status for approval', { status: request.status })
    return { success: false, error: 'This ticket is not active or has already reached a finalized state.' }
  }

  const currentStatus: RequestStatus = request.status

  if (request.status === 'APPROVED' || request.status === 'REJECTED') {
    logAuthFailure(user.id, action, 'Request already finalized', { status: request.status })
    return { success: false, error: 'This request has already been finalized and cannot be modified.' }
  }

  let nextStatus: RequestStatus = 'REJECTED'

  if (action === 'REJECT') {
    nextStatus = 'REJECTED'
  } else {
    switch (currentStatus) {
      case 'PENDING_DEPT_1':
        if (!isDepartmentResponsible('PENDING_DEPT_1', profile.department)) {
          logAuthFailure(user.id, action, 'Wrong department for approval', { required: 'Fixed Network', userDept: profile.department, status: request.status })
          return { success: false, error: 'Action denied: Only Fixed Network department approvers can approve this stage.' }
        }
        nextStatus = 'PENDING_DEPT_2'
        break
      case 'PENDING_DEPT_2':
        if (!isDepartmentResponsible('PENDING_DEPT_2', profile.department)) {
          logAuthFailure(user.id, action, 'Wrong department for approval', { required: 'Wire Line Planning', userDept: profile.department, status: request.status })
          return { success: false, error: 'Action denied: Only Wire Line Planning department approvers can approve this stage.' }
        }
        nextStatus = 'PENDING_DEPT_3'
        break
      case 'PENDING_DEPT_3':
        if (!isDepartmentResponsible('PENDING_DEPT_3', profile.department)) {
          logAuthFailure(user.id, action, 'Wrong department for approval', { required: 'Engineering', userDept: profile.department, status: request.status })
          return { success: false, error: 'Action denied: Only Engineering department approvers can approve this stage.' }
        }
        nextStatus = 'APPROVED'
        break
      default:
        logAuthFailure(user.id, action, 'Invalid status for approval', { status: request.status })
        return { success: false, error: 'This ticket is not active or has already reached a finalized state.' }
    }
  }

  const { error: updateError } = await supabase
    .from('change_requests')
    .update({ status: nextStatus })
    .eq('id', requestId)

  if (updateError) {
    logAuthFailure(user.id, action, 'Database update failed', { updateError })
    return { success: false, error: updateError.message }
  }

  revalidatePath('/')
  return { success: true, message: action === 'APPROVE' ? 'Request approved successfully' : 'Request rejected successfully' }
}

/**
 * Fetches the current user's profile from the database.
 * Returns a default profile for users without an existing profile.
 */
export async function getUserProfile() {
  const { profile, error } = await getCurrentProfile()
  if (error) {
    return { success: false, error, data: null }
  }
  return { success: true, data: profile }
}

/**
 * Updates current user's profile with validated department and optional full name.
 */
export async function updateUserProfile(department: string, fullName?: string) {
  if (!isDepartment(department as unknown)) {
    return { success: false, error: 'Invalid department' }
  }

  const { profile, user, error: authError } = await getCurrentProfile()
  if (authError || !user || !profile) {
    return { success: false, error: authError ?? 'Not authenticated' }
  }

  const currentRole = profile.role
  const isAllowedRole = currentRole === 'APPROVER' || currentRole === 'ADMIN'
  const departmentChanged = department !== profile.department

  if (departmentChanged && !isAllowedRole) {
    return { success: false, error: 'Department change is restricted. Contact admin if needed.' }
  }

  const resolvedName = typeof fullName === 'string' && fullName.length > 0
    ? fullName
    : typeof profile.full_name === 'string' && profile.full_name.length > 0
      ? profile.full_name
      : ''

  const finalRole = departmentChanged ? resolveInitiatorRole(department) : currentRole

  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: resolvedName,
      department,
      role: finalRole,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/')
  return { success: true, message: 'Profile updated successfully' }
}

/**
 * Creates user profile for OAuth signups with validated role.
 */
export async function createUserProfile(fullName: string, department: string, role: string = 'REQUESTER') {
  if (!isRole(role as unknown)) {
    return { success: false, error: 'Invalid role specified' }
  }

  const { user, error: authError } = await getCurrentProfile()
  if (authError || !user) {
    return { success: false, error: authError ?? 'Not authenticated' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      email: user.email ?? '',
      full_name: fullName,
      department,
      role: role as Database['public']['Tables']['profiles']['Row']['role'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: true,
    }, { onConflict: 'id' })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/')
  return { success: true, message: 'Profile created successfully' }
}

export type RequestFilters = {
  search?: string
  status?: string
  priority?: string
  dateFrom?: string
  dateTo?: string
  department?: string
  page: number
  limit: number
}

export async function getFilteredChangeRequests(filters: RequestFilters) {
  const page = Math.max(1, filters.page)
  const limit = Math.min(100, Math.max(1, filters.limit))
  const from = (page - 1) * limit
  const to = from + limit - 1

  const supabase = await createClient()

  let query = supabase
    .from('change_requests')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (filters.search && filters.search.trim().length > 0) {
    const term = `%${filters.search.trim()}%`
    query = query.or(
      `project_name.ilike.${term},project_number.ilike.${term},change_description.ilike.${term},initiator_name.ilike.${term}`
    )
  }

  if (filters.status && filters.status !== 'All') {
    query = query.eq('status', filters.status)
  }

  if (filters.priority && filters.priority !== 'All') {
    query = query.eq('priority_level', filters.priority)
  }

  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom)
  }

  if (filters.dateTo) {
    query = query.lte('created_at', filters.dateTo)
  }

  if (filters.department && filters.department !== 'All') {
    query = query.eq('initiated_by', filters.department)
  }

  const { data, error, count } = await query

  if (error) {
    return { success: false, error: error.message, data: [], totalCount: 0, page, limit, totalPages: 0 }
  }

  const totalCount = count ?? 0
  return {
    success: true,
    data: (data as ChangeRequest[] | null) ?? [],
    totalCount,
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit),
  }
}
