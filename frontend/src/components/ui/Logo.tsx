import React from 'react';
import logoIcon from '../../assets/logo.png';

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
  const textColor = variant === 'light' ? 'text-slate-100' : 'text-brand-ink';
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img 
        src={logoIcon} 
        alt="Codeloom" 
        className={`${sizeClasses[size]} ${
          variant === 'light' ? 'drop-shadow-[0_0_6px_rgba(255,255,255,0.6)]' : ''
        }`}
      />
      {showText && <span className={`text-lg font-medium ${textColor}`}>Codeloom</span>}
    </div>
  );
};

