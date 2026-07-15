'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createChangeRequest } from '@/app/actions'
import { PRIORITY_LEVELS, UNIT_OPTIONS } from '@/lib/constants'
import AttachmentUpload from './AttachmentUpload'
import SitePhotoCapture from './SitePhotoCapture'

type ActivityRow = {
  id: string
  serialNumber: number
  activity: string
  unit: string
  length: string
  width: string
  depth: string
  contractQty: string
  executedQty: string
  reason: string
}

type TechnicalSpec = {
   latitude: string
   longitude: string
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
  const uploadSectionRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [createdRequestId, setCreatedRequestId] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [activities, setActivities] = useState<ActivityRow[]>([
    {
      id: crypto.randomUUID(),
      serialNumber: 1,
      activity: '',
      unit: '',
      length: '',
      width: '',
      depth: '',
      contractQty: '',
      executedQty: '',
      reason: '',
    },
   ])
  const [technicalSpec, setTechnicalSpec] = useState<TechnicalSpec>({
    latitude: '',
    longitude: '',
    route_impact: '',
    duct_sizes: '',
    material_cost_variation: '',
    route_deviations: '',
    estimated_downtime: '',
    technical_reason: '',
    target_segments: '',
  })
  const [workOrder, setWorkOrder] = useState('')
  const [changeNumber, setChangeNumber] = useState('')
  const [changeType, setChangeType] = useState('')

  const CHANGE_TYPES = [
    'Route Change',
    'Scope Change',
    'Soil Type Change',
    'Damage Change',
    'Additional Work',
    'Rework',
    'Others',
  ]

  const [approvers, setApprovers] = useState<ApproverAssign>({
    fixed_network_approver: '',
    wire_line_approver: '',
    engineering_approver: '',
  })

  useEffect(() => {
    if (!submitted || !createdRequestId) return
    uploadSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [submitted, createdRequestId])

  const handleCoordinatesExtracted = useCallback(
    (coords: { latitude: number; longitude: number } | null) => {
      if (coords) {
        setTechnicalSpec((prev) => ({
          ...prev,
          latitude: String(coords.latitude),
          longitude: String(coords.longitude),
        }))
      }
    },
    []
  )

  const addActivityRow = () => {
    setActivities((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        serialNumber: prev.length + 1,
        activity: '',
        unit: '',
        length: '',
        width: '',
        depth: '',
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
    if (submitted || loading) return
    setLoading(true)
    setError(null)
    setSuccess(null)

    const formData = new FormData(event.currentTarget)

    const activityPayload = activities
      .filter((row) => row.activity.trim().length > 0)
      .map((row) => ({
        serial_number: row.serialNumber,
        activity: row.activity,
        unit: row.unit,
        length: row.length ? Number(row.length) : null,
        width: row.width ? Number(row.width) : null,
        depth: row.depth ? Number(row.depth) : null,
        contract_qty: row.contractQty,
        executed_qty: row.executedQty,
        reason: row.reason,
      }))

    const result = await createChangeRequest(formData, activityPayload, {
      ...technicalSpec,
      site_coordinates:
        technicalSpec.latitude && technicalSpec.longitude
          ? `${technicalSpec.latitude}, ${technicalSpec.longitude}`
          : technicalSpec.latitude || technicalSpec.longitude
            ? `${technicalSpec.latitude || ''}${technicalSpec.longitude ? `, ${technicalSpec.longitude}` : ''}`
            : undefined,
      ...approvers,
      work_order: workOrder,
      change_number: changeNumber,
      change_type: changeType,
    })

    if (result?.error) {
      setError(result.error)
      setLoading(false)
      setSubmitted(false)
      return
    }

    setSubmitted(true)
    if (result?.requestId) {
      setCreatedRequestId(result.requestId)
    }
    if (result?.changeNumber) {
      setChangeNumber(result.changeNumber)
    }
    const successMessage = result?.changeNumber
      ? `Change request ${result.changeNumber} created successfully`
      : 'Change request created successfully'
    setSuccess('Request created. Upload attachments and site photos here before leaving this page.')
    setToast(successMessage)
    setTimeout(() => setToast(null), 4000)
    setLoading(false)
  }

  const handleDone = () => {
    router.push('/')
  }

  const loadTestData = useCallback(() => {
    setTechnicalSpec({
      latitude: '9.0320',
      longitude: '38.7469',
      route_impact: 'Minor reroute along Bole-Finot corridor affecting 200m of existing HDD path',
      duct_sizes: '120mm HDPE, 90mm HDPE',
      material_cost_variation: '+12% due to HDPE price adjustment',
      route_deviations: '2 deviations around new commercial complex foundations',
      estimated_downtime: '4 hours',
      technical_reason: 'Required to accommodate new fiber route for business district expansion project phase 2',
      target_segments: 'Segment B-12 to B-15',
    })
    setWorkOrder('WO-2026-0891')
    setChangeNumber('')
    setChangeType('Route Change')
    setApprovers({
      fixed_network_approver: 'Abebe Bekele',
      wire_line_approver: 'Selamawit Tadesse',
      engineering_approver: 'Daniel Tesfaye',
    })

    const sampleActivities: ActivityRow[] = [
      {
        id: crypto.randomUUID(),
        serialNumber: 1,
        activity: 'Trenching and open-cut excavation',
        unit: 'Linear Meter',
        length: '150',
        width: '0.6',
        depth: '1.2',
        contractQty: '150',
        executedQty: '148',
        reason: 'Rock encountered at 1.0m depth, reduced execution by 2m',
      },
      {
        id: crypto.randomUUID(),
        serialNumber: 2,
        activity: 'HDPE duct installation',
        unit: 'Linear Meter',
        length: '120',
        width: '0',
        depth: '0',
        contractQty: '120',
        executedQty: '120',
        reason: 'Installed as per plan with 120mm HDPE duct',
      },
      {
        id: crypto.randomUUID(),
        serialNumber: 3,
        activity: 'Backfill and compaction',
        unit: 'm³',
        length: '0',
        width: '0.6',
        depth: '0.9',
        contractQty: '81',
        executedQty: '79',
        reason: 'Compaction test passed at 95% Proctor density',
      },
    ]
    setActivities(sampleActivities)
    setError(null)
    setSuccess(null)
  }, [])

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-zinc-950" suppressHydrationWarning={true}>
      {toast && (
        <div className="fixed bottom-4 right-4 z-[60] rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3 shadow-lg">
          <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">{toast}</p>
        </div>
      )}

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-slate-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-50">Change Request</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400">
            Fill in the details below to initiate a new change request.
          </p>

          {submitted && (
            <div
              ref={uploadSectionRef}
              className="mt-6 space-y-4 rounded-xl border-2 border-emerald-400 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 p-5"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                    {success || 'Change request created successfully.'}
                  </p>
                  <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
                    Stay on this page to finish uploads. Go to Dashboard only when you are done.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDone}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs font-medium text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
                >
                  Go to Dashboard
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </button>
              </div>

              {changeNumber && (
                <div className="rounded-lg border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-emerald-950/40 px-5 py-4 text-center shadow-sm">
                  <span className="text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                    Change Number
                  </span>
                  <p className="mt-1 font-mono text-3xl font-bold tracking-wide text-emerald-900 dark:text-emerald-100">
                    {changeNumber}
                  </p>
                </div>
              )}

              {createdRequestId && (
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-[#00ab4e]/40 dark:border-emerald-900/60 bg-white dark:bg-zinc-900 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="h-5 w-5 text-[#00ab4e] dark:text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-1.063-1.063a4.5 4.5 0 00-6.364 0l-1.063 1.063M18.375 12.739l-1.063 1.063a4.5 4.5 0 01-6.364 0l-1.063-1.063M18.375 12.739V5.25m0 0L15.375 2.25m3 0v3.75m-7.5 7.5h9.75m-9.75 0H5.25" />
                      </svg>
                      <h2 className="text-base font-semibold text-slate-900 dark:text-zinc-100">Attachments</h2>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mb-3">
                      Attach supporting documents for this request.
                    </p>
                    <AttachmentUpload key={`attachments-${createdRequestId}`} requestId={createdRequestId} />
                  </div>

                  <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-white dark:bg-zinc-900 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="h-5 w-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.25 2.25 0 018.25 4.5h7.5a2.25 2.25 0 012.423 1.175l1.823 2.727M6.827 6.175A2.25 2.25 0 015.25 8.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15M6.827 6.175l2.327 3.175M15 13.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <h2 className="text-base font-semibold text-slate-900 dark:text-zinc-100">Site Pictures</h2>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mb-3">
                      Capture or upload site photos with GPS when available.
                    </p>
                    <SitePhotoCapture
                      key={`site-photos-${createdRequestId}`}
                      requestId={createdRequestId}
                      onCoordinatesExtracted={handleCoordinatesExtracted}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:bg-rose-950/20 dark:text-rose-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            {!submitted && (
              <div className="flex items-center justify-between rounded-lg border border-slate-200/80 dark:border-zinc-800/80 bg-slate-50/40 dark:bg-zinc-800/20 px-4 py-3">
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Quick Testing</p>
                  <p className="text-[11px] text-slate-400 dark:text-zinc-500">Auto-fill the form with sample data</p>
                </div>
                <button
                  type="button"
                  onClick={loadTestData}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M5 14.5l-1.5 9h13.5L19 14.5m-13.5 0V7.5m13.5 0V7.5" />
                  </svg>
                  Load Test Data
                </button>
              </div>
            )}
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
                  <span className="block text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Project Number <span className="normal-case tracking-normal text-slate-400">(optional)</span></span>
                  <input
                    type="text"
                    name="project_number"
                    className="w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:focus:ring-teal-500/10 transition-all outline-none"
                    placeholder="Optional project reference number"
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

                <label className="block">
                  <span className="block text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Type of Change</span>
                  <select
                    name="change_type"
                    value={changeType}
                    onChange={(e) => setChangeType(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:focus:ring-teal-500/10 transition-all outline-none"
                  >
                    <option value="">Select type of change</option>
                    {CHANGE_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
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

                <label className="block sm:col-span-2">
                  <span className="block text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Work Order (WO)</span>
                  <input
                    type="text"
                    name="work_order"
                    value={workOrder}
                    onChange={(e) => setWorkOrder(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:focus:ring-teal-500/10 transition-all outline-none"
                    placeholder="Optional work order reference number"
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

                <label className="block sm:col-span-2">
                  <span className="block text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Site Coordinates</span>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="number"
                      step="any"
                      value={technicalSpec.latitude}
                      onChange={(e) => setTechnicalSpec(prev => ({ ...prev, latitude: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:focus:ring-teal-500/10 transition-all outline-none"
                      placeholder="Latitude (e.g., 9.03)"
                    />
                    <input
                      type="number"
                      step="any"
                      value={technicalSpec.longitude}
                      onChange={(e) => setTechnicalSpec(prev => ({ ...prev, longitude: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:focus:ring-teal-500/10 transition-all outline-none"
                      placeholder="Longitude (e.g., 38.74)"
                    />
                  </div>
                </label>

                {!submitted && (
                  <div className="sm:col-span-2">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/10">
                      <div className="flex items-center gap-2 mb-1">
                        <svg className="h-5 w-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.25 2.25 0 018.25 4.5h7.5a2.25 2.25 0 012.423 1.175l1.823 2.727M6.827 6.175A2.25 2.25 0 015.25 8.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15M6.827 6.175l2.327 3.175M6.827 6.175l2.327 3.175M15 13.5a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <h3 className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">Site Photo Capture</h3>
                        <span className="ml-auto rounded-full border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                          Available after submit
                        </span>
                      </div>
                      <p className="text-xs text-emerald-800 dark:text-emerald-300 mb-3">
                        After you submit, you can capture or upload site photos with GPS on this same page.
                      </p>
                      <SitePhotoCapture
                        requestId={undefined}
                        onCoordinatesExtracted={handleCoordinatesExtracted}
                      />
                    </div>
                  </div>
                )}
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
                  <span className="block text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Technical Engineering Reason / Remark</span>
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
                        <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 dark:text-zinc-400">L(m)</th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 dark:text-zinc-400">W(m)</th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 dark:text-zinc-400">D(m)</th>
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
                            <select
                              value={row.unit}
                              onChange={(e) => updateActivity(row.id, { unit: e.target.value })}
                              className="w-full rounded-md border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 px-2 py-1 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 transition-all outline-none"
                            >
                              <option value="">Select</option>
                              {UNIT_OPTIONS.map((u) => (
                                <option key={u} value={u}>{u}</option>
                              ))}
                            </select>
                          </td>

                           <td className="px-2 py-2">
                             <input
                               type="number"
                               min="0"
                               step="any"
                               value={row.length}
                               onChange={(e) => updateActivity(row.id, { length: e.target.value })}
                               className="w-14 rounded-md border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 px-1.5 py-1 text-xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 transition-all outline-none"
                               placeholder="0"
                             />
                           </td>

                           <td className="px-2 py-2">
                             <input
                               type="number"
                               min="0"
                               step="any"
                               value={row.width}
                               onChange={(e) => updateActivity(row.id, { width: e.target.value })}
                               className="w-14 rounded-md border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 px-1.5 py-1 text-xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 transition-all outline-none"
                               placeholder="0"
                             />
                           </td>

                           <td className="px-2 py-2">
                             <input
                               type="number"
                               min="0"
                               step="any"
                               value={row.depth}
                               onChange={(e) => updateActivity(row.id, { depth: e.target.value })}
                               className="w-14 rounded-md border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 px-1.5 py-1 text-xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 transition-all outline-none"
                               placeholder="0"
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

            {error && !submitted && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:bg-rose-950/20 dark:text-rose-400">
                {error}
              </div>
            )}

            {!submitted && (
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
            )}
          </form>
        </div>
      </div>
    </div>
  )
}