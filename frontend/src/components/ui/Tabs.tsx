import React from 'react';
import { cn } from '../../lib/utils';

export interface TabsProps {
  tabs: { id: string; label: string }[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className }) => {
  return (
    <div className={cn('flex gap-2 rounded-lg bg-slate-100 p-1 text-sm font-medium', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'px-3 py-2 rounded-md transition-colors',
            activeTab === tab.id
              ? 'bg-white shadow-sm text-slate-900'
              : 'text-slate-600 hover:text-slate-900'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

