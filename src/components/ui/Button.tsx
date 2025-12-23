
import { ReactNode, forwardRef, ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant of the button */
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'blocky';
  /** Size of the button */
  size?: 'sm' | 'md' | 'lg';
  /** Optional icon to render before children */
  icon?: ReactNode;
}

const baseStyles = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed appearance-none border border-transparent shadow-sm font-blocky';

const variants = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500',
  secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  ghost: 'text-gray-600 hover:text-gray-800 hover:bg-gray-50 focus:ring-gray-500 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700',
  blocky: 'bg-blocky-500 text-blocky-900 hover:bg-blocky-500/90 focus:ring-blocky-500 rounded-block shadow-block'
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base'
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    className = '',
    icon,
    type = 'button',
    ...props
  },
  ref
) {
  const mergedClassName = cn(baseStyles, variants[variant], sizes[size], className);

  return (
    <button ref={ref} type={type} className={mergedClassName} {...props}>
      {icon}
      {children}
    </button>
  );
});

Button.displayName = 'Button';