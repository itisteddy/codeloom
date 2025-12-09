import React from 'react';
import logoIcon from '../../assets/logo.svg';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark';
}

const sizeClasses = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

export const Logo: React.FC<LogoProps> = ({ 
  className = '', 
  showText = false, 
  size = 'md',
  variant = 'dark'
}) => {
  const textColor = variant === 'light' ? 'text-slate-100' : 'text-slate-900';
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img 
        src={logoIcon} 
        alt="Codeloom" 
        className={`${sizeClasses[size]} ${variant === 'light' ? 'invert' : ''}`}
      />
      {showText && <span className={`text-lg font-semibold ${textColor}`}>Codeloom</span>}
    </div>
  );
};

