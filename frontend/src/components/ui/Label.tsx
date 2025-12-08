import React from 'react';
import { cn } from '../../lib/utils';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export const Label: React.FC<LabelProps> = ({ className, children, ...props }) => (
  <label
    className={cn('text-sm font-medium text-slate-700', className)}
    {...props}
  >
    {children}
  </label>
);

