'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createChangeRequest } from '@/app/actions'

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

export default function CreateRequestForm() {
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
    <div className="min-h-screen bg-gray-50" suppressHydrationWarning={true}>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">Change Request</h1>
          <p className="mt-2 text-sm text-gray-600">
            Fill in the details below to initiate a new change request.
          </p>

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="block text-sm font-medium text-gray-700">Project Name</span>
                <input
                  type="text"
                  name="project_name"
                  required
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </label>

              <label className="block">
                <span className="block text-sm font-medium text-gray-700">Project Number</span>
                <input
                  type="text"
                  name="project_number"
                  required
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </label>

              <label className="block">
                <span className="block text-sm font-medium text-gray-700">Initiator</span>
                <input
                  type="text"
                   name="initiator_name"
                  required
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </label>

              <label className="block">
                <span className="block text-sm font-medium text-gray-700">Priority Level</span>
                <select
                  name="priority_level"
                  required
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </label>

<label className="block sm:col-span-2">
                    <span className="block text-sm font-medium text-gray-700">Change Description</span>
                    <textarea
                      name="change_description"
                      rows={4}
                      required
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </label>

                  {/* Location & Route Details */}
                  <div className="sm:col-span-2">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Location & Route Details</h2>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <label className="block">
                        <span className="block text-sm font-medium text-gray-700">Target Segments</span>
                        <input
                          type="text"
                          value={technicalSpec.target_segments}
                          onChange={(e) => setTechnicalSpec(prev => ({ ...prev, target_segments: e.target.value }))}
                          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                          placeholder="e.g., Segment A to B"
                        />
                      </label>

                      <label className="block">
                        <span className="block text-sm font-medium text-gray-700">Route Impact</span>
                        <input
                          type="text"
                          value={technicalSpec.route_impact}
                          onChange={(e) => setTechnicalSpec(prev => ({ ...prev, route_impact: e.target.value }))}
                          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                          placeholder="Describe route impact"
                        />
                      </label>

                      <label className="block">
                        <span className="block text-sm font-medium text-gray-700">Site Coordinates</span>
                        <input
                          type="text"
                          value={technicalSpec.site_coordinates}
                          onChange={(e) => setTechnicalSpec(prev => ({ ...prev, site_coordinates: e.target.value }))}
                          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                          placeholder="e.g., 9.03, 38.74"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Technical Infrastructure Specifications */}
<div className="sm:col-span-2">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Technical Infrastructure Specifications</h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="block text-sm font-medium text-gray-700">Duct Sizes</span>
                        <input
                          type="text"
                          value={technicalSpec.duct_sizes}
                          onChange={(e) => setTechnicalSpec(prev => ({ ...prev, duct_sizes: e.target.value }))}
                          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                          placeholder="Enter duct sizes"
                        />
                      </label>

                  <label className="block">
                    <span className="block text-sm font-medium text-gray-700">Material Cost Variation</span>
                    <input
                      type="text"
                      value={technicalSpec.material_cost_variation}
                      onChange={(e) => setTechnicalSpec(prev => ({ ...prev, material_cost_variation: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      placeholder="Estimated cost variation"
                    />
                  </label>

                  <label className="block">
                    <span className="block text-sm font-medium text-gray-700">Route Deviations</span>
                    <input
                      type="text"
                      value={technicalSpec.route_deviations}
                      onChange={(e) => setTechnicalSpec(prev => ({ ...prev, route_deviations: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      placeholder="Enter route deviations"
                    />
                  </label>

                  <label className="block">
                    <span className="block text-sm font-medium text-gray-700">Estimated Downtime</span>
                    <input
                      type="text"
                      value={technicalSpec.estimated_downtime}
                      onChange={(e) => setTechnicalSpec(prev => ({ ...prev, estimated_downtime: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      placeholder="Enter estimated downtime"
                    />
                  </label>

                  <label className="block sm:col-span-2">
                    <span className="block text-sm font-medium text-gray-700">Technical Engineering Reason / Justification</span>
                    <textarea
                      value={technicalSpec.technical_reason}
                      onChange={(e) => setTechnicalSpec(prev => ({ ...prev, technical_reason: e.target.value }))}
                      rows={3}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      placeholder="Why is this change necessary?"
                    />
                  </label>
                </div>
              </div>

              {/* Workflow Route Assignment */}
              <div className="sm:col-span-2">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Workflow Route Assignment</h2>
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="block">
                    <span className="block text-sm font-medium text-gray-700">Fixed Network Approver</span>
                    <input
                      type="text"
                      value={approvers.fixed_network_approver}
                      onChange={(e) => setApprovers(prev => ({ ...prev, fixed_network_approver: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      placeholder="Enter approver's name or email"
                    />
                  </label>

                  <label className="block">
                    <span className="block text-sm font-medium text-gray-700">Wire Line Planning Approver</span>
                    <input
                      type="text"
                      value={approvers.wire_line_approver}
                      onChange={(e) => setApprovers(prev => ({ ...prev, wire_line_approver: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      placeholder="Enter approver's name or email"
                    />
                  </label>

                  <label className="block">
                    <span className="block text-sm font-medium text-gray-700">Engineering Approver</span>
                    <input
                      type="text"
                      value={approvers.engineering_approver}
                      onChange={(e) => setApprovers(prev => ({ ...prev, engineering_approver: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      placeholder="Enter approver's name or email"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Main Activities</h2>
                  <p className="mt-1 text-sm text-gray-600">
                    Add or remove activity rows for this change request.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addActivityRow}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Add Row
                </button>
              </div>

              <div className="overflow-hidden rounded-xl border border-gray-200">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">S/No</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Activity</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Unit</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Contract Qty</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Executed Qty</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Reason</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Action</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100 bg-white">
                      {activities.map((row) => (
                        <tr key={row.id}>
                          <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-700">
                            {row.serialNumber}
                          </td>

                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={row.activity}
                              onChange={(e) => updateActivity(row.id, { activity: e.target.value })}
                              className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                            />
                          </td>

                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={row.unit}
                              onChange={(e) => updateActivity(row.id, { unit: e.target.value })}
                              className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                            />
                          </td>

                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={row.contractQty}
                              onChange={(e) => updateActivity(row.id, { contractQty: e.target.value })}
                              className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                            />
                          </td>

                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={row.executedQty}
                              onChange={(e) => updateActivity(row.id, { executedQty: e.target.value })}
                              className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                            />
                          </td>

                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={row.reason}
                              onChange={(e) => updateActivity(row.id, { reason: e.target.value })}
                              className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                            />
                          </td>

                          <td className="whitespace-nowrap px-3 py-2 text-right text-sm">
                            <button
                              type="button"
                              onClick={() => removeActivityRow(row.id)}
                              disabled={activities.length === 1}
                              className="text-red-600 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-40"
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

            <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-6">
              <button
                type="button"
                onClick={() => router.back()}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
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
