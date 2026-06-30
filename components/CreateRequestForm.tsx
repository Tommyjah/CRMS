'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createChangeRequest } from '@/app/actions'
import { PRIORITY_LEVELS } from '@/lib/constants'

type ActivityRow = {
  id: string
  serialNumber: number
  activity: string
  unit: string
  contractQty: string
  executedQty: string
  reason: string
}

type TechnicalSpec = {
   site_coordinates: string
   route_impact: string
   duct_sizes: string
   material_cost_variation: string
   route_deviations: string
   estimated_downtime: string
   technical_reason: string
   target_segments: string
  }

type ApproverAssign = {
  fixed_network_approver: string
  wire_line_approver: string
  engineering_approver: string
}

type CreateRequestFormProps = {
  userProfile: {
    department: string | null
    role: string | null
    email?: string | null
  } | null
}

export default function CreateRequestForm({ userProfile }: CreateRequestFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activities, setActivities] = useState<ActivityRow[]>([
    {
      id: crypto.randomUUID(),
      serialNumber: 1,
      activity: '',
      unit: '',
      contractQty: '',
      executedQty: '',
      reason: '',
    },
  ])
const [technicalSpec, setTechnicalSpec] = useState<TechnicalSpec>({
    site_coordinates: '',
    route_impact: '',
    duct_sizes: '',
    material_cost_variation: '',
    route_deviations: '',
    estimated_downtime: '',
    technical_reason: '',
    target_segments: '',
  })
  const [approvers, setApprovers] = useState<ApproverAssign>({
    fixed_network_approver: '',
    wire_line_approver: '',
    engineering_approver: '',
  })

  const addActivityRow = () => {
    setActivities((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        serialNumber: prev.length + 1,
        activity: '',
        unit: '',
        contractQty: '',
        executedQty: '',
        reason: '',
      },
    ])
  }

  const removeActivityRow = (id: string) => {
    if (activities.length === 1) return
    const next = activities.filter((row) => row.id !== id)
    next.forEach((row, index) => (row.serialNumber = index + 1))
    setActivities(next)
  }

  const updateActivity = (id: string, patch: Partial<ActivityRow>) => {
    setActivities((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    )
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(event.currentTarget)

    const activityPayload = activities
      .filter((row) => row.activity.trim().length > 0)
      .map((row) => ({
        serial_number: row.serialNumber,
        activity: row.activity,
        unit: row.unit,
        contract_qty: row.contractQty,
        executed_qty: row.executedQty,
        reason: row.reason,
      }))

    const result = await createChangeRequest(formData, activityPayload, {
      ...technicalSpec,
      ...approvers,
    })

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-zinc-950" suppressHydrationWarning={true}>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-slate-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-50">Change Request</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400">
            Fill in the details below to initiate a new change request.
          </p>

          {error && (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:bg-rose-950/20 dark:text-rose-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            {/* General Information */}
            <div className="sm:col-span-2">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-100 mb-4">General Information</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="block text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Project Name</span>
                  <input
                    type="text"
                    name="project_name"
                    required
                    className="w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:focus:ring-teal-500/10 transition-all outline-none"
                  />
                </label>

                <label className="block">
                  <span className="block text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Project Number</span>
                  <input
                    type="text"
                    name="project_number"
                    required
                    className="w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:focus:ring-teal-500/10 transition-all outline-none"
                  />
                </label>

                <label className="block">
                  <span className="block text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Initiator</span>
                  <input
                    type="text"
                    name="initiator_name"
                    required
                    className="w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:focus:ring-teal-500/10 transition-all outline-none"
                  />
                </label>

                <label className="block">
                  <span className="block text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Priority Level</span>
                  <select
                    name="priority_level"
                    required
                    className="w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:focus:ring-teal-500/10 transition-all outline-none"
                  >
                    {PRIORITY_LEVELS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </label>

                <label className="block sm:col-span-2">
                  <span className="block text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Change Description</span>
                  <textarea
                    name="change_description"
                    rows={4}
                    required
                    className="w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:focus:ring-teal-500/10 transition-all outline-none"
                  />
                </label>
              </div>
            </div>

            {/* Location & Route Details */}
            <div className="sm:col-span-2">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-100 mb-4">Location & Route Details</h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block">
                  <span className="block text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Target Segments</span>
                  <input
                    type="text"
                    value={technicalSpec.target_segments}
                    onChange={(e) => setTechnicalSpec(prev => ({ ...prev, target_segments: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:focus:ring-teal-500/10 transition-all outline-none"
                    placeholder="e.g., Segment A to B"
                  />
                </label>

                <label className="block">
                  <span className="block text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Route Impact</span>
                  <input
                    type="text"
                    value={technicalSpec.route_impact}
                    onChange={(e) => setTechnicalSpec(prev => ({ ...prev, route_impact: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:focus:ring-teal-500/10 transition-all outline-none"
                    placeholder="Describe route impact"
                  />
                </label>

                <label className="block">
                  <span className="block text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Site Coordinates</span>
                  <input
                    type="text"
                    value={technicalSpec.site_coordinates}
                    onChange={(e) => setTechnicalSpec(prev => ({ ...prev, site_coordinates: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:focus:ring-teal-500/10 transition-all outline-none"
                    placeholder="e.g., 9.03, 38.74"
                  />
                </label>
              </div>
            </div>

            {/* Technical Infrastructure Specifications */}
            <div className="sm:col-span-2">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-100 mb-4">Technical Infrastructure Specifications</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="block text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Duct Sizes</span>
                  <input
                    type="text"
                    value={technicalSpec.duct_sizes}
                    onChange={(e) => setTechnicalSpec(prev => ({ ...prev, duct_sizes: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:focus:ring-teal-500/10 transition-all outline-none"
                    placeholder="Enter duct sizes"
                  />
                </label>

                <label className="block">
                  <span className="block text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Material Cost Variation</span>
                  <input
                    type="text"
                    value={technicalSpec.material_cost_variation}
                    onChange={(e) => setTechnicalSpec(prev => ({ ...prev, material_cost_variation: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:focus:ring-teal-500/10 transition-all outline-none"
                    placeholder="Estimated cost variation"
                  />
                </label>

                <label className="block">
                  <span className="block text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Route Deviations</span>
                  <input
                    type="text"
                    value={technicalSpec.route_deviations}
                    onChange={(e) => setTechnicalSpec(prev => ({ ...prev, route_deviations: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:focus:ring-teal-500/10 transition-all outline-none"
                    placeholder="Enter route deviations"
                  />
                </label>

                <label className="block">
                  <span className="block text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Estimated Downtime</span>
                  <input
                    type="text"
                    value={technicalSpec.estimated_downtime}
                    onChange={(e) => setTechnicalSpec(prev => ({ ...prev, estimated_downtime: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:focus:ring-teal-500/10 transition-all outline-none"
                    placeholder="Enter estimated downtime"
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="block text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Technical Engineering Reason / Justification</span>
                  <textarea
                    value={technicalSpec.technical_reason}
                    onChange={(e) => setTechnicalSpec(prev => ({ ...prev, technical_reason: e.target.value }))}
                    rows={3}
                    className="w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:focus:ring-teal-500/10 transition-all outline-none"
                    placeholder="Why is this change necessary?"
                  />
                </label>
              </div>
            </div>

            {/* Workflow Route Assignment */}
            <div className="sm:col-span-2">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-100 mb-4">Workflow Route Assignment</h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block">
                  <span className="block text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Fixed Network Approver</span>
                  <input
                    type="text"
                    value={approvers.fixed_network_approver}
                    onChange={(e) => setApprovers(prev => ({ ...prev, fixed_network_approver: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:focus:ring-teal-500/10 transition-all outline-none"
                    placeholder="Enter approver's name or email"
                  />
                </label>

                <label className="block">
                  <span className="block text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Wire Line Planning Approver</span>
                  <input
                    type="text"
                    value={approvers.wire_line_approver}
                    onChange={(e) => setApprovers(prev => ({ ...prev, wire_line_approver: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:focus:ring-teal-500/10 transition-all outline-none"
                    placeholder="Enter approver's name or email"
                  />
                </label>

                <label className="block">
                  <span className="block text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Engineering Approver</span>
                  <input
                    type="text"
                    value={approvers.engineering_approver}
                    onChange={(e) => setApprovers(prev => ({ ...prev, engineering_approver: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:focus:ring-teal-500/10 transition-all outline-none"
                    placeholder="Enter approver's name or email"
                  />
                </label>
              </div>
            </div>

            {/* Main Activities */}
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">Main Activities</h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
                    Add or remove activity rows for this change request.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addActivityRow}
                  className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
                >
                  Add Row
                </button>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200/80 dark:border-zinc-800/80">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200/80 dark:divide-zinc-800/80">
                    <thead className="bg-slate-50/50 dark:bg-zinc-800/30">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-zinc-400">S/No</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-zinc-400">Activity</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-zinc-400">Unit</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-zinc-400">Contract Qty</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-zinc-400">Executed Qty</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-zinc-400">Reason</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 dark:text-zinc-400">Action</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-200/50 dark:divide-zinc-800/50 bg-white dark:bg-zinc-900">
                      {activities.map((row) => (
                        <tr key={row.id}>
                          <td className="whitespace-nowrap px-3 py-2 text-sm text-slate-600 dark:text-zinc-300">
                            {row.serialNumber}
                          </td>

                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={row.activity}
                              onChange={(e) => updateActivity(row.id, { activity: e.target.value })}
                              className="w-full rounded-md border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 px-2 py-1 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 transition-all outline-none"
                            />
                          </td>

                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={row.unit}
                              onChange={(e) => updateActivity(row.id, { unit: e.target.value })}
                              className="w-full rounded-md border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 px-2 py-1 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 transition-all outline-none"
                            />
                          </td>

                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={row.contractQty}
                              onChange={(e) => updateActivity(row.id, { contractQty: e.target.value })}
                              className="w-full rounded-md border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 px-2 py-1 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 transition-all outline-none"
                            />
                          </td>

                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={row.executedQty}
                              onChange={(e) => updateActivity(row.id, { executedQty: e.target.value })}
                              className="w-full rounded-md border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 px-2 py-1 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 transition-all outline-none"
                            />
                          </td>

                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={row.reason}
                              onChange={(e) => updateActivity(row.id, { reason: e.target.value })}
                              className="w-full rounded-md border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 px-2 py-1 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 transition-all outline-none"
                            />
                          </td>

                          <td className="whitespace-nowrap px-3 py-2 text-right text-sm">
                            <button
                              type="button"
                              onClick={() => removeActivityRow(row.id)}
                              disabled={activities.length === 1}
                              className="text-rose-600 hover:text-rose-800 dark:text-rose-400 dark:hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200/50 dark:border-zinc-800 pt-6">
              <button
                type="button"
                onClick={() => router.back()}
                className="rounded-lg border border-slate-300 dark:border-zinc-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  !loading
                    ? 'bg-teal-600 text-white hover:bg-teal-700'
                    : 'bg-slate-100 text-slate-400 dark:bg-zinc-800/50 dark:text-zinc-500 cursor-not-allowed border border-slate-200/60 dark:border-zinc-700/50 hover:bg-slate-100'
                }`}
              >
                {loading ? 'Submitting...' : 'Submit Change Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}