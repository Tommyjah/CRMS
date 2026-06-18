// lib/generatePdf.ts
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export interface RequestData {
  id: string
  project_name: string
  project_number: string
  initiated_by: string | null
  change_description: string
  priority_level: string
  status: string
  created_at: string
}

export interface Activity {
  activity: string
  unit: string
  contract_qty: number
  executed_qty: number
  reason: string
}

export async function generatePdf(request: RequestData, activities: Activity[]) {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 14

    // --- 1. LOGO IMAGE & HEADER TITLE ---
    // Make sure your logo image is saved as "logo.png" inside your project's /public folder
    // Arguments: imagePath, format, x, y, width, height
    try {
      doc.addImage('/logo.png', 'PNG', margin, 10, 38, 14)
    } catch (e) {
      console.warn("Logo image file not found in public/logo.png, skipping image render.", e)
    }

    // Right-align or offset the text next to the logo
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(22)
    doc.text('Change Request Form', 65, 20)

    // Divider rule right below header segment
    doc.setDrawColor(220, 225, 230)
    doc.setLineWidth(0.5)
    doc.line(margin, 28, pageWidth - margin, 28)

    // --- 2. METADATA METRIC GRID ---
    doc.setFontSize(10)
    
    // Left Column Info
    doc.setFont('helvetica', 'bold')
    doc.text('Project Name:', margin, 38)
    doc.setFont('helvetica', 'normal')
    doc.text(request.project_name || '—', margin + 26, 38)

    doc.setFont('helvetica', 'bold')
    doc.text('Reference No:', margin, 45)
    doc.setFont('helvetica', 'normal')
    doc.text(request.project_number || '—', margin + 26, 45)

    doc.setFont('helvetica', 'bold')
    doc.text('Initiated By:', margin, 52)
    doc.setFont('helvetica', 'normal')
    doc.text(request.initiated_by || '—', margin + 26, 52)

    // Right Column Info
    const rightColX = 120
    doc.setFont('helvetica', 'bold')
    doc.text('Priority Level:', rightColX, 38)
    doc.setFont('helvetica', 'normal')
    doc.text(request.priority_level || '—', rightColX + 26, 38)

    doc.setFont('helvetica', 'bold')
    doc.text('Status:', rightColX, 45)
    doc.setFont('helvetica', 'bold')
    
    // Status Context Colorizer
    if (request.status === 'APPROVED') doc.setTextColor(46, 125, 50)       
    else if (request.status === 'REJECTED') doc.setTextColor(198, 40, 40)   
    else doc.setTextColor(216, 133, 21)                                    
    
    doc.text(request.status || 'PENDING', rightColX + 26, 45)
    doc.setTextColor(0, 0, 0) // Reset back to clean black text color

    doc.setFont('helvetica', 'bold')
    doc.text('Date Created:', rightColX, 52)
    doc.setFont('helvetica', 'normal')
    const formattedDate = request.created_at ? new Date(request.created_at).toLocaleDateString() : new Date().toLocaleDateString()
    doc.text(formattedDate, rightColX + 26, 52)

    // --- 3. CHANGE DESCRIPTION / JUSTIFICATION BOX ---
    let currentY = 60
    const descriptionText = request.change_description

    if (descriptionText && descriptionText.trim() !== '') {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text('Change Description / Justification:', margin, currentY)
      
      doc.setFillColor(248, 249, 250)
      doc.setDrawColor(233, 236, 239)
      
      const splitDescription = doc.splitTextToSize(descriptionText, pageWidth - (margin * 2) - 6)
      const boxHeight = (splitDescription.length * 5) + 6
      
      doc.rect(margin, currentY + 2, pageWidth - (margin * 2), boxHeight, 'DF')
      
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9.5)
      doc.text(splitDescription, margin + 3, currentY + 7)
      
      currentY += boxHeight + 10
    } else {
      currentY += 5
    }

    // --- 4. ACTIVITIES DATA TABLE ---
    const tableHeaders = [['S/No', 'Activity', 'Unit', 'Contract Qty', 'Executed Qty', 'Difference', 'Reason']]
    
    const tableRows = activities.map((act, index) => {
      const diff = act.contract_qty - act.executed_qty
      return [
        index + 1, 
        act.activity || '—',
        act.unit || '—',
        act.contract_qty.toLocaleString(),
        act.executed_qty.toLocaleString(),
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
        fillColor: [0, 102, 204], 
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
      },
      // Adjusted column widths to prevent the "Difference" column from sliding out
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 }, // S/No
        1: { halign: 'left' },                  // Activity (Flexible Auto-width)
        2: { halign: 'center', cellWidth: 16 }, // Unit
        3: { halign: 'right', cellWidth: 22 },  // Contract Qty
        4: { halign: 'right', cellWidth: 22 },  // Executed Qty
        5: { halign: 'right', cellWidth: 22 },  // Difference
        6: { halign: 'left' },                  // Reason (Flexible Auto-width)
      },
      styles: {
        font: 'helvetica',
        fontSize: 9,
      },
      didDrawPage: () => {
        // --- 5. FOOTER SIGNATURE MARKS ---
        const footerY = doc.internal.pageSize.getHeight() - 25
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        doc.text('Prepared By: ___________________________', margin, footerY)
        doc.text('Approved By: ___________________________', rightColX, footerY)
      }
    } as any)

    // Save final document download trigger
    const cleanName = (request.project_name || 'report').replace(/[^a-z0-9]/gi, '_').toLowerCase()
    doc.save(`change_request_${cleanName}.pdf`)

  } catch (err) {
    console.error("Error generating polished PDF document: ", err)
  }
}