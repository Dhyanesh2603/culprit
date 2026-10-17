import React from 'react';
import { cn } from '../../lib/utils';

export function Label({
  className,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        'block text-[11px] font-medium tracking-wide uppercase text-primary-subtle mb-1.5',
        className
      )}
      {...props}
    >
      {children}
    </label>
  );
}

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type = 'text', ...props }, ref) => {
  return (
    <input
      type={type}
      ref={ref}
      className={cn(
        'w-full bg-surface-muted/60 border border-border rounded px-3 py-1.5 text-xs text-primary placeholder:text-zinc-600 focus:outline-none focus:border-border-focus focus:ring-1 focus:ring-accent transition-colors duration-150 disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
});
Input.displayName = 'Input';

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        'w-full bg-surface-muted/60 border border-border rounded p-3 text-xs text-primary placeholder:text-zinc-600 focus:outline-none focus:border-border-focus focus:ring-1 focus:ring-accent transition-colors duration-150 disabled:opacity-50 min-h-[80px]',
        className
      )}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={cn(
        'w-full bg-surface-muted/60 border border-border rounded px-3 py-1.5 text-xs text-primary focus:outline-none focus:border-border-focus focus:ring-1 focus:ring-accent transition-colors duration-150 disabled:opacity-50 appearance-none cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
});
Select.displayName = 'Select';
