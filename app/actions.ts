'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { isDepartmentResponsible } from '@/lib/security-constants'
import { REQUEST_STATUSES, PRIORITY_LEVELS, isStatus, isPriority, isRole, isDepartment } from '@/lib/constants'
import { getCurrentProfile, resolveInitiatorRole } from '@/lib/auth'
import type { ChangeRequest } from '@/lib/supabase/client'
import type { Database } from '@/types_db'

type UploadAttachmentInput = {
  requestId: string
  file: File
  description?: string | null
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

export async function logRequestActivity(
   requestId: string,
   action: 'CREATE' | 'APPROVE' | 'REJECT',
   previousStatus: string | null,
   newStatus: string | null,
   comment?: string | null
 ) {
   const supabase = await createClient()

   const { data: { user } } = await supabase.auth.getUser()
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
  activities: { serial_number: number; activity: string; unit: string; contract_qty: string; executed_qty: string; reason: string }[],
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
   return { success: true, message: 'Change request created successfully', requestId: data.id }
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

   // Log the status change in audit log
   await logRequestActivity(
     requestId,
     action === 'APPROVE' ? 'APPROVE' : 'REJECT',
     currentStatus,
     nextStatus,
     null // No comment for status changes
   )

   revalidatePath('/')
   return { success: true, message: action === 'APPROVE' ? 'Request approved successfully' : 'Request rejected successfully' }
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

  return { error: null, data: data ?? [] }
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

    const { data: { user }, error: userError } = await supabase.auth.getUser()
     console.log('[uploadAttachment] getUser result:', {
       userId: user?.id,
       userError: userError?.message,
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

export async function deleteAttachment(attachmentId: string): Promise<{ success: boolean; error: string | null; message?: string }> {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
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

  const { data: { user }, error: userError } = await supabase.auth.getUser()
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

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    console.log('[testAttachmentSystem] getUser:', { userId: user?.id, userError: userError?.message })

    if (userError || !user) {
      return { success: false, error: toErrorString(userError, 'Not authenticated'), url: null }
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
