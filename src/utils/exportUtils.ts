import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function exportToCsv(
  filename: string,
  headers: string[],
  rows: (string | number)[][]
): void {
  const escapeCell = (val: string | number) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvLines = [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => row.map(escapeCell).join(',')),
  ];

  const blob = new Blob([csvLines.join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToPdf(
  title: string,
  subtitle: string,
  headers: string[],
  rows: (string | number)[][],
  filename: string
): void {
  const doc = new jsPDF({
    orientation: headers.length > 6 ? 'landscape' : 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  doc.setFontSize(14);
  doc.setTextColor(30, 58, 138);
  doc.text('RGMCET — Attendance Defaulter List Generator', 40, 40);

  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(title, 40, 60);

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `${subtitle}  |  Generated: ${new Date().toLocaleDateString()}`,
    40,
    75
  );

  autoTable(doc, {
    startY: 90,
    head: [headers],
    body: rows.map((r) => r.map((c) => String(c ?? ''))),
    styles: {
      fontSize: 8.5,
      cellPadding: 5,
      textColor: [15, 23, 42],
      lineColor: [226, 232, 240],
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}
