'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { isDepartmentResponsible } from '@/lib/security-constants'
import { REQUEST_STATUSES, PRIORITY_LEVELS, isStatus, isPriority, isRole, isDepartment } from '@/lib/constants'
import { getCurrentProfile, getUserWithRetry, resolveInitiatorRole } from '@/lib/auth'
import type { ChangeRequest } from '@/lib/supabase/client'
import type { Database } from '@/types_db'

type UploadAttachmentInput = {
  requestId: string
  file: File
  description?: string | null
}

type UploadSitePhotoInput = {
  requestId: string
  file: File
  latitude?: number | null
  longitude?: number | null
}

type RequestStatus = (typeof REQUEST_STATUSES)[number]
type PriorityLevel = (typeof PRIORITY_LEVELS)[number]

function logAuthFailure(userId: string, action: string, reason: string, metadata?: Record<string, unknown>) {
  console.warn(`[AUTH FAILURE] User ${userId} - Action: ${action} - Reason: ${reason}`, metadata)
}

function requireString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback
}

function toErrorString(error: unknown, fallback: string): string {
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error && typeof (error as { message: unknown }).message === 'string') {
    return (error as { message: string }).message
  }
  return fallback
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Uploads a file to Supabase Storage with retry/backoff.
 *
 * The Supabase storage backend serializes writes through a single compaction
 * worker ("Another write batch or compaction is already active"). When that
 * worker is busy, uploads transiently fail with a 544 database timeout. We
 * retry with an increasing backoff and a short settle delay between attempts
 * so the compaction worker can drain before we write again.
 */
async function uploadToStorageWithRetry(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bucket: string,
  path: string,
  file: File,
  opts: { cacheControl: string; upsert: boolean },
  label: string,
  maxAttempts = 3
): Promise<{ error: { message: string } | null }> {
  let lastError: { message: string } | null = null
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      const backoff = 500 * attempt
      console.warn(`[${label}] storage upload attempt ${attempt + 1} after ${backoff}ms backoff`)
      await sleep(backoff)
    }
    const { error } = await supabase.storage.from(bucket).upload(path, file, opts)
    if (!error) {
      return { error: null }
    }
    lastError = { message: error.message }
    const isCompaction = /compaction|already active|timed out/i.test(error.message)
    if (!isCompaction) {
      return { error }
    }
    console.warn(`[${label}] storage upload failed (attempt ${attempt + 1}/${maxAttempts}): ${error.message}`)
  }
  // Settle delay so the compaction worker finishes before the caller proceeds.
  await sleep(300)
  return { error: lastError }
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
   work_order?: string
   change_number?: string
   change_type?: string
  }

export async function logRequestActivity(
    requestId: string,
    action: 'CREATE' | 'APPROVE' | 'REJECT' | 'DELEGATE' | 'ESCALATE',
    previousStatus: string | null,
    newStatus: string | null,
    comment?: string | null
  ) {
   const supabase = await createClient()

   const { user } = await getUserWithRetry(supabase, 2)
   const userId = user?.id ?? 'system'

   const { error } = await supabase
     .from('request_audit_log')
     .insert({
       request_id: requestId,
       action,
       previous_status: previousStatus,
       new_status: newStatus,
       changed_by: userId,
       comment: comment ?? null,
       timestamp: new Date().toISOString(),
     })

   if (error) {
     console.error('Audit log write failed:', error.message)
     return { success: false, error: error.message }
   }

   return { success: true }
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
  work_order?: string | null
  change_number?: string | null
  change_type?: string | null
}

/**
 * Security Model:
 * - ALL authenticated users can SELECT * FROM change_requests (full transparency)
 * - ALL authenticated users can create new requests
 * - ONLY the responsible department for the current status can APPROVE
 * - ANY APPROVER role can REJECT (immediate pipeline stop with accountability)
 * - RLS policies in supabase/migrations/0002_rls_change_requests.sql enforce DB-level security
 */

/**
 * Creates a new change request with validated form data.
 * Any authenticated user can create requests.
 */
