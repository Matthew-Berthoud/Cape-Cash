import { Expense, Receipt, User } from "../types";
import { BLACK_CAPE_LOGO_SVG } from "../constants";

// We access the global jspdf object loaded via CDN
declare const jspdf: any;
declare const window: any;

const svgToPng = (svgString: string, width: number, height: number): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject('Canvas context missing');
                return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            URL.revokeObjectURL(url);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = (e) => {
            reject(e);
        };
        img.src = url;
    });
};

const pdfToPng = async (base64Pdf: string): Promise<string> => {
    // Configure PDF.js worker
    if (!window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    try {
        const pdfData = atob(base64Pdf.split(',')[1]);
        const loadingTask = window.pdfjsLib.getDocument({data: pdfData});
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1); // Render first page
        const viewport = page.getViewport({scale: 2.0}); // Good quality

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({canvasContext: context, viewport: viewport}).promise;
        return canvas.toDataURL('image/png');
    } catch (e) {
        console.error("PDF Rasterization failed", e);
        throw e;
    }
};

export const generatePDF = async (expenses: Expense[], receipts: Receipt[], user: User, returnBlobUrl: boolean = false) => {
  const doc = new jspdf.jsPDF();
  
  // -- Logo Generation --
  try {
      // Rasterize the SVG to a high-res PNG for the PDF
      const logoPng = await svgToPng(BLACK_CAPE_LOGO_SVG, 512, 512);
      
      // Top Left Corner
      const logoX = 14;
      const logoY = 10;
      const logoSize = 25; // Adjusted size for the actual logo aspect

      doc.addImage(logoPng, 'PNG', logoX, logoY, logoSize, logoSize);
  } catch (error) {
      console.error("Failed to load logo", error);
  }

  // -- Header --
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Title - Centered, Bold
  doc.setFontSize(22);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text("Expense Reimbursement", pageWidth / 2, 22, { align: "center" });

  // Employee Metadata - Left Aligned
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0); // Black Text

  const metaStartY = 45; // Moved down slightly to accommodate logo
  const lineHeight = 6;
  const labelX = 14;
  const valueX = 55;

  // Employee Name
  doc.setFont("helvetica", "bold");
  doc.text("Employee Name:", labelX, metaStartY);
  doc.setFont("helvetica", "normal");
  doc.text(user.name, valueX, metaStartY);

  // Supervisor Name
  doc.setFont("helvetica", "bold");
  doc.text("Supervisor Name:", labelX, metaStartY + lineHeight);
  doc.setFont("helvetica", "normal");
  doc.text(user.supervisor || "______________________", valueX, metaStartY + lineHeight);

  // Email
  doc.setFont("helvetica", "bold");
  doc.text("Email:", labelX, metaStartY + (lineHeight * 2));
  doc.setFont("helvetica", "normal");
  doc.text(user.email, valueX, metaStartY + (lineHeight * 2));

  // "Itemized Expenses" Header
  doc.setFontSize(11); // Same size as labels
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("Itemized Expenses", 14, 75);

  // -- Table --
  const tableColumn = ["Date", "Category", "Project", "Description", "Amount"];
  const tableRows: any[] = [];

  let totalAmount = 0;

  expenses.forEach(expense => {
    const expenseData = [
      expense.date,
      expense.category, // Full category name
      expense.project,
      expense.description,
      expense.amount.toFixed(2)
    ];
    tableRows.push(expenseData);
    totalAmount += expense.amount;
  });

  // Footer Row
  tableRows.push(["", "", "", "TOTAL", totalAmount.toFixed(2)]);

  // Generate Table
  doc.autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 80,
    // Header: Secondary Color Background, Black Text
    headStyles: { fillColor: [216, 210, 231], textColor: [0, 0, 0], halign: 'center', fontStyle: 'bold' }, 
    // Body: Black Text
    bodyStyles: { textColor: [0, 0, 0] },
    // Footer: Secondary Color Background, Black Text
    footStyles: { fillColor: [216, 210, 231], textColor: [0, 0, 0], fontStyle: 'bold' }, 
    columnStyles: {
        0: { cellWidth: 25 },
        4: { halign: 'right' }
    },
    theme: 'striped'
  });

  // -- Signatures --
  const margin = 14;
  const bottomMargin = 20;
  
  // Dimensions
  const signatureBoxHeight = 12; // Reduced height
  const labelHeight = 6;
  const sectionHeight = signatureBoxHeight + labelHeight;
  const gapBetweenSections = 5;
  
  // Total height needed for two signature blocks
  const totalSigHeight = (sectionHeight * 2) + gapBetweenSections;

  // Calculate Y Position: Align to bottom of page
  let sigStartY = pageHeight - bottomMargin - totalSigHeight;

  // Check if table overlaps with signature area
  if ((doc as any).lastAutoTable.finalY + 10 > sigStartY) {
      doc.addPage();
      // Reset to bottom of new page
      sigStartY = pageHeight - bottomMargin - totalSigHeight;
  }

  // Define Signature Drawing Function
  const drawSigSection = (startY: number, title: string, isEmployee: boolean) => {
      const dateWidth = 40;
      const sigWidth = pageWidth - (margin * 2) - dateWidth - 5; // 5 units gap
      
      const sigX = margin;
      const dateX = margin + sigWidth + 5;

      // 1. Boxes (White background, black border)
      doc.setDrawColor(0);
      doc.setLineWidth(0.2);
      doc.setFillColor(255, 255, 255);
      
      // Signature Box
      doc.rect(sigX, startY, sigWidth, signatureBoxHeight);
      // Date Box
      doc.rect(dateX, startY, dateWidth, signatureBoxHeight);

      // 2. Labels (Secondary background)
      doc.setFillColor(216, 210, 231); // Secondary Color
      const labelY = startY + signatureBoxHeight;
      
      // Signature Label Box
      doc.rect(sigX, labelY, sigWidth, labelHeight, 'F');
      doc.rect(sigX, labelY, sigWidth, labelHeight, 'S'); // Border
      
      // Date Label Box
      doc.rect(dateX, labelY, dateWidth, labelHeight, 'F');
      doc.rect(dateX, labelY, dateWidth, labelHeight, 'S'); // Border

      // 3. Label Text
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      
      // Center text vertically in label box
      const textY = labelY + 4;
      doc.text(title, sigX + 2, textY);
      doc.text("Date", dateX + 2, textY);

      // 4. Autofill Content
      if (isEmployee) {
          // Signature (Times Italic to look roughly cursive)
          doc.setFont("times", "italic");
          doc.setFontSize(16); // Reduced font size to fit smaller box
          // Center vertically in signature box (approx startY + 8)
          doc.text(user.name, sigX + 5, startY + 8);

          // Date
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          const today = new Date().toISOString().split('T')[0];
          doc.text(today, dateX + 5, startY + 8);
      }
  };

  drawSigSection(sigStartY, "Employee Signature", true);
  drawSigSection(sigStartY + sectionHeight + gapBetweenSections, "Supervisor Signature", false);


  // -- Receipts --
  // Add Receipts on subsequent pages
  for (const expense of expenses) {
    if (expense.linkedReceiptIds.length > 0) {
      for (const receiptId of expense.linkedReceiptIds) {
        const receipt = receipts.find(r => r.id === receiptId);
        if (receipt) {
            doc.addPage();
            
            try {
                let imgData = receipt.fileData; // base64 string
                let format = receipt.mimeType.includes('png') ? 'PNG' : 'JPEG';

                // Handle PDF receipts by converting first page to PNG
                if (receipt.mimeType === 'application/pdf') {
                    try {
                        imgData = await pdfToPng(receipt.fileData);
                        format = 'PNG';
                    } catch (pdfErr) {
                        doc.text("Error rendering PDF receipt. Please check attached file.", 14, 20);
                        continue;
                    }
                }
                
                // Get image properties to calculate aspect ratio
                const props = doc.getImageProperties(imgData);
                const imgWidth = props.width;
                const imgHeight = props.height;

                const margin = 0; // Full bleed
                const maxWidth = pageWidth - (margin * 2);
                const maxHeight = pageHeight - (margin * 2);

                // Calculate scale to fit page while maintaining aspect ratio
                const scale = Math.min(maxWidth / imgWidth, maxHeight / imgHeight);
                const finalW = imgWidth * scale;
                const finalH = imgHeight * scale;

                // Center image
                const x = (pageWidth - finalW) / 2;
                const y = (pageHeight - finalH) / 2;

                doc.addImage(imgData, format, x, y, finalW, finalH);

            } catch (e) {
                console.error("Error adding image to PDF", e);
                doc.text("Error loading image", 14, 20);
            }
        }
      }
    }
  }

  if (returnBlobUrl) {
    return doc.output('bloburl');
  } else {
    doc.save(`expense_report_${new Date().toISOString().split('T')[0]}.pdf`);
  }
};