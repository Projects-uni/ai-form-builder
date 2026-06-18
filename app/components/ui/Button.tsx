import React, { forwardRef } from 'react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'icon'
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'lg', isLoading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-bold transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'
    
    const variants = {
      primary: 'bg-black text-white hover:bg-slate-800 shadow-md',
      secondary: 'bg-slate-100 text-black hover:bg-slate-200',
      outline: 'border-2 border-slate-200 bg-white hover:border-slate-300 text-black shadow-sm',
      ghost: 'hover:bg-slate-100 text-slate-700 hover:text-black',
      danger: 'bg-red-600 text-white hover:bg-red-700 shadow-md',
    }

    const sizes = {
      sm: 'h-10 px-4 text-sm rounded-lg',
      md: 'h-12 px-6 py-2 text-base rounded-xl',
      lg: 'h-14 px-8 text-lg rounded-xl',
      xl: 'h-16 px-10 text-xl rounded-2xl',
      icon: 'h-12 w-12 rounded-xl',
    }

    const mergedClassName = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`

    return (
      <button
        ref={ref}
        className={mergedClassName}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg className="mr-2 h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {!isLoading && leftIcon && <span className="mr-3">{leftIcon}</span>}
        {children}
        {!isLoading && rightIcon && <span className="ml-3">{rightIcon}</span>}
      </button>
    )
  }
)
Button.displayName = 'Button'

export { Button }
