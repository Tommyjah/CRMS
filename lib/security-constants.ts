/**
 * CRMS Security Constants - Status to Department Mappings
 * Used for both client UI checks and server-side authorization.
 * Canonical values are exported from @/lib/constants.
 */

import { DEPARTMENTS, USER_ROLES, PRIORITY_LEVELS, Status } from '@/lib/constants'

export type { Status } from '@/lib/constants'

export const STATUS_DEPARTMENT_MAP: Record<Status, string | null> = {
  DRAFT: null,
  PENDING_DEPT_1: 'Fixed Network',
  PENDING_DEPT_2: 'Wire Line Planning',
  PENDING_DEPT_3: 'Engineering',
  PENDING_INITIATOR_REVIEW: null,
  APPROVED: null,
  REJECTED: null,
}

export const STATUS_LABELS: Record<Status, string> = {
  DRAFT: 'Initiator',
  PENDING_DEPT_1: 'Fixed Network Review',
  PENDING_DEPT_2: 'Wire Line Planning Review',
  PENDING_DEPT_3: 'Engineering Review',
  PENDING_INITIATOR_REVIEW: 'Back to Initiator',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
}

export { APPROVAL_DEPARTMENTS } from '@/lib/constants'
export { DEPARTMENTS, USER_ROLES, PRIORITY_LEVELS }

export type ApprovalDepartment = (typeof DEPARTMENTS)[number]
export type UserRole = (typeof USER_ROLES)[number]
export type PriorityLevel = (typeof PRIORITY_LEVELS)[number]

export function getResponsibleDepartment(status: Status | null): string | null {
  if (!status) return null
  return STATUS_DEPARTMENT_MAP[status] ?? null
}

export function isDepartmentResponsible(currentStatus: Status | null, userDepartment: string | null): boolean {
  const responsible = getResponsibleDepartment(currentStatus)
  return responsible !== null && userDepartment === responsible
}

export function getStatusLabel(status: Status | null): string {
  if (!status) return 'Unknown'
  return STATUS_LABELS[status] ?? 'Unknown'
}
