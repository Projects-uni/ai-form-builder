import React, { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

export function Modal({ isOpen, onClose, title, description, children, footer, maxWidth = 'md' }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose()
  }

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-xl',
    xl: 'max-w-2xl',
    '2xl': 'max-w-4xl',
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 sm:p-6"
      ref={overlayRef}
      onClick={handleOverlayClick}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className={`w-full ${maxWidthClasses[maxWidth]} animate-in fade-in zoom-in-95 rounded-3xl bg-white shadow-2xl`}
      >
        <div className="flex items-center justify-between border-b-2 border-slate-100 px-8 py-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
            {description && <p className="mt-2 text-base text-slate-500">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-3 text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <X size={24} strokeWidth={3} />
          </button>
        </div>
        
        <div className="px-8 py-6 max-h-[70vh] overflow-y-auto">
          {children}
        </div>

        {footer && (
          <div className="flex items-center justify-end gap-4 border-t-2 border-slate-100 bg-slate-50/80 px-8 py-6 rounded-b-3xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
