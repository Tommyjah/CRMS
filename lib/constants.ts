/**
 * CRMS Canonical Constants
 *
 * Single source of truth for all enum-like values used across the app.
 * Both client and server layers should import from here instead of hard-coding strings.
 */
import type { Database } from '@/types_db'

// Request lifecycle statuses
export const REQUEST_STATUSES = ['DRAFT','PENDING_DEPT_1','PENDING_DEPT_2','PENDING_DEPT_3','APPROVED','REJECTED'] as const
export type Status = (typeof REQUEST_STATUSES)[number]

// Departments in the approval pipeline (ordered by flow)
export const DEPARTMENTS = ['Initiator','Fixed Network','Wire Line Planning','Engineering'] as const
export type Department = (typeof DEPARTMENTS)[number]

// User roles
export const USER_ROLES = ['INITIATOR','REQUESTER','APPROVER','ADMIN'] as const
export type UserRole = (typeof USER_ROLES)[number]

// Priority levels
export const PRIORITY_LEVELS = ['Low','Medium','High','Critical'] as const
export type PriorityLevel = (typeof PRIORITY_LEVELS)[number]

// Derived lookup maps
export const STATUS_DEPARTMENT_MAP: Record<Status, string | null> = {
  DRAFT: null,
  PENDING_DEPT_1: 'Fixed Network',
  PENDING_DEPT_2: 'Wire Line Planning',
  PENDING_DEPT_3: 'Engineering',
  APPROVED: null,
  REJECTED: null,
}

export const STATUS_LABELS: Record<Status, string> = {
  DRAFT: 'Initiator',
  PENDING_DEPT_1: 'Fixed Network Review',
  PENDING_DEPT_2: 'Wire Line Planning Review',
  PENDING_DEPT_3: 'Engineering Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
}

// Runtime type guards
export function isStatus(value: unknown): value is Status {
  return typeof value === 'string' && (REQUEST_STATUSES as readonly string[]).includes(value)
}

export function isDepartment(value: unknown): value is Department {
  return typeof value === 'string' && (DEPARTMENTS as readonly string[]).includes(value)
}

export function isRole(value: unknown): value is UserRole {
  return typeof value === 'string' && (USER_ROLES as readonly string[]).includes(value)
}

export function isPriority(value: unknown): value is PriorityLevel {
  return typeof value === 'string' && (PRIORITY_LEVELS as readonly string[]).includes(value)
}

// Alias for backward compatibility
export const APPROVAL_DEPARTMENTS = DEPARTMENTS

// UI-friendly option arrays for dropdown filters
export const STATUS_OPTIONS: { value: Status | 'All'; label: string }[] = [
  { value: 'All', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Initiator' },
  { value: 'PENDING_DEPT_1', label: 'Fixed Network Review' },
  { value: 'PENDING_DEPT_2', label: 'Wire Line Planning Review' },
  { value: 'PENDING_DEPT_3', label: 'Engineering Review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
]

export const PRIORITY_OPTIONS: { value: PriorityLevel | 'All'; label: string }[] = [
  { value: 'All', label: 'All Priorities' },
  { value: 'Low', label: 'Low' },
  { value: 'Medium', label: 'Medium' },
  { value: 'High', label: 'High' },
  { value: 'Critical', label: 'Critical' },
]

// Status badge styling helpers (used by ChangeRequestRow)
export const STATUS_STYLES: Record<Status, string> = {
  DRAFT: 'bg-slate-100 text-slate-800 dark:bg-zinc-800/50 dark:text-zinc-300',
  PENDING_DEPT_1: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800/50',
  PENDING_DEPT_2: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800/50',
  PENDING_DEPT_3: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800/50',
  APPROVED: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800/50',
  REJECTED: 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-800/50',
}

export const STATUS_DOT_COLORS: Record<Status, string> = {
  DRAFT: 'bg-slate-400',
  PENDING_DEPT_1: 'bg-amber-500',
  PENDING_DEPT_2: 'bg-amber-500',
  PENDING_DEPT_3: 'bg-amber-500',
  APPROVED: 'bg-emerald-500',
  REJECTED: 'bg-rose-500',
}

// Timeline steps for DepartmentTimeline (used by ChangeRequestDrawer)
export const STAGE_STEPS = ['DRAFT', 'PENDING_DEPT_1', 'PENDING_DEPT_2', 'PENDING_DEPT_3', 'APPROVED'] as const

export const STAGE_LABELS: Record<string, string> = {
  DRAFT: 'Initiator',
  PENDING_DEPT_1: 'Fixed Network Review',
  PENDING_DEPT_2: 'Wire Line Planning Review',
  PENDING_DEPT_3: 'Engineering Review',
  APPROVED: 'Approved',
}

// Approver field lookup per stage
export const APPROVER_FIELD: Record<string, keyof Database['public']['Tables']['change_requests']['Row']> = {
  PENDING_DEPT_1: 'fixed_network_approver',
  PENDING_DEPT_2: 'wire_line_approver',
  PENDING_DEPT_3: 'engineering_approver',
}

// Activity unit options for dropdown
export const UNIT_OPTIONS = ['M³', 'Linear Meter', 'Pcs', 'Kg', 'Bag', 'Set', 'Pair', 'Liters', 'M²', 'Ton', 'Box', 'Roll', 'Each', 'Lot', 'm', 'mm'] as const
export type UnitOption = (typeof UNIT_OPTIONS)[number]

// PDF color coding (used by generatePdf)
export const STATUS_PDF_COLORS: Record<Status, [number, number, number]> = {
  DRAFT: [100, 116, 139],
  PENDING_DEPT_1: [216, 133, 21],
  PENDING_DEPT_2: [216, 133, 21],
  PENDING_DEPT_3: [216, 133, 21],
  APPROVED: [46, 125, 50],
  REJECTED: [198, 40, 40],
}

export function resolveInitiatorRole(department: string): 'INITIATOR' | 'REQUESTER' | 'APPROVER' {
  if (department === 'Fixed Network' || department === 'Wire Line Planning' || department === 'Engineering') return 'APPROVER'
  return 'REQUESTER'
}
