// lib/generatePdf.ts
import { jsPDF } from 'jspdf'
import { REQUEST_STATUSES, STATUS_PDF_COLORS } from './constants'
import type { ChangeRequest } from '@/lib/supabase/client'

export interface Activity {
  serial_number: number;
  activity: string;
  unit: string | null;
  length: number | null;
  width: number | null;
  depth: number | null;
  contract_qty: number;
  executed_qty: number;
  reason: string | null;
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
  latitude?: number | null
  longitude?: number | null
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
  final_decision_by?: string | null
  final_decision_reason?: string | null
  work_order?: string | null
  change_number?: string | null
  change_type?: string | null
  site_photos?: { url: string; latitude?: number | null; longitude?: number | null }[]
  attachments?: { original_filename: string; file_size: number; mime_type: string; file_path: string; latitude?: number | null; longitude?: number | null }[]
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
    const pageHeight = doc.internal.pageSize.getHeight()
    const brandGreen = [0, 171, 78] as const
    let currentY = 8

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(0, 0, 0)

    // --- 1. LOGO + HEADER ---
    try {
      doc.addImage('/logo.png', 'PNG', margin, currentY, 40, 16)
    } catch (e) {
      console.warn('Logo not found for PDF:', e)
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(0, 0, 0)
    doc.text('ETHIOPIAN TELECOMMUNICATION', margin + 45, currentY + 6)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.text('Change Request Management System', margin + 45, currentY + 12)

    doc.setFillColor(...brandGreen)
    doc.rect(margin, currentY + 18, contentWidth, 3, 'F')
    currentY += 26

    // --- 3. PART 1: CHANGE REQUEST INFORMATION ---
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(...brandGreen)
    doc.text('PART 1: CHANGE REQUEST INFORMATION', margin, currentY)
    currentY += 2
    doc.setDrawColor(...brandGreen)
    doc.setLineWidth(0.5)
    doc.line(margin, currentY, pageWidth - margin, currentY)
    currentY += 3

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...brandGreen)
    doc.text('Change Description', margin, currentY)
    currentY += 3

    // Submission date
    const submissionDate = request.created_at
      ? new Date(request.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : ''

    // --- Top info rows ---
    const leftColX = margin + 2
    const rightColX = pageWidth / 2 + 6
    const labelW = 36
    const rowH = 5

    // Row 1
    const row1Y = currentY
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text('Project Name:', leftColX, row1Y)
    doc.setFont('helvetica', 'normal')
    doc.text(request.project_name || '—', leftColX + labelW, row1Y)
    doc.setFont('helvetica', 'bold')
    doc.text('Change Name:', rightColX, row1Y)
    doc.setFont('helvetica', 'normal')
    doc.text(request.change_type || '—', rightColX + labelW, row1Y)

    // Row 2
    const row2Y = currentY + rowH
    doc.setFont('helvetica', 'bold')
    doc.text('Project No:', leftColX, row2Y)
    doc.setFont('helvetica', 'normal')
    doc.text(request.project_number || '—', leftColX + labelW, row2Y)
    doc.setFont('helvetica', 'bold')
    doc.text('Change Number:', rightColX, row2Y)
    doc.setFont('helvetica', 'normal')
    const cnShort = request.change_number || '—'
    doc.text(cnShort, rightColX + labelW, row2Y)

    // Row 3: Initiated by with Sig/Date inline
    const row3Y = currentY + rowH * 2
    doc.setFont('helvetica', 'bold')
    doc.text('Initiated by:', leftColX, row3Y)
    doc.setFont('helvetica', 'normal')
    doc.text(request.initiator_name || '—', leftColX + labelW, row3Y)

    const initSigLabelX = leftColX + labelW + 60
    const initSigLabelW = 10
    const initSigEndX = initSigLabelX + initSigLabelW + 22
    const initSigY = row3Y
    const initDateLabelX = initSigEndX + 4
    const initDateLabelW = 12
    const initDateEndX = initDateLabelX + initDateLabelW + 22
    const initDateY = row3Y

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text('Sig:', initSigLabelX, initSigY)
    doc.text('Date:', initDateLabelX, initDateY)

    doc.setDrawColor(180, 180, 180)
    doc.setLineWidth(0.3)
    doc.line(initSigLabelX + initSigLabelW, initSigY, initSigEndX, initSigY)
    doc.line(initDateLabelX + initDateLabelW, initDateY, initDateEndX, initDateY)

    if (submissionDate) {
      const dateW = doc.getTextWidth(submissionDate)
      doc.text(submissionDate, Math.max(initDateLabelX + initDateLabelW + 1, initDateEndX - dateW - 1), initDateY)
    }

    currentY += rowH * 3 + 2

    // Row 4: WO | Type | Status
    const row4Y = currentY
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    const metaSmallLabelW = 26
    const smallRow1X = leftColX
    const smallRow2X = pageWidth / 2 + 2

    doc.text('WO:', smallRow1X, row4Y)
    doc.setFont('helvetica', 'normal')
    doc.text(request.work_order || '—', smallRow1X + metaSmallLabelW, row4Y)

    doc.setFont('helvetica', 'bold')
    doc.text('Type:', smallRow2X, row4Y)
    doc.setFont('helvetica', 'normal')
    doc.text(request.change_type || '—', smallRow2X + metaSmallLabelW, row4Y)

    doc.setFont('helvetica', 'bold')
    doc.text('Status:', smallRow1X, row4Y + rowH)
    doc.setFont('helvetica', 'normal')
    doc.text(request.status ? request.status.replace(/_/g, ' ') : '—', smallRow1X + metaSmallLabelW, row4Y + rowH)

    currentY += rowH * 2 + 2

    // Change Description — inline
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(0, 0, 0)
    doc.text('Change Description:', margin, currentY + 3)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    const descLabelW = doc.getTextWidth('Change Description:') + 4
    const descVal = request.change_description || request.description || '—'
    const descLines = doc.splitTextToSize(descVal, contentWidth - descLabelW - 4)
    const descBoxH = Math.max(8, descLines.length * 4 + 2)
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.1)
    doc.rect(margin, currentY, contentWidth, descBoxH)
    doc.text(descLines.slice(0, 2), margin + 2 + descLabelW, currentY + 4)
    currentY += descBoxH + 2

