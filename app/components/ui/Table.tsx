import React from 'react'

export function Table({ className = '', ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="relative w-full overflow-auto">
      <table className={`w-full caption-bottom text-base ${className}`} {...props} />
    </div>
  )
}

export function TableHeader({ className = '', ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={`[&_tr]:border-b-2 [&_tr]:border-slate-200 ${className}`} {...props} />
}

export function TableBody({ className = '', ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={`[&_tr:last-child]:border-0 ${className}`} {...props} />
}

export function TableFooter({ className = '', ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tfoot className={`border-t-2 border-slate-200 bg-slate-50 font-semibold [&>tr]:last:border-b-0 ${className}`} {...props} />
}

export function TableRow({ className = '', ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={`border-b-2 border-slate-100 transition-colors hover:bg-slate-50 data-[state=selected]:bg-slate-100 ${className}`}
      {...props}
    />
  )
}

export function TableHead({ className = '', ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={`h-16 px-6 text-left align-middle font-bold text-slate-600 [&:has([role=checkbox])]:pr-0 ${className}`}
      {...props}
    />
  )
}

export function TableCell({ className = '', ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={`p-6 align-middle font-medium text-slate-800 [&:has([role=checkbox])]:pr-0 ${className}`}
      {...props}
    />
  )
}