export async function createChangeRequest(
  formData: FormData,
  activities: { serial_number: number; activity: string; unit: string; length: number | null; width: number | null; depth: number | null; contract_qty: string; executed_qty: string; reason: string }[],
  extraFields: ExtraFields = {}
) {
  const { profile, user, error: authError } = await getCurrentProfile()
  if (authError || !user || !profile) {
    return { success: false, error: toErrorString(authError, 'Not authenticated') }
  }

  const rawPriorityCandidate = formData.get('priority_level') ?? extraFields.priority_level
  if (!isPriority(rawPriorityCandidate)) {
    return { success: false, error: 'Invalid priority level' }
  }
  const rawPriority: PriorityLevel = rawPriorityCandidate

  const getString = (key: string, fallback: string | null = null): string | null => {
    const fromForm = formData.get(key)
    const fromExtra = (extraFields as Record<string, unknown>)[key]
    const val = typeof fromForm === 'string' ? fromForm : typeof fromExtra === 'string' ? fromExtra : null
    return val && val.length > 0 ? val : fallback
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
    work_order: getString('work_order'),
    change_number: getString('change_number'),
    change_type: getString('change_type'),
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
    work_order: input.work_order ?? null,
    change_number: input.change_number ?? null,
    change_type: input.change_type ?? null,
  }

  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: changeNumber, error: cnError } = await (supabase as any).rpc('get_next_change_number')

  if (cnError || !changeNumber) {
    return { success: false, error: toErrorString(cnError, 'Failed to generate change number') }
  }

  payload.change_number = changeNumber as string

  const { data, error } = await supabase
   .from('change_requests')
   .insert(payload)
   .select('*')
   .single()

   if (error) {
     return { success: false, error: error.message }
   }

   // Log creation audit entry
   await logRequestActivity(
     data.id,
     'CREATE',
     null,
     'PENDING_DEPT_1',
     null
   )

   if (data && activities.length > 0) {
    const activitiesPayload: Database['public']['Tables']['request_activities']['Insert'][] = activities.map((activity) => ({
      request_id: data.id,
      serial_number: activity.serial_number,
      activity: activity.activity,
      unit: activity.unit,
      length: activity.length,
      width: activity.width,
      depth: activity.depth,
      contract_qty: activity.contract_qty,
      executed_qty: activity.executed_qty,
      reason: activity.reason,
    }))

    const { error: activitiesError } = await supabase
      .from('request_activities')
      .insert(activitiesPayload)

    if (activitiesError) {
      return { success: false, error: activitiesError.message }
    }
  }

   revalidatePath('/create-request')
   return {
     success: true,
     message: 'Change request created successfully',
     requestId: data.id,
     changeNumber,
     request: data as Database['public']['Tables']['change_requests']['Row'],
   }
 }

/**
 * Fetches activities for a specific change request.
 * Returns properly typed activity data with null-safe fields.
 */
