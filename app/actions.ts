'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createChangeRequest(formData: FormData, activities: { serial_number: number; activity: string; unit: string; contract_qty: string; executed_qty: string; reason: string }[]) {
  const supabase = await createClient()

  const payload = {
    project_name: String(formData.get('project_name') ?? ''),
    project_number: String(formData.get('project_number') ?? ''),
    initiator_name: String(formData.get('initiator_name') ?? ''),
    priority_level: String(formData.get('priority_level') ?? ''),
    change_description: String(formData.get('change_description') ?? ''),
  }

  const { data, error } = await supabase
    .from('change_requests')
    .insert(payload)
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
  revalidatePath('/profile')
  revalidatePath('/settings')

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

export async function updateRequestStatus(requestId: string, status: 'APPROVED' | 'REJECTED') {
  const supabase = await createClient()

  const { error } = await supabase
    .from('change_requests')
    .update({ status })
    .eq('id', requestId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/')
  revalidatePath('/profile')
  revalidatePath('/settings')

  return { success: true }
}
