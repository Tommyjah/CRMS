import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

Deno.serve(async (req: Request) => {
  const requestId = crypto.randomUUID()
  const start = performance.now()

  try {
    const payload = (await req.json()) as {
      type: 'INSERT' | 'UPDATE' | 'DELETE'
      schema: string
      table: string
      record: {
        id: string
        project_name: string
        initiator_name: string
        description: string | null
        status: string | null
        created_at: string | null
        updated_at: string | null
      }
      old_record: {
        id: string
        project_name: string
        initiator_name: string
        description: string | null
        status: string | null
        created_at: string | null
        updated_at: string | null
      } | null
    }

    if (payload.table !== 'change_requests') {
      return new Response(JSON.stringify({ error: 'Unsupported table' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    const { record, old_record, type } = payload

    if (type === 'UPDATE' && record.status && old_record?.status !== record.status) {
      const { error: logError } = await supabase
        .from('request_audit_log')
        .insert({
          request_id: record.id,
          changed_by: 'edge-automation',
          action: 'STATUS_CHANGE',
          previous_status: old_record.status,
          new_status: record.status,
          comment: `Automated status transition: ${old_record.status ?? 'null'} -> ${record.status}`,
        })

      if (logError) {
        console.error(`Audit log insert failed for request ${record.id}:`, logError)
      } else {
        console.log(`Audit logged for request ${record.id}`)
      }

      if (record.status === 'APPROVED') {
        console.log(`Request ${record.id} approved for project "${record.project_name}" by "${record.initiator_name}"`)
      } else if (record.status === 'REJECTED') {
        console.log(`Request ${record.id} rejected for project "${record.project_name}"`)
      }
    }

    const elapsed = performance.now() - start
    console.log(
      JSON.stringify({
        requestId,
        type,
        table: payload.table,
        requestIdDb: record.id,
        status: record.status,
        durationMs: Math.round(elapsed),
      })
    )

    return new Response(
      JSON.stringify({ success: true, requestId, durationMs: Math.round(elapsed) }),
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }
    )
  } catch (err) {
    const elapsed = performance.now() - start
    console.error(`Edge function failed after ${Math.round(elapsed)}ms:`, err)
    return new Response(
      JSON.stringify({
        success: false,
        requestId,
        error: err instanceof Error ? err.message : String(err),
      }),
      {
        status: 500,
        headers: { 'content-type': 'application/json' },
      }
    )
  }
})