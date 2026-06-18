import React from 'react'

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'danger'
}

export function Badge({ className = '', variant = 'default', ...props }: BadgeProps) {
  const baseStyles = 'inline-flex items-center rounded-lg border-2 px-3 py-1 text-sm font-bold transition-colors focus:outline-none focus:ring-4 focus:ring-slate-500/30 focus:ring-offset-2'
  
  const variants = {
    default: 'border-transparent bg-black text-white hover:bg-slate-800',
    secondary: 'border-transparent bg-slate-100 text-black hover:bg-slate-200',
    outline: 'text-black border-slate-200',
    success: 'border-transparent bg-emerald-100 text-emerald-900 hover:bg-emerald-200',
    warning: 'border-transparent bg-amber-100 text-amber-900 hover:bg-amber-200',
    danger: 'border-transparent bg-red-100 text-red-900 hover:bg-red-200',
  }

  const mergedClassName = `${baseStyles} ${variants[variant]} ${className}`

  return (
    <div className={mergedClassName} {...props} />
  )
}
