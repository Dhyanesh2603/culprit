import React from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'accent';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, disabled, children, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:opacity-50 disabled:pointer-events-none select-none';

    const variants = {
      primary: 'bg-primary text-background hover:bg-neutral-200 active:bg-neutral-300 font-semibold',
      secondary: 'bg-surface-elevated text-primary border border-border hover:bg-surface-hover hover:border-border-focus',
      outline: 'bg-transparent text-primary border border-border hover:bg-surface-muted hover:border-border-focus',
      ghost: 'bg-transparent text-primary-muted hover:text-primary hover:bg-surface-muted',
      destructive: 'bg-red-950/40 text-red-400 border border-red-900/50 hover:bg-red-900/60 active:bg-red-900',
      accent: 'bg-accent text-background hover:bg-accent-hover font-semibold shadow-sm',
    };

    const sizes = {
      sm: 'h-7 px-2.5 text-xs',
      md: 'h-8 px-3.5 text-xs',
      lg: 'h-10 px-5 text-sm',
      icon: 'h-8 w-8 p-0',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
