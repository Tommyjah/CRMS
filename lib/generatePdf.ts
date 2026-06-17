import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Define the structure of your data for better type safety
interface Activity {
  activity: string;
  unit: string;
  contract_qty: number;
  executed_qty: number;
  reason: string;
}

export const generatePdf = async (request: any, activities: Activity[]) => {
  const doc = new jsPDF();

  // 1. ADD LOGO
  // If the image is in your /public folder, fetch it to ensure valid format
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

  // 3. TABLE DATA
  const tableData = activities.map((item, index) => [
    index + 1,
    item.activity,
    item.unit,
    item.contract_qty,
    item.executed_qty,
    item.reason
  ]);

  // Use the explicit autoTable function
  autoTable(doc, { 
    startY: 60,
    head: [['S/No', 'Activity', 'Unit', 'Contract Qty', 'Executed Qty', 'Reason']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [41, 128, 185] },
  });

  // 4. SAVE
  doc.save(`Change_Request_${request.project_number}.pdf`);
};