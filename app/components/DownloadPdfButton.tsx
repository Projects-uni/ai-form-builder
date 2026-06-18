'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import * as htmlToImage from 'html-to-image'
import jsPDF from 'jspdf'

interface Props {
  fileName?: string
}

export default function DownloadPdfButton({ fileName = 'analytics-report.pdf' }: Props) {
  const [isGenerating, setIsGenerating] = useState(false)

  const handleDownload = async () => {
    // We target the hidden multi-page template instead of the web UI
    const templateContainer = document.getElementById('pdf-report-template')
    if (!templateContainer) {
      alert('Report template not found.')
      return
    }

    const pages = templateContainer.querySelectorAll('.pdf-page')
    if (pages.length === 0) {
      alert('No pages found to generate.')
      return
    }

    setIsGenerating(true)

    try {
      // Create A4 PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()

      // Render each page sequentially
      for (let i = 0; i < pages.length; i++) {
        const pageElement = pages[i] as HTMLElement
        
        // Convert the DOM node to an image
        const imgData = await htmlToImage.toPng(pageElement, {
          quality: 1,
          pixelRatio: 2, // High resolution
          backgroundColor: '#ffffff',
          style: {
             transform: 'scale(1)',
             transformOrigin: 'top left'
          }
        })
        
        if (i > 0) {
          pdf.addPage()
        }
        
        // Since the component is strictly 794x1123px (A4 at 96 DPI), 
        // we can just fill the whole page with the image safely.
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      }

      pdf.save(fileName)
    } catch (error) {
      console.error('Failed to generate PDF', error)
      alert('Failed to generate PDF. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={isGenerating}
      className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
    >
      <Download size={16} />
      {isGenerating ? 'Generating...' : 'Download PDF'}
    </button>
  )
}
