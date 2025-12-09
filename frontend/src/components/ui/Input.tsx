import React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className, ...props }) => {
  return (
    <label className="block space-y-1.5">
      {label && <span className="text-sm font-medium text-brand-ink">{label}</span>}
      <input
        className={cn(
          'w-full rounded-md border border-semantic-border bg-white px-3 py-2 text-sm text-brand-ink shadow-sm transition-colors duration-150 focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-tealSoft disabled:bg-slate-50',
          error && 'border-red-300 focus:border-red-500 focus:ring-red-100',
          className
        )}
        {...props}
      />
      {error && <span className="text-xs text-red-600">{error}</span>}
    </label>
  );
};

