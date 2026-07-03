import { forwardRef } from 'react';
import { clsx } from 'clsx';
export const Button = forwardRef(({ variant = 'primary', size = 'md', loading, disabled, children, className, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-950 disabled:opacity-50 disabled:cursor-not-allowed';
    const variants = {
        primary: 'bg-brand-600 hover:bg-brand-500 text-white focus:ring-brand-500',
        secondary: 'bg-gray-800 hover:bg-gray-700 text-gray-100 focus:ring-gray-600',
        ghost: 'hover:bg-gray-800 text-gray-300 hover:text-gray-100 focus:ring-gray-600',
        danger: 'bg-red-600 hover:bg-red-500 text-white focus:ring-red-500',
        outline: 'border border-gray-700 hover:bg-gray-800 text-gray-300 focus:ring-gray-600',
    };
    const sizes = {
        xs: 'px-2 py-1 text-xs',
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-sm',
        lg: 'px-5 py-2.5 text-base',
    };
    return (<button ref={ref} disabled={disabled || loading} className={clsx(base, variants[variant], sizes[size], className)} {...props}>
        {loading && (<svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>)}
        {children}
      </button>);
});
Button.displayName = 'Button';
