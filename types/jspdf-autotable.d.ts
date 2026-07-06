declare module 'jspdf-autotable' {
  import { jsPDF } from 'jspdf'

  interface AutoTableOptions {
    startY?: number
    head?: string[][]
    body?: (string | number | boolean | null | undefined)[][]
    theme?: 'grid' | 'plain' | 'striped' | 'grid-horizontal' | 'grid-vertical'
    headStyles?: Record<string, unknown>
    columnStyles?: Record<number, Record<string, unknown>>
    styles?: Record<string, unknown>
    didDrawPage?: () => void
    margin?: { left?: number; right?: number; top?: number; bottom?: number }
  }

  function autoTable(doc: jsPDF, options: AutoTableOptions): void
  export default autoTable
}