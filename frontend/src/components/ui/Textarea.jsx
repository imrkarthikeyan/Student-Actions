import { forwardRef } from 'react';
import { clsx } from 'clsx';
export const Textarea = forwardRef(({ label, error, className, ...props }, ref) => (<div className="w-full">
      {label && <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>}
      <textarea ref={ref} className={clsx('w-full bg-gray-800 border rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 resize-y', 'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all', error ? 'border-red-500' : 'border-gray-700', className)} {...props}/>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>));
Textarea.displayName = 'Textarea';
