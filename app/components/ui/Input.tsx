import React, { forwardRef } from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, helperText, leftIcon, rightIcon, id, ...props }, ref) => {
    const generatedId = React.useId()
    const inputId = id || generatedId

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="mb-2 block text-base font-bold text-slate-900">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`flex h-14 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-lg placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all ${leftIcon ? 'pl-12' : ''} ${rightIcon ? 'pr-12' : ''} ${error ? 'border-red-500 focus:ring-red-500/20' : ''} ${className}`}
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="mt-2 text-sm font-medium text-red-500">{error}</p>}
        {helperText && !error && <p className="mt-2 text-sm text-slate-500">{helperText}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }
