import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable' // Default import style

// Explicitly inject the autotable plugin into the jsPDF prototype


// Add this interface
export interface RequestData {
  project_name: string;
  project_number: string;
  [key: string]: any; // Allows other fields without crashing
}

export interface Activity {
  activity: string;
  unit: string;
  contract_qty: number;
  executed_qty: number;
  reason: string;
}

export const generatePdf = async (request: RequestData, activities: Activity[]) => {
  const doc = new jsPDF();
  // ... (rest of your code stays exactly the same)
  // Ensure the autoTable remains as (doc as any).autoTable(...)

  // 1. ADD LOGO
  try {
    const response = await fetch('/logo.png'); 
    const blob = await response.blob();
    const reader = new FileReader();
    
    const logoData = await new Promise<string>((resolve) => {
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
    
    doc.addImage(logoData, 'PNG', 10, 10, 40, 20);
  } catch (err) {
    console.warn("Could not load logo, proceeding without it.", err);
  }

  // 2. HEADER INFO
  doc.setFontSize(18);
  doc.text('Change Request Form', 60, 20);
  
  doc.setFontSize(10);
  doc.text(`Project: ${request.project_name}`, 10, 40);
  doc.text(`Reference: ${request.project_number}`, 10, 45);
// 3. TABLE DATA (Excel-Style Layout)
autoTable(doc, { 
  startY: 60,
  head: [['S/No', 'Activity', 'Unit', 'Contract Qty', 'Executed Qty', 'Reason']],
  body: activities.map((item, index) => [
    index + 1, 
    item.activity, 
    item.unit, 
    item.contract_qty, 
    item.executed_qty, 
    item.reason
  ]),
  
  // Changes the look from "striped rows" to an Excel spreadsheet grid
  theme: 'grid', 
  
  // Global styles for all cells inside the table
  styles: {
    font: 'helvetica',
    fontSize: 10,
    cellPadding: 4,
    textColor: [33, 33, 33],       // Dark gray text
    lineColor: [200, 200, 200],     // Light gray gridlines (just like Excel)
    lineWidth: 0.5,
  },
  
  // Header Row Styling (Make it look like a styled Excel header block)
  headStyles: {
    fillColor: [0, 102, 204],       // Your exact blue brand color (RGB)
    textColor: [255, 255, 255],     // White text
    fontStyle: 'bold',
    halign: 'center',               // Center header text
  },
  
  // Column-specific layout rules (Widths and Text Alignment)
  columnStyles: {
    0: { cellWidth: 15, halign: 'center' }, // S/No: narrow and centered
    1: { cellWidth: 'auto', halign: 'left' },// Activity: stretches to fit text
    2: { cellWidth: 20, halign: 'center' }, // Unit: centered
    3: { cellWidth: 25, halign: 'right' },  // Contract Qty: Right-aligned number
    4: { cellWidth: 25, halign: 'right' },  // Executed Qty: Right-aligned number
    5: { cellWidth: 40, halign: 'left' },   // Reason: wider for comments
  },

  // Optional: Give alternating rows a very subtle Excel background tint
  alternateRowStyles: {
    fillColor: [247, 249, 250],
  },
});

// Adding text or summary calculations beneath the Excel grid
const finalY = (doc as any).lastAutoTable.finalY || 60;

doc.setFont('helvetica', 'bold');
doc.setFontSize(10);
doc.text('Prepared By: __________________', 14, finalY + 20);
doc.text('Approved By: __________________', 130, finalY + 20);

doc.save(`Change_Request_${request.project_number}.pdf`);
};