export async function getRequestActivities(requestId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('request_activities')
    .select('serial_number, activity, unit, length, width, depth, contract_qty, executed_qty, reason')
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
 * - Approvers can reject to PENDING_INITIATOR_REVIEW (initiator-only full rejection)
 * Only APPROVER role can act; responsible department for current status can APPROVE; any approver can REJECT.
 */
export async function updateRequestStatus(requestId: string, action: 'APPROVE' | 'REJECT', comment?: string | null) {
  const supabase = await createClient()

  const { user, error: userError } = await getUserWithRetry(supabase, 2)
  if (userError || !user) {
    logAuthFailure('unknown', action, 'Not authenticated')
    return { success: false, error: 'Not authenticated' }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('department, role, full_name')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    logAuthFailure(user.id, action, 'Profile lookup failed', { profileError })
    return { success: false, error: 'Failed to authenticate department details.' }
  }

  const { data: request, error: requestError } = await supabase
    .from('change_requests')
    .select('status, initiator_name')
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

  const requestInitiatorName = request.initiator_name ?? ''
  const currentUserFullName = profile.full_name ?? ''
  const isInitiator = currentUserFullName.trim().toLowerCase() === requestInitiatorName.trim().toLowerCase()

  let nextStatus: RequestStatus = 'REJECTED'

  if (action === 'REJECT') {
    if (isInitiator) {
      nextStatus = 'REJECTED'
    } else {
      if (profile.role !== 'APPROVER') {
        logAuthFailure(user.id, action, 'User is not an approver', { role: profile.role })
        return { success: false, error: 'Unauthorized: Only designated Approvers can perform this action.' }
      }
      nextStatus = 'PENDING_INITIATOR_REVIEW'
    }
  } else {
    if (currentStatus === 'PENDING_INITIATOR_REVIEW') {
      if (!isInitiator) {
        logAuthFailure(user.id, action, 'Initiator action required', { required: 'Initiator', userDept: profile.department, status: request.status })
        return { success: false, error: 'Action denied: Only the Initiator can resume this request from review.' }
      }
      nextStatus = 'PENDING_DEPT_1'
    } else {
      if (profile.role !== 'APPROVER') {
        logAuthFailure(user.id, action, 'User is not an approver', { role: profile.role })
        return { success: false, error: 'Unauthorized: Only designated Approvers can perform this action.' }
      }

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
  }

  const { error: updateError } = await supabase
       .from('change_requests')
       .update({ status: nextStatus })
       .eq('id', requestId)

    if (updateError) {
      logAuthFailure(user.id, action, 'Database update failed', { updateError })
      return { success: false, error: updateError.message }
    }

     // Log the status change in audit log
     await logRequestActivity(
       requestId,
       action === 'APPROVE' ? 'APPROVE' : 'REJECT',
       currentStatus,
       nextStatus,
       action === 'REJECT' ? comment ?? null : null
     )

     revalidatePath('/')
     return { success: true, message: action === 'APPROVE' ? 'Request approved successfully' : 'Request rejected successfully' }
  }

/**
 * Delegates the current approver's approval to another person.
 * Accepts a free-text name/email for the delegatee.
 */
export async function delegateApproval(requestId: string, delegateTo: string) {
  const supabase = await createClient()
  const { profile, user, error: authError } = await getCurrentProfile()

  if (authError || !user || !profile) {
    logAuthFailure('unknown', 'DELEGATE', 'Not authenticated')
    return { success: false, error: toErrorString(authError, 'Not authenticated') }
  }

  const { data: request, error: requestError } = await supabase
    .from('change_requests')
    .select('status')
    .eq('id', requestId)
    .single()

  if (requestError || !request) {
    logAuthFailure(user.id, 'DELEGATE', 'Request not found', { requestId })
    return { success: false, error: 'Change request ticket not found.' }
  }

  if (!isStatus(request.status)) {
    logAuthFailure(user.id, 'DELEGATE', 'Invalid status for delegation', { status: request.status })
    return { success: false, error: 'This ticket is not active or has already reached a finalized state.' }
  }

  if (request.status === 'APPROVED' || request.status === 'REJECTED') {
    logAuthFailure(user.id, 'DELEGATE', 'Request already finalized', { status: request.status })
    return { success: false, error: 'This request has already been finalized and cannot be delegated.' }
  }

  const trimmedDelegateTo = delegateTo.trim()
  if (!trimmedDelegateTo) {
    return { success: false, error: 'Please enter a name or email for the delegatee.' }
  }

  const { error: delegationError } = await supabase
    .from('delegations')
    .insert({
      request_id: requestId,
      from_user_id: profile.id,
      to_user_id: trimmedDelegateTo,
      status: 'active',
    })

  if (delegationError) {
    logAuthFailure(user.id, 'DELEGATE', 'Database insert failed', { delegationError })
    return { success: false, error: delegationError.message }
  }

  await logRequestActivity(
    requestId,
    'DELEGATE',
    request.status,
    request.status,
    `Delegated approval to ${trimmedDelegateTo}`
  )

  revalidatePath('/')
  return { success: true, message: `Approval delegated to ${trimmedDelegateTo}` }
}

/**
 * Escalates the current request to a higher authority.
 * Accepts a free-text name/email for the escalation target.
 * Does not change the request status; only logs the escalation in the audit trail.
 */
export async function escalateApproval(requestId: string, escalatedTo: string) {
  const supabase = await createClient()
  const { profile, user, error: authError } = await getCurrentProfile()

  if (authError || !user || !profile) {
    logAuthFailure('unknown', 'ESCALATE', 'Not authenticated')
    return { success: false, error: toErrorString(authError, 'Not authenticated') }
  }

  const { data: request, error: requestError } = await supabase
    .from('change_requests')
    .select('status')
    .eq('id', requestId)
    .single()

  if (requestError || !request) {
    logAuthFailure(user.id, 'ESCALATE', 'Request not found', { requestId })
    return { success: false, error: 'Change request ticket not found.' }
  }

  if (!isStatus(request.status)) {
    logAuthFailure(user.id, 'ESCALATE', 'Invalid status for escalation', { status: request.status })
    return { success: false, error: 'This ticket is not active or has already reached a finalized state.' }
  }

  if (request.status === 'APPROVED' || request.status === 'REJECTED') {
    logAuthFailure(user.id, 'ESCALATE', 'Request already finalized', { status: request.status })
    return { success: false, error: 'This request has already been finalized and cannot be escalated.' }
  }

  const trimmedEscalatedTo = escalatedTo.trim()
  if (!trimmedEscalatedTo) {
    return { success: false, error: 'Please enter a name or email for the escalation target.' }
  }

  await logRequestActivity(
    requestId,
    'ESCALATE',
    request.status,
    request.status,
    `Escalated to ${trimmedEscalatedTo}`
  )

  revalidatePath('/')
  return { success: true, message: `Request escalated to ${trimmedEscalatedTo}` }
}

/**
 * Fetches the current user's profile from the database.
 * Returns a default profile for users without an existing profile.
 * Retries once with a short delay to handle timing issues between
 * middleware auth and component render on initial page load.
 */
export async function getUserProfile() {
  const { profile, error } = await getCurrentProfile()
  if (error) {
    return { success: false, error, data: null }
  }
  return { success: true, data: profile }
}

/**
 * Fetches change requests that have been delegated to the current user.
 * Matches against the user's email and full_name in the delegations table.
 */
export async function getDelegatedToMeRequests() {
  const { profile, user, error: authError } = await getCurrentProfile()
  if (authError || !user || !profile) {
    return { success: false, error: toErrorString(authError, 'Not authenticated'), data: [] }
  }

  const supabase = await createClient()

  const searchTerms = [profile.email, profile.full_name].filter((term): term is string => typeof term === 'string' && term.trim().length > 0)

  if (searchTerms.length === 0) {
    return { success: true, data: [] }
  }

  const results = await Promise.all(
    searchTerms.map((term) =>
      supabase
        .from('delegations')
        .select(`
          *,
          change_requests (
            id,
            project_name,
            project_number,
            status,
            created_at,
            updated_at,
            change_description,
            description,
            priority_level,
            initiated_by,
            initiator_name,
            fixed_network_approver,
            wire_line_approver,
            engineering_approver,
            work_order,
            change_number,
            change_type
          )
        `)
        .eq('status', 'active')
        .eq('to_user_id', term)
        .order('created_at', { ascending: false })
    )
  )

  const allData = results.flatMap((result) => result.data ?? [])
  const seen = new Set<string>()
  const deduped = allData.filter((item) => {
    const key = `${item.request_id}-${item.to_user_id}-${item.created_at}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const fromUserIds = Array.from(new Set(deduped.map((item) => item.from_user_id).filter(Boolean)))
  const profileMap = new Map<string, string>()

  if (fromUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', fromUserIds)

    for (const p of profiles ?? []) {
      profileMap.set(p.id, p.full_name || p.email || 'Unknown')
    }
  }

  const enriched = deduped.map((item) => ({
    ...item,
    from_user_name: profileMap.get(item.from_user_id) || null,
  }))

  return {
    success: true,
    data: enriched as unknown as { change_requests: ChangeRequest; from_user_name: string | null }[],
  }
}

/**
 * Updates current user's profile.
 * - Department is locked after first setup (onboarding).
 * - Role can be changed by the user (APPROVER / REQUESTER).
 * - fullName can always be updated.
 */
export async function updateUserProfile(department: string, fullName?: string, role?: string) {
  if (!isDepartment(department as unknown)) {
    return { success: false, error: 'Invalid department' }
  }
  if (role !== undefined && !isRole(role as unknown)) {
    return { success: false, error: 'Invalid role' }
  }

  const { profile, user, error: authError } = await getCurrentProfile()
  if (authError || !user || !profile) {
    return { success: false, error: toErrorString(authError, 'Not authenticated') }
  }

  const previousDepartment = profile.department
  const isFirstTimeSetup = !previousDepartment || previousDepartment === ''
  const departmentChanged = department !== previousDepartment

  if (departmentChanged && !isFirstTimeSetup) {
    return { success: false, error: 'Department is locked after onboarding and cannot be changed.' }
  }

  const resolvedName = typeof fullName === 'string' && fullName.length > 0
    ? fullName
    : typeof profile.full_name === 'string' && profile.full_name.length > 0
      ? profile.full_name
      : ''

  const finalRole = role ?? profile.role ?? resolveInitiatorRole(department)

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
    return { success: false, error: toErrorString(authError, 'Not authenticated') }
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

export async function getRequestAuditLogs(requestId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('request_audit_log')
    .select('*')
    .eq('request_id', requestId)
    .order('timestamp', { ascending: false })

  if (error) {
    return { error: error.message, data: null }
  }

  const logs = (data ?? []) as Database['public']['Tables']['request_audit_log']['Row'][]

  const userIds = Array.from(
    new Set(
      logs
        .map((log) => log.changed_by)
        .filter((id): id is string => typeof id === 'string' && id.length > 0 && id !== 'system')
    )
  )

  const profilesMap = new Map<string, { full_name: string | null; email: string | null }>()

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds)

    for (const profile of profiles ?? []) {
      profilesMap.set(profile.id, { full_name: profile.full_name ?? null, email: profile.email ?? null })
    }
  }

  const enriched = logs.map((log) => ({
    ...log,
    changed_by_name: profilesMap.get(log.changed_by)?.full_name ?? null,
    changed_by_email: profilesMap.get(log.changed_by)?.email ?? null,
  }))

  return { error: null, data: enriched }
}

export async function getRequestAttachments(requestId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('request_attachments')
    .select('*')
    .eq('request_id', requestId)
    .order('version_number', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    return { error: error.message, data: null }
  }

  const attachments = (data ?? []) as Database['public']['Tables']['request_attachments']['Row'][]
  return { error: null, data: attachments }
}

export async function getRequestAttachmentCount(requestId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('request_attachments')
    .select('*', { count: 'exact', head: true })
    .eq('request_id', requestId)

  if (error) {
    return 0
  }

  return data?.length ?? 0
}

export async function getMyPendingCorrections() {
  const supabase = await createClient()

  const { user, error: userError } = await getUserWithRetry(supabase, 2)
  if (userError || !user) {
    return { success: false, error: userError ?? 'Not authenticated', data: [] }
  }

  const { data, error } = await supabase
    .from('change_requests')
    .select('*')
    .eq('status', 'PENDING_INITIATOR_REVIEW')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return { success: false, error: error.message, data: [] }
  }

  return { success: true, error: null, data: (data ?? []) as Database['public']['Tables']['change_requests']['Row'][] }
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

export type AttachmentFilters = {
  requestId: string
}

export async function uploadAttachment(input: UploadAttachmentInput): Promise<{ success: boolean; error: string | null; message?: string; version?: number }> {
  try {
    const supabase = await createClient()

     const { user, error: userError } = await getUserWithRetry(supabase, 2)
      console.log('[uploadAttachment] getUser result:', {
        userId: user?.id,
        userError,
      })

     if (userError || !user) {
       return { success: false, error: toErrorString(userError, 'Not authenticated') }
     }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, department, role, created_at, updated_at, is_active')
      .eq('id', user.id)
      .maybeSingle()

    console.log('[uploadAttachment] profile lookup:', {
      profileFound: Boolean(profile),
      profileError: profileError?.message,
    })

    if (profileError || !profile) {
      return { success: false, error: toErrorString(profileError, 'Profile not found') }
    }

    const requestId = input.requestId
    const file = input.file
    const maxFileSize = 50 * 1024 * 1024

    if (file.size > maxFileSize) {
      return { success: false, error: `File size exceeds ${maxFileSize / 1024 / 1024}MB limit` }
    }

    const isAllowed =
      file.type.startsWith('image/') ||
      file.type === 'application/pdf' ||
      ['application/dwg', 'application/acad', 'application/octet-stream'].includes(file.type) ||
      ['.pdf', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.tiff', '.dwg', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.zip']
        .some(ext => file.name.toLowerCase().endsWith(ext))

    if (!isAllowed) {
      return { success: false, error: 'File type not supported' }
    }

    console.log('[uploadAttachment] querying existing attachments', { requestId, originalFilename: file.name })

    const { data: existingFiles, error: existingError } = await supabase
      .from('request_attachments')
      .select('version_number')
      .eq('request_id', requestId)
      .eq('original_filename', file.name)
      .order('version_number', { ascending: false })
      .limit(1)

    console.log('[uploadAttachment] existing attachments query result:', {
      count: existingFiles?.length ?? 0,
      error: existingError?.message,
    })

    if (existingError) {
      console.error('[uploadAttachment] version query failed:', existingError)
      return { success: false, error: existingError.message }
    }

    const baseVersion = (existingFiles as { version_number: number }[] | null) && existingFiles.length > 0
      ? (existingFiles[0] as { version_number: number }).version_number
      : 0
    const newVersion = baseVersion + 1

    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9_\-.]+/g, '_')
    const storedFileName = `${Date.now()}_${sanitizedFileName}`
    const storagePath = `${requestId}/${storedFileName}`

    console.log('[uploadAttachment] uploading to storage', { storagePath })

    const { error: uploadError } = await supabase.storage
      .from('request-attachments')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('[uploadAttachment] storage upload failed:', uploadError)
      return { success: false, error: uploadError.message }
    }

    console.log('[uploadAttachment] inserting metadata', {
      request_id: requestId,
      original_filename: file.name,
      filename: storedFileName,
      file_path: storagePath,
      file_size: file.size,
      mime_type: file.type || 'application/octet-stream',
      version_number: newVersion,
      uploaded_by: user.id,
    })

    const { error: insertError } = await supabase
      .from('request_attachments')
      .insert({
        request_id: requestId,
        original_filename: file.name,
        filename: storedFileName,
        file_path: storagePath,
        file_size: file.size,
        mime_type: file.type || 'application/octet-stream',
        version_number: newVersion,
        uploaded_by: user.id,
        description: input.description ?? null,
      })

    const insertErrorDetail = insertError
      ? { message: insertError.message, details: insertError.details, hint: insertError.hint, code: insertError.code }
      : null

    // Try RPC fallback for ANY insert failure
    if (insertError) {
      console.warn('[uploadAttachment] Direct insert failed, trying server-side RPC fallback', insertErrorDetail)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: rpcData, error: rpcError } = await (supabase as any).rpc('rpc_test_insert', {
        p_request_id: requestId,
        p_user_id: user.id,
        p_file_name: file.name,
        p_file_path: storagePath,
        p_size: file.size,
        p_mime: file.type || 'application/octet-stream',
      })

      if (rpcError || !rpcData) {
        console.error('[uploadAttachment] Server-side RPC fallback failed:', rpcError)
        // Clean up storage file if DB insert failed
        await supabase.storage.from('request-attachments').remove([storagePath]).catch(() => {})
        return {
          success: false,
          error: insertErrorDetail?.message ?? rpcError?.message ?? 'Failed to save attachment metadata',
        }
      }

      revalidatePath('/')
      revalidatePath(`/requests/${requestId}`)
      revalidatePath(`/requests/${requestId}/audit`)
      return {
        success: true,
        error: null,
        message: `Attachment uploaded successfully (v${newVersion})`,
        version: newVersion,
      }
    }

    revalidatePath('/')
    revalidatePath(`/requests/${requestId}`)
    revalidatePath(`/requests/${requestId}/audit`)

    return {
      success: true,
      error: null,
      message: `Attachment uploaded successfully (v${newVersion})`,
      version: newVersion,
    }
  } catch (err) {
    console.error('[uploadAttachment] unexpected error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected upload error',
    }
  }
}

export async function uploadSitePhoto(input: UploadSitePhotoInput): Promise<{ success: boolean; error: string | null; message?: string; attachment?: Database['public']['Tables']['request_attachments']['Row'] }> {
  try {
    const supabase = await createClient()

    const { user, error: userError } = await getUserWithRetry(supabase, 2)
    if (userError || !user) {
      return { success: false, error: toErrorString(userError, 'Not authenticated') }
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, department, role, created_at, updated_at, is_active')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError || !profile) {
      return { success: false, error: toErrorString(profileError, 'Profile not found') }
    }

    const requestId = input.requestId
    const file = input.file
    const maxFileSize = 50 * 1024 * 1024

    if (file.size > maxFileSize) {
      return { success: false, error: `File size exceeds ${maxFileSize / 1024 / 1024}MB limit` }
    }

    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'Only image files are allowed for site photos' }
    }

    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9_\-.]+/g, '_')
    const storedFileName = `site_photo_${Date.now()}_${sanitizedFileName}`
    const storagePath = `${requestId}/${storedFileName}`

    const { error: uploadError } = await supabase.storage
      .from('request-attachments')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('[uploadSitePhoto] storage upload failed:', uploadError)
      return { success: false, error: uploadError.message }
    }

    const { data: inserted, error: insertError } = await supabase
      .from('request_attachments')
      .insert({
        request_id: requestId,
        original_filename: file.name,
        filename: storedFileName,
        file_path: storagePath,
        file_size: file.size,
        mime_type: file.type || 'image/jpeg',
        version_number: 1,
        uploaded_by: user.id,
        description: 'Site photo with GPS coordinates',
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
      })
      .select('*')
      .single()

    if (insertError || !inserted) {
      console.error('[uploadSitePhoto] metadata insert failed:', insertError)
      await supabase.storage.from('request-attachments').remove([storagePath]).catch(() => {})
      return { success: false, error: insertError?.message ?? 'Failed to save site photo metadata' }
    }

    revalidatePath('/')
    revalidatePath(`/requests/${requestId}`)
    revalidatePath(`/requests/${requestId}/audit`)

    return {
      success: true,
      error: null,
      message: 'Site photo uploaded successfully',
      attachment: inserted as Database['public']['Tables']['request_attachments']['Row'],
    }
  } catch (err) {
    console.error('[uploadSitePhoto] unexpected error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected upload error',
    }
  }
}

export async function deleteAttachment(attachmentId: string): Promise<{ success: boolean; error: string | null; message?: string }> {
  const supabase = await createClient()

  const { user, error: userError } = await getUserWithRetry(supabase, 2)
  if (userError || !user) {
    return { success: false, error: toErrorString(userError, 'Not authenticated') }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, full_name, department, role, created_at, updated_at, is_active')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || !profile) {
    return { success: false, error: toErrorString(profileError, 'Profile not found') }
  }

  const { data: attachment, error: fetchError } = await supabase
    .from('request_attachments')
    .select('file_path, uploaded_by, request_id')
    .eq('id', attachmentId)
    .single()

  if (fetchError || !attachment) {
    return { success: false, error: fetchError?.message ?? 'Attachment not found' }
  }

  const isAdmin = (profile as { role: string }).role === 'ADMIN'
  const isOwner = (attachment as { uploaded_by: string }).uploaded_by === user.id

  if (!isAdmin && !isOwner) {
    return { success: false, error: 'Only the uploader or an admin can delete this attachment' }
  }

  const { error: deleteStorageError } = await supabase.storage
    .from('request-attachments')
    .remove([(attachment as { file_path: string }).file_path])

  if (deleteStorageError) {
    console.warn('Storage delete warning:', deleteStorageError.message)
  }

  const { error: deleteRecordError } = await supabase
    .from('request_attachments')
    .delete()
    .eq('id', attachmentId)

  if (deleteRecordError) {
    return { success: false, error: deleteRecordError.message }
  }

  revalidatePath('/')
  revalidatePath(`/requests/${(attachment as { request_id: string }).request_id}`)
  revalidatePath(`/requests/${(attachment as { request_id: string }).request_id}/audit`)
  return { success: true, error: null, message: 'Attachment deleted successfully' }
}

export async function getAttachmentPreviewUrl(filePath: string, expiresInSeconds = 3600): Promise<{ success: boolean; error: string | null; url: string | null }> {
  const supabase = await createClient()

  const { user, error: userError } = await getUserWithRetry(supabase, 2)
  if (userError || !user) {
    return { success: false, error: toErrorString(userError, 'Not authenticated'), url: null }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, full_name, department, role, created_at, updated_at, is_active')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || !profile) {
    return { success: false, error: toErrorString(profileError, 'Profile not found'), url: null }
  }

  const { data, error } = await supabase.storage
    .from('request-attachments')
    .createSignedUrl(filePath, expiresInSeconds)

  if (error || !data) {
    return { success: false, error: error?.message ?? 'Failed to generate preview URL', url: null }
  }

  return { success: true, error: null, url: data.signedUrl }
}

export async function testAttachmentSystem() {
  try {
    const supabase = await createClient()

    const { user, error: userError } = await getUserWithRetry(supabase, 2)
    console.log('[testAttachmentSystem] getUser result:', { userId: user?.id, userError })

    if (userError || !user) {
      return { success: false, error: toErrorString(userError, 'Not authenticated') }
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, department, role, created_at, updated_at, is_active')
      .eq('id', user.id)
      .maybeSingle()

    console.log('[testAttachmentSystem] profile lookup:', { profileFound: Boolean(profile), profileError: profileError?.message })

    if (profileError || !profile) {
      return { success: false, error: toErrorString(profileError, 'Profile not found') }
    }

    console.log('[testAttachmentSystem] Testing Supabase connection...')
    console.log('[testAttachmentSystem] URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log('[testAttachmentSystem] Has anon key:', Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY))

    console.log('[testAttachmentSystem] Running SELECT count FROM request_attachments')
    const { data: selectData, error: selectError } = await supabase
      .from('request_attachments')
      .select('count', { count: 'exact', head: true })

    console.log('[testAttachmentSystem] SELECT count result:', {
      count: selectData ?? null,
      error: selectError?.message,
    })

    if (selectError) {
      return { success: false, error: `Table select failed: ${selectError.message}` }
    }

    console.log('[testAttachmentSystem] Running storage.list')
    const { error: bucketError } = await supabase.storage
      .from('request-attachments')
      .list('', { limit: 1 })

    console.log('[testAttachmentSystem] Storage list result:', { error: bucketError?.message })

    if (bucketError) {
      return { success: false, error: `Storage error: ${bucketError.message}` }
    }

    const testRequestId = (profile as { id: string }).id
    const testPayload = {
      request_id: testRequestId,
      original_filename: 'test-rls-check.txt',
      filename: 'test-rls-check.txt',
      file_path: `${testRequestId}/test-rls-check.txt`,
      file_size: 0,
      mime_type: 'text/plain',
      version_number: 1,
      uploaded_by: (profile as { id: string }).id,
      description: 'RLS test',
    }

    console.log('[testAttachmentSystem] Running INSERT probe', testPayload)

    const { data: insertData, error: insertError } = await supabase
      .from('request_attachments')
      .insert(testPayload)
      .select('id')
      .single()

    console.log('[testAttachmentSystem] INSERT probe result:', {
      id: (insertData as { id?: string } | null)?.id ?? null,
      error: insertError?.message,
    })

    if (insertError) {
      return {
        success: false,
        error: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code,
      }
    }

    console.log('[testAttachmentSystem] Insert succeeded, cleaning up')

    const { error: deleteError } = await supabase
      .from('request_attachments')
      .delete()
      .eq('id', (insertData as { id: string }).id)

    if (deleteError) {
      console.error('[testAttachmentSystem] cleanup delete failed:', deleteError)
    }

    return {
      success: true,
      message: 'Attachment system is working correctly',
      tableAccess: true,
      storageAccess: true,
      userId: user.id,
    }
  } catch (err) {
    console.error('[testAttachmentSystem] Unexpected error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected test error',
    }
  }
}
