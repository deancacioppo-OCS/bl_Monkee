
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-slate-800/80 border border-slate-700 rounded-lg p-6 ${className}`}>
      {children}
    </div>
  );
};
