// lib/generatePdf.ts
import { jsPDF } from 'jspdf'
import { REQUEST_STATUSES, STATUS_PDF_COLORS } from './constants'
import type { ChangeRequest } from '@/lib/supabase/client'

export interface Activity {
  serial_number: number
  activity: string
  unit: string | null
  contract_qty: number
  executed_qty: number
  reason: string | null
}

export interface RequestData {
  project_name: string
  project_number?: string | null
  initiator_name: string
  change_description?: string | null
  description?: string | null
  priority_level?: string | null
  status?: string | null
  created_at?: string | null
  updated_at?: string | null
  site_coordinates?: string | null
  route_impact?: string | null
  duct_sizes?: string | null
  material_cost_variation?: string | null
  route_deviations?: string | null
  estimated_downtime?: string | null
  technical_reason?: string | null
  target_segments?: string | null
  fixed_network_approver?: string | null
  wire_line_approver?: string | null
  engineering_approver?: string | null
}

function drawWrappedText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const lines = doc.splitTextToSize(text || '—', maxWidth)
  doc.text(lines, x, y)
  return y + lines.length * lineHeight
}

export async function generatePdf(request: RequestData, activities: Activity[]) {
  const autoTable = (await import('jspdf-autotable')).default
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 14
    const contentWidth = pageWidth - margin * 2
    let currentY = 10

    // --- 1. LOGO + ETHIO TELECOM HEADER ---
    try {
      doc.addImage('/logo.png', 'PNG', margin, currentY, 40, 16)
    } catch (e) {
      console.warn('Logo not found for PDF:', e)
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(0, 0, 0)
    doc.text('ETHIOPIAN TELECOMMUNICATION', margin + 45, currentY + 6)
    doc.setFontSize(11)
    doc.text('Change Request Management System', margin + 45, currentY + 12)

    // Green accent bar
    doc.setFillColor(0, 171, 78)
    doc.rect(margin, currentY + 18, contentWidth, 3, 'F')
    currentY = currentY + 26

    // --- 2. PART 1: CHANGE REQUEST INFORMATION ---
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 80, 40)
    doc.text('PART 1: CHANGE REQUEST INFORMATION (FN PRO)', margin, currentY)
    currentY += 2
    doc.setDrawColor(0, 171, 78)
    doc.setLineWidth(0.6)
    doc.line(margin, currentY, pageWidth - margin, currentY)
    currentY += 4

    // Meta block
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('Change Description:', margin, currentY)
    doc.setFont('helvetica', 'normal')
    currentY = drawWrappedText(doc, request.change_description || request.description || '—', margin + 4, currentY + 4, contentWidth - 8, 4)
    currentY += 4

    const metaLeft = [
      ['Project Name:', request.project_name || '—'],
      ['Project Number:', request.project_number || '—'],
      ['Initiated By:', request.initiator_name || '—'],
      ['Date:', request.created_at ? new Date(request.created_at).toLocaleDateString() : '—'],
    ]

    const metaRight = [
      ['Priority Level:', request.priority_level || '—'],
      ['Status:', request.status || '—'],
      ['Reference No:', request.project_number || '—'],
      ['Last Updated:', request.updated_at ? new Date(request.updated_at).toLocaleString() : '—'],
    ]

    const leftColX = margin
    const rightColX = pageWidth / 2 + 10
    doc.setFontSize(9)

    metaLeft.forEach(([label, value], idx) => {
      const y = currentY + idx * 6
      doc.setFont('helvetica', 'bold')
      doc.text(label, leftColX, y)
      doc.setFont('helvetica', 'normal')
      doc.text(String(value), leftColX + 38, y)
    })

    metaRight.forEach(([label, value], idx) => {
      const y = currentY + idx * 6
      doc.setFont('helvetica', 'bold')
      doc.text(label, rightColX, y)
      doc.setFont('helvetica', 'normal')
      doc.text(String(value), rightColX + 38, y)
    })

    currentY += metaLeft.length * 6 + 4

    // Impact fields
    doc.setFont('helvetica', 'bold')
    doc.text('Impact on Deliverables:', margin, currentY)
    doc.setFont('helvetica', 'normal')
    currentY = drawWrappedText(doc, request.target_segments || '—', margin + 4, currentY + 4, contentWidth - 8, 4)
    currentY += 4

    doc.setFont('helvetica', 'bold')
    doc.text('Priority Level:', margin, currentY)
    doc.setFont('helvetica', 'normal')
    doc.text(request.priority_level || '—', margin + 38, currentY)
    currentY += 6

    doc.setFont('helvetica', 'bold')
    doc.text('Impact of Not Responding:', margin, currentY)
    doc.setFont('helvetica', 'normal')
    currentY = drawWrappedText(doc, request.technical_reason || '—', margin + 4, currentY + 4, contentWidth - 8, 4)
    currentY += 4

    // --- 3. ACTIVITIES TABLE ---
    if (currentY > 220) {
      doc.addPage()
      currentY = margin
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(0, 80, 40)
    doc.text('Main Activities', margin, currentY)
    currentY += 3

    const tableHeaders = [['S/No', 'Main Activity', 'Unit', 'Contract Quantity', 'Executed Quantity', 'Difference', 'Reason']]
    const tableRows = activities.map((act, index) => {
      const contractQty = Number(act.contract_qty) || 0
      const executedQty = Number(act.executed_qty) || 0
      const diff = contractQty - executedQty
      return [
        String(index + 1),
        act.activity || '—',
        act.unit || '—',
        contractQty.toLocaleString(),
        executedQty.toLocaleString(),
        diff.toLocaleString(),
        act.reason || '—',
      ]
    })

    autoTable(doc, {
      startY: currentY,
      head: tableHeaders,
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: [0, 171, 78],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
        fontSize: 9,
      },
      styles: {
        font: 'helvetica',
        fontSize: 8,
        textColor: [30, 30, 30],
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 14 },
        1: { halign: 'left', cellWidth: 45 },
        2: { halign: 'center', cellWidth: 18 },
        3: { halign: 'right', cellWidth: 28 },
        4: { halign: 'right', cellWidth: 28 },
        5: { halign: 'right', cellWidth: 28 },
        6: { halign: 'left', cellWidth: 45 },
      },
      margin: { left: margin, right: margin },
    } as any)

    currentY = (doc as any).lastAutoTable.finalY + 8

    // --- 4. SIGNATURES: CONFIRMED / APPROVED ---
    if (currentY > 230) {
      doc.addPage()
      currentY = margin
    }

    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.3)
    doc.line(margin, currentY, pageWidth - margin, currentY)
    currentY += 4

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('Request Confirmed / Approved By', margin, currentY)
    currentY += 6

    const approvers = [
      { label: 'Initiator / Requester', name: request.initiator_name || '—' },
      { label: 'Fixed Network Approver', name: request.fixed_network_approver || '—' },
      { label: 'Wire Line Planning Approver', name: request.wire_line_approver || '—' },
      { label: 'Engineering Approver', name: request.engineering_approver || '—' },
    ]

    approvers.forEach((approver, idx) => {
      const rowY = currentY + idx * 14
      doc.setDrawColor(180, 180, 180)
      doc.setLineWidth(0.2)
      doc.line(margin, rowY + 10, margin + 70, rowY + 10)
      doc.line(pageWidth - margin - 70, rowY + 10, pageWidth - margin, rowY + 10)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(100, 100, 100)
      doc.text(approver.label, margin, rowY + 2)
      doc.text('Signature', margin, rowY + 8)
      doc.text('Date', pageWidth - margin - 70, rowY + 2)
      doc.text('________', pageWidth - margin - 50, rowY + 8)

      doc.setTextColor(0, 0, 0)
      doc.setFont('helvetica', 'normal')
      doc.text(approver.name, margin + 4, rowY + 8)
    })

    currentY += approvers.length * 14 + 6

    // --- 5. PART 2: CHANGE REQUEST ANALYSIS & DECISION ---
    if (currentY > 220) {
      doc.addPage()
      currentY = margin
    }

    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 80, 40)
    doc.text('PART 2: CHANGE REQUEST ANALYSIS & DECISION', margin, currentY)
    currentY += 2
    doc.setDrawColor(0, 171, 78)
    doc.setLineWidth(0.6)
    doc.line(margin, currentY, pageWidth - margin, currentY)
    currentY += 6

    doc.setTextColor(0, 0, 0)
    doc.setFontSize(10)

    const analysisFields = [
      { label: 'Task / Scope Affected', value: request.description || '—' },
      { label: 'Cost / Risk / Quality Evaluation', value: request.material_cost_variation || '—' },
      { label: 'Alternative Recommendation', value: request.route_deviations || '—' },
    ]

    analysisFields.forEach((field) => {
      doc.setFont('helvetica', 'bold')
      doc.text(`${field.label}:`, margin, currentY)
      currentY += 4
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      currentY = drawWrappedText(doc, field.value, margin + 4, currentY, contentWidth - 8, 4)
      currentY += 4
      doc.setFontSize(10)
    })

    // Final Approval Section
    if (currentY > 220) {
      doc.addPage()
      currentY = margin
    }

    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.3)
    doc.line(margin, currentY, pageWidth - margin, currentY)
    currentY += 6

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('Final Approval', margin, currentY)
    currentY += 6

    const finalApprovers = [
      { label: 'Planner', name: request.fixed_network_approver || '—' },
      { label: 'Supervisor', name: request.wire_line_approver || '—' },
      { label: 'Manager', name: request.engineering_approver || '—' },
    ]

    finalApprovers.forEach((approver, idx) => {
      const rowY = currentY + idx * 16
      doc.setDrawColor(180, 180, 180)
      doc.setLineWidth(0.2)
      doc.line(margin, rowY + 12, margin + 70, rowY + 12)
      doc.line(pageWidth - margin - 70, rowY + 12, pageWidth - margin, rowY + 12)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(100, 100, 100)
      doc.text(`${approver.label}:`, margin, rowY + 2)
      doc.text('Name:', margin, rowY + 6)
      doc.text('Signature:', margin, rowY + 10)
      doc.text('Date:', pageWidth - margin - 70, rowY + 2)
      doc.text('________', pageWidth - margin - 50, rowY + 6)

      doc.setTextColor(0, 0, 0)
      doc.setFont('helvetica', 'normal')
      doc.text(approver.name, margin + 16, rowY + 6)
    })

    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 15
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8)
    doc.setTextColor(120, 120, 120)
    doc.text('Generated by Ethiopian Telecommunication CRMS', margin, footerY)
    doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth - margin, footerY, { align: 'right' })

    // Save
    const cleanName = (request.project_name || 'change_request').replace(/[^a-z0-9]/gi, '_').toLowerCase()
    doc.save(`change_request_${cleanName}.pdf`)
  } catch (err) {
    console.error('Error generating PDF document:', err)
  }
}