    currentY += 2

    // --- 4. MAIN ACTIVITIES TABLE ---
    if (currentY > pageHeight - 80) {
      doc.addPage()
      currentY = margin
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...brandGreen)
    doc.text('Main Activities', margin, currentY)
    currentY += 4

    const tableHeaders = [['S/No', 'Main Activity', 'Unit', 'L(m)', 'W(m)', 'D(m)', 'Contract Qty', 'Executed Qty', 'Difference', 'Reason']]
    const tableRows = activities.map((act, index) => {
      const contractQty = Number(act.contract_qty) || 0
      const executedQty = Number(act.executed_qty) || 0
      const diff = contractQty - executedQty
      return [
        String(index + 1),
        act.activity || '—',
        act.unit || '—',
        act.length != null ? String(act.length) : '—',
        act.width != null ? String(act.width) : '—',
        act.depth != null ? String(act.depth) : '—',
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
        fillColor: [...brandGreen],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
        fontSize: 9,
      },
      styles: {
        font: 'helvetica',
        fontSize: 8,
        textColor: [30, 30, 30],
        cellPadding: 1.5,
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 9 },
        1: { halign: 'left', cellWidth: 28 },
        2: { halign: 'center', cellWidth: 14 },
        3: { halign: 'center', cellWidth: 14 },
        4: { halign: 'center', cellWidth: 14 },
        5: { halign: 'center', cellWidth: 14 },
        6: { halign: 'right', cellWidth: 22 },
        7: { halign: 'right', cellWidth: 22 },
        8: { halign: 'right', cellWidth: 22 },
        9: { halign: 'left', cellWidth: 28 },
      },
      margin: { left: margin, right: margin },
    })

    currentY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4

    // --- 5. IMPACT FIELDS + SIGNATURES (PART 1) ---
    if (currentY > pageHeight - 100) {
      doc.addPage()
      currentY = margin
    }

    // Impact on deliverables — inline
    const impactLabel1 = 'Impact on deliverables:'
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(0, 0, 0)
    const impactLabel1W = doc.getTextWidth(impactLabel1) + 4
    doc.text(impactLabel1, margin + 2, currentY + 4)
    doc.setFont('helvetica', 'normal')
    const impactVal1 = request.target_segments || ''
    const impactVal1Lines = doc.splitTextToSize(impactVal1, contentWidth - impactLabel1W - 4)
    doc.text(impactVal1Lines.slice(0, 2), margin + 2 + impactLabel1W, currentY + 4)
    const box1H = Math.max(7, impactVal1Lines.length * 4 + 2)
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.1)
    doc.rect(margin, currentY, contentWidth, box1H)
    currentY += box1H + 2

    // Priority level — inline
    const priLabel = 'Priority level (circle one):'
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    const priLabelW = doc.getTextWidth(priLabel) + 4
    doc.text(priLabel, margin + 2, currentY + 4)
    doc.setFont('helvetica', 'normal')
    const priVal = request.priority_level || ''
    const priValLines = doc.splitTextToSize(`${priVal}    (1. High    2. Medium    3. Low)`, contentWidth - priLabelW - 4)
    doc.text(priValLines.slice(0, 1), margin + 2 + priLabelW, currentY + 4)
    doc.rect(margin, currentY, contentWidth, 7)
    currentY += 9

    // Impact of not responding — inline
    const impactLabel2 = 'Impact of not responding to the change:'
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    const impactLabel2W = doc.getTextWidth(impactLabel2) + 4
    doc.text(impactLabel2, margin + 2, currentY + 4)
    doc.setFont('helvetica', 'normal')
    const impactVal2 = request.technical_reason || ''
    const impactVal2Lines = doc.splitTextToSize(impactVal2, contentWidth - impactLabel2W - 4)
    doc.text(impactVal2Lines.slice(0, 2), margin + 2 + impactLabel2W, currentY + 4)
    const box2H = Math.max(7, impactVal2Lines.length * 4 + 2)
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.1)
    doc.rect(margin, currentY, contentWidth, box2H)
    currentY += box2H + 2

    // Part 1 signatures
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.3)
    doc.line(margin, currentY, pageWidth - margin, currentY)
    currentY += 4

    const sigBlocks = [
      { label: 'Request confirmed by', name: request.initiator_name || '', date: submissionDate },
      { label: 'Request approved by', name: request.engineering_approver || '', date: submissionDate },
    ]

    sigBlocks.forEach((block) => {
      const rowY = currentY

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(0, 0, 0)
      doc.text(`${block.label}:`, margin, rowY + 4)

      const nameUnderlineStartX = margin + 52
      const nameUnderlineEndX = nameUnderlineStartX + 50
      const nameUnderlineY = rowY + 4

      const sigLabelX = nameUnderlineEndX + 4
      const sigLabelW = 10
      const sigEndX = sigLabelX + sigLabelW + 22
      const sigY = rowY + 4

      const dateLabelX = sigEndX + 4
      const dateLabelW = 12
      const dateEndX = dateLabelX + dateLabelW + 22
      const dateY = rowY + 4

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.text('Sig:', sigLabelX, sigY)
      doc.text('Date:', dateLabelX, dateY)

      doc.setDrawColor(180, 180, 180)
      doc.setLineWidth(0.3)
      doc.line(nameUnderlineStartX, nameUnderlineY, nameUnderlineEndX, nameUnderlineY)
      doc.line(sigLabelX + sigLabelW, sigY, sigEndX, sigY)
      doc.line(dateLabelX + dateLabelW, dateY, dateEndX, dateY)

      if (block.name) {
        const nameW = doc.getTextWidth(block.name)
        doc.text(block.name, Math.max(nameUnderlineStartX + 1, nameUnderlineEndX - nameW - 1), nameUnderlineY)
      }
      if (block.date) {
        const dateW = doc.getTextWidth(block.date)
        doc.text(block.date, Math.max(dateLabelX + dateLabelW + 1, dateEndX - dateW - 1), dateY)
      }

      currentY += 9
    })

    currentY += 6

    // --- 6. PART 2: CHANGE REQUEST ANALYSIS & DECISION ---
    if (currentY > pageHeight - 60) {
      doc.addPage()
      currentY = margin
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...brandGreen)
    doc.text('PART 2: Change Request analysis & decision(WL planning and Eng.)', margin, currentY)
    currentY += 4

    // Change Analysis header
    doc.setFillColor(...brandGreen)
    doc.rect(margin, currentY, contentWidth, 6, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)
    doc.text('Change Analysis :', margin + 2, currentY + 4)
    currentY += 8

    // Analysis fields — inline
    const analysisFields = [
      { label: 'Task/scope affected:', value: request.description || '' },
      { label: 'cost evaluation:', value: request.material_cost_variation || '' },
      { label: 'Risk evaluation:', value: request.route_deviations || '' },
      { label: 'Quality evaluation:', value: request.estimated_downtime || '' },
      { label: 'Alternative recommendation (if not approved):', value: request.route_impact || '' },
    ]

    analysisFields.forEach((field) => {
      if (currentY > pageHeight - 30) {
        doc.addPage()
        currentY = margin
      }

      const labelText = `${field.label}`
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      const labelWidth = doc.getTextWidth(labelText) + 4
      const valueStartX = margin + 2 + labelWidth
      const valueMaxWidth = contentWidth - labelWidth - 4

      doc.setTextColor(0, 0, 0)
      doc.text(labelText, margin + 2, currentY + 4)

      if (field.value) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        const valLines = doc.splitTextToSize(field.value, valueMaxWidth)
        const neededLines = Math.min(valLines.length, 2)
        const boxHeight = neededLines === 1 ? 7 : 11
        doc.setDrawColor(0, 0, 0)
        doc.setLineWidth(0.1)
        doc.rect(margin, currentY, contentWidth, boxHeight)
        doc.text(valLines.slice(0, neededLines), valueStartX, currentY + 4)
        currentY += boxHeight + 1
      } else {
        doc.setDrawColor(0, 0, 0)
        doc.setLineWidth(0.1)
        doc.rect(margin, currentY, contentWidth, 7)
        currentY += 8
      }
    })

    currentY += 3

    // --- 7. APPROVAL SIGNATURES (PART 2) ---
    if (currentY > pageHeight - 40) {
      doc.addPage()
      currentY = margin
    }

    const approvalBlocks = [
      { label: 'Change Approved by Planner/civil site supervisor', name: request.wire_line_approver || '', date: submissionDate },
      { label: 'Change Approved by Supervisor', name: request.fixed_network_approver || '', date: submissionDate },
    ]

    approvalBlocks.forEach((block) => {
      const rowY = currentY

      doc.setDrawColor(0, 0, 0)
      doc.setLineWidth(0.1)
      doc.rect(margin, rowY, contentWidth, 9)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(0, 0, 0)
      doc.text(`${block.label}:`, margin + 2, rowY + 4)

      const nameUnderlineStartX = margin + contentWidth * 0.45
      const nameUnderlineEndX = nameUnderlineStartX + 38
      const nameUnderlineY = rowY + 4

      const sigLabelX = nameUnderlineEndX + 3
      const sigLabelW = 10
      const sigEndX = sigLabelX + sigLabelW + 16
      const sigY = rowY + 4

      const dateLabelX = sigEndX + 3
      const dateLabelW = 12
      const dateEndX = dateLabelX + dateLabelW + 16
      const dateY = rowY + 4

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.text('Sig:', sigLabelX, sigY)
      doc.text('Date:', dateLabelX, dateY)

      doc.setDrawColor(180, 180, 180)
      doc.setLineWidth(0.3)
      doc.line(nameUnderlineStartX, nameUnderlineY, nameUnderlineEndX, nameUnderlineY)
      doc.line(sigLabelX + sigLabelW, sigY, sigEndX, sigY)
      doc.line(dateLabelX + dateLabelW, dateY, dateEndX, dateY)

      if (block.name) {
        const nameW = doc.getTextWidth(block.name)
        doc.text(block.name, Math.max(nameUnderlineStartX + 1, nameUnderlineEndX - nameW - 1), nameUnderlineY)
      }
      if (block.date) {
        const dateW = doc.getTextWidth(block.date)
        doc.text(block.date, Math.max(dateLabelX + dateLabelW + 1, dateEndX - dateW - 1), dateY)
      }

      currentY += 10
    })

    // --- 8. PAGE 2: ATTACHMENTS & SITE PHOTOS ---
    doc.addPage()
    currentY = margin

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(...brandGreen)
    doc.text('ATTACHMENTS & SUPPORTING DOCUMENTS', margin, currentY)
    currentY += 3
    doc.setDrawColor(...brandGreen)
    doc.setLineWidth(0.5)
    doc.line(margin, currentY, pageWidth - margin, currentY)
    currentY += 4

    const attachments = request.attachments ?? []
    const nonImageAttachments = attachments.filter((a) => !a.mime_type.startsWith('image/'))
    const imageAttachments = attachments.filter((a) => a.mime_type.startsWith('image/'))

    if (nonImageAttachments.length === 0) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(120, 120, 120)
      doc.text('No regular attachments uploaded.', margin, currentY)
      currentY += 8
    } else {
      nonImageAttachments.forEach((file) => {
        if (currentY > pageHeight - 20) {
          doc.addPage()
          currentY = margin
        }

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.setTextColor(0, 0, 0)
        doc.text(file.original_filename, margin, currentY + 4)

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(80, 80, 80)
        const sizeText = `${(file.file_size / 1024).toFixed(1)} KB`
        doc.text(`${file.mime_type}    ${sizeText}`, margin + contentWidth - doc.getTextWidth(`${file.mime_type}    ${sizeText}`) - 2, currentY + 4)

        doc.setDrawColor(180, 180, 180)
        doc.setLineWidth(0.1)
        doc.rect(margin, currentY, contentWidth, 7)
        currentY += 9
      })
      currentY += 3
    }

    if (imageAttachments.length > 0) {
      if (currentY > pageHeight - 80) {
        doc.addPage()
        currentY = margin
      }

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(...brandGreen)
      doc.text('Site Photos', margin, currentY)
      currentY += 4

      const photoSize = 50
      const photosPerRow = Math.max(1, Math.floor(contentWidth / (photoSize + 4)))
      let rowY = currentY

      imageAttachments.forEach((photo, idx) => {
        const colIdx = idx % photosPerRow
        const rowIdx = Math.floor(idx / photosPerRow)
        const x = margin + colIdx * (photoSize + 4)
        const y = rowY + rowIdx * (photoSize + 14)
        const photoUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/request-attachments/${photo.file_path}`

        if (y + photoSize + 14 > pageHeight - 20) {
          doc.addPage()
          rowY = margin
          const newY = rowY
          imageAttachments.slice(idx).forEach((p, i2) => {
            const cIdx = i2 % photosPerRow
            const rIdx = Math.floor(i2 / photosPerRow)
            const px = margin + cIdx * (photoSize + 4)
            const py = newY + rIdx * (photoSize + 14)
            const pUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/request-attachments/${p.file_path}`
            try {
              doc.addImage(pUrl, 'JPEG', px, py, photoSize, photoSize)
            } catch {
              doc.setDrawColor(180, 180, 180)
              doc.setLineWidth(0.3)
              doc.rect(px, py, photoSize, photoSize)
              doc.setFont('helvetica', 'normal')
              doc.setFontSize(8)
              doc.setTextColor(120, 120, 120)
              doc.text('Photo unavailable', px + 4, py + photoSize / 2 + 2)
            }
            if (p.latitude != null && p.longitude != null) {
              doc.setFont('helvetica', 'normal')
              doc.setFontSize(7)
              doc.setTextColor(80, 80, 80)
              doc.text(`GPS: ${Number(p.latitude).toFixed(4)}, ${Number(p.longitude).toFixed(4)}`, px, py + photoSize + 3)
            }
          })
          currentY = rowY + Math.ceil(imageAttachments.length / photosPerRow) * (photoSize + 14) + 4
          return
        }

        try {
          doc.addImage(photoUrl, 'JPEG', x, y, photoSize, photoSize)
        } catch {
          doc.setDrawColor(180, 180, 180)
          doc.setLineWidth(0.3)
          doc.rect(x, y, photoSize, photoSize)
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(8)
          doc.setTextColor(120, 120, 120)
          doc.text('Photo unavailable', x + 4, y + photoSize / 2 + 2)
        }

        if (photo.latitude != null && photo.longitude != null) {
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(7)
          doc.setTextColor(80, 80, 80)
          doc.text(`GPS: ${Number(photo.latitude).toFixed(4)}, ${Number(photo.longitude).toFixed(4)}`, x, y + photoSize + 3)
        }
      })

      currentY = rowY + Math.ceil(imageAttachments.length / photosPerRow) * (photoSize + 14) + 4
    }

    // Footer
    const footerY = pageHeight - 12
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
