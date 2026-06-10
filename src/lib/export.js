import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

export function exportToPDF(title, columns, rows, filename) {
  const doc = new jsPDF()
  doc.setFontSize(16)
  doc.setTextColor(64, 1, 6)
  doc.text(title, 14, 18)
  doc.setFontSize(9)
  doc.setTextColor(100)
  doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, 14, 25)

  autoTable(doc, {
    startY: 30,
    head: [columns.map(c => c.header)],
    body: rows.map(row => columns.map(c => row[c.key] ?? '')),
    headStyles: { fillColor: [64, 1, 6], textColor: [217, 185, 145], fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: [13, 12, 0] },
    alternateRowStyles: { fillColor: [247, 240, 230] },
    styles: { cellPadding: 4 },
  })

  doc.save(`${filename}.pdf`)
}

export function exportToExcel(title, columns, rows, filename) {
  const header = columns.map(c => c.header)
  const data = rows.map(row => columns.map(c => row[c.key] ?? ''))
  const ws = XLSX.utils.aoa_to_sheet([header, ...data])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, title.substring(0, 31))
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount || 0)
}

export function formatDate(date) {
  return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
