import { clsx } from 'clsx';
export function Badge({ children, variant = 'default', className }) {
    const variants = {
        default: 'bg-gray-700 text-gray-300',
        success: 'bg-gray-800 text-gray-100',
        warning: 'bg-black text-brand-400 border border-brand-600',
        danger: 'bg-brand-600/20 text-brand-700',
        info: 'bg-gray-800 text-gray-200 border border-gray-600',
    };
    return (<span className={clsx('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium', variants[variant], className)}>
      {children}
    </span>);
}
