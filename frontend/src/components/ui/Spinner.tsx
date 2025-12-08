import React from 'react';
import { cn } from '../../lib/utils';

export const Spinner: React.FC<{ className?: string; size?: 'sm' | 'md' | 'lg' }> = ({
  className,
  size = 'md',
}) => {
  const sizeClass =
    size === 'sm' ? 'h-4 w-4 border-2' : size === 'lg' ? 'h-8 w-8 border-4' : 'h-6 w-6 border-2';
  return (
    <span
      className={cn(
        'inline-block animate-spin rounded-full border-primary-500 border-t-transparent',
        sizeClass,
        className
      )}
    />
  );
};

