import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ComplianceReportPayload } from '../types/federated';
import { buildCompliancePdfSections } from './federatedEngine';

type JsPdfWithAutoTable = jsPDF & {
  lastAutoTable?: {
    finalY: number;
  };
};

function ensureSectionSpace(doc: JsPdfWithAutoTable, requiredHeight: number, currentY: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (currentY + requiredHeight > pageHeight - 22) {
    doc.addPage();
    return 18;
  }
  return currentY;
}

export function generateCompliancePdfBlob(report: ComplianceReportPayload): {
  blob: Blob;
  filename: string;
  pageCount: number;
} {
  const data = buildCompliancePdfSections(report);
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  }) as JsPdfWithAutoTable;

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Deep Medical Teal regulatory header banner
  doc.setFillColor(15, 118, 110); // #0F766E
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('FEDMED SHIELD · REGULATORY AUDIT FILING', margin, 11.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(data.subtitle, margin, 17.5);

  doc.setFont('courier', 'bold');
  doc.setFontSize(8);
  doc.text(`REPORT ID: ${report.reportId}  |  SCHEMA v${report.schemaVersion}`, margin, 23.5);

  let cursorY = 34;

  // Filing Metadata Block
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('1. Filing Provenance & Cryptographic Verification', margin, cursorY);
  cursorY += 2.5;

  autoTable(doc, {
    startY: cursorY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      textColor: [30, 41, 59],
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 42 },
      1: { font: 'courier' },
    },
    body: data.metadataRows,
  });

  cursorY = (doc.lastAutoTable?.finalY ?? cursorY + 25) + 7;

  // Executive Consortium Summary Grid (4x2 cards)
  cursorY = ensureSectionSpace(doc, 38, cursorY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('2. Executive Consortium Summary', margin, cursorY);
  cursorY += 3;

  const cols = 4;
  const gap = 3;
  const cardW = (contentWidth - gap * (cols - 1)) / cols;
  const cardH = 14;

  data.summaryCards.forEach((card, index) => {
    const rowIdx = Math.floor(index / cols);
    const colIdx = index % cols;
    const x = margin + colIdx * (cardW + gap);
    const y = cursorY + rowIdx * (cardH + gap);

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(x, y, cardW, cardH, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(card.label, x + 2.5, y + 5);

    doc.setFont('courier', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 118, 110);
    doc.text(card.value, x + 2.5, y + 10.8);
  });

  cursorY += Math.ceil(data.summaryCards.length / cols) * (cardH + gap) + 5;

  let sectionNum = 3;

  // Section: Node Health & Privacy Posture
  if (data.nodePostureTable.included) {
    cursorY = ensureSectionSpace(doc, 30, cursorY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`${sectionNum}. Hospital Enclave Health & Privacy Budget Posture`, margin, cursorY);
    sectionNum += 1;
    cursorY += 4.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(data.nodePostureTable.thresholdsLabel, margin, cursorY);
    cursorY += 2.5;

    autoTable(doc, {
      startY: cursorY,
      margin: { left: margin, right: margin },
      head: [['Hospital Enclave', 'Region', 'Status', 'Local Acc', 'Privacy (Used / Cap)', 'Health']],
      body:
        data.nodePostureTable.rows.length > 0
          ? data.nodePostureTable.rows
          : [['No hospital enclaves available', '-', '-', '-', '-', '-']],
      theme: 'striped',
      headStyles: {
        fillColor: [15, 118, 110],
        textColor: 255,
        fontSize: 7.5,
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        textColor: [30, 41, 59],
      },
      didParseCell: (hookData) => {
        if (hookData.section === 'body' && hookData.column.index === 5) {
          const val = String(hookData.cell.raw || '');
          if (val === 'CRITICAL') {
            hookData.cell.styles.textColor = [190, 18, 60];
            hookData.cell.styles.fontStyle = 'bold';
          } else if (val === 'WARNING') {
            hookData.cell.styles.textColor = [180, 83, 9];
            hookData.cell.styles.fontStyle = 'bold';
          } else if (val === 'HEALTHY') {
            hookData.cell.styles.textColor = [4, 120, 87];
          }
        }
      },
    });

    cursorY = (doc.lastAutoTable?.finalY ?? cursorY + 20) + 5;

    if (data.nodePostureTable.alertRows.length > 0) {
      cursorY = ensureSectionSpace(doc, 24, cursorY);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(190, 18, 60);
      doc.text('Active Automated Anomaly Alerts', margin, cursorY);
      cursorY += 2.5;

      autoTable(doc, {
        startY: cursorY,
        margin: { left: margin, right: margin },
        head: [['Severity', 'Enclave', 'Anomaly', 'Observed Metric', 'Recommended Remediation']],
        body: data.nodePostureTable.alertRows,
        theme: 'grid',
        headStyles: {
          fillColor: [190, 18, 60],
          textColor: 255,
          fontSize: 7.5,
          fontStyle: 'bold',
        },
        styles: {
          fontSize: 7.2,
          cellPadding: 2,
          textColor: [30, 41, 59],
        },
      });

      cursorY = (doc.lastAutoTable?.finalY ?? cursorY + 20) + 6;
    }
  }

  // Section: Federated Training Round Summaries
  if (data.trainingRoundsTable.included) {
    cursorY = ensureSectionSpace(doc, 30, cursorY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`${sectionNum}. Federated Training Round Summaries`, margin, cursorY);
    sectionNum += 1;
    cursorY += 2.5;

    autoTable(doc, {
      startY: cursorY,
      margin: { left: margin, right: margin },
      head: [
        [
          'Round',
          'Strategy',
          'Acc',
          'Loss',
          'AUC',
          'F1',
          'Eps Spent',
          'Noise',
          'Nodes / Samples',
          'Model Hash',
        ],
      ],
      body:
        data.trainingRoundsTable.rows.length > 0
          ? data.trainingRoundsTable.rows
          : [['-', '-', '-', '-', '-', '-', '-', '-', '-', 'No rounds recorded']],
      theme: 'striped',
      headStyles: {
        fillColor: [15, 118, 110],
        textColor: 255,
        fontSize: 7.2,
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 7.2,
        cellPadding: 1.8,
        textColor: [30, 41, 59],
      },
      columnStyles: {
        0: { fontStyle: 'bold' },
        9: { font: 'courier' },
      },
    });

    cursorY = (doc.lastAutoTable?.finalY ?? cursorY + 20) + 6;
  }

  // Section: Cryptographic Compliance Audit Ledger
  if (data.auditLogsTable.included) {
    cursorY = ensureSectionSpace(doc, 30, cursorY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`${sectionNum}. Cryptographic Compliance Audit Ledger`, margin, cursorY);
    cursorY += 2.5;

    autoTable(doc, {
      startY: cursorY,
      margin: { left: margin, right: margin },
      head: [['Action Type', 'Role', 'Target ID', 'Audit Event Summary', 'Hash']],
      body:
        data.auditLogsTable.rows.length > 0
          ? data.auditLogsTable.rows
          : [['NONE', '-', '-', 'No audit entries match the selected filter.', '-']],
      theme: 'striped',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: 255,
        fontSize: 7.5,
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 7.2,
        cellPadding: 2,
        textColor: [30, 41, 59],
      },
      columnStyles: {
        0: { font: 'courier', fontStyle: 'bold', cellWidth: 42 },
        1: { cellWidth: 15 },
        2: { font: 'courier', cellWidth: 32 },
        4: { font: 'courier', cellWidth: 25 },
      },
    });
  }

  // Add page footer & integrity attestation on every page
  const totalPages = doc.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= totalPages; i += 1) {
    doc.setPage(i);
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);

    doc.setFont('courier', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(data.attestationLine, margin, pageHeight - 9.5);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 9.5, {
      align: 'right',
    });
  }

  const blob = doc.output('blob');
  return {
    blob,
    filename: data.filename,
    pageCount: totalPages,
  };
}
