'use client';

import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
  shadow?: boolean;
}

export function Card({
  children,
  className = '',
  padding = 'md',
  shadow = true
}: CardProps) {
  const paddings = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  const shadowClass = shadow ? 'shadow-block border' : 'border';

  return (
    <div className={`bg-blocky-100 dark:bg-gray-800 rounded-block-lg ${shadowClass} border-blocky-500 dark:border-gray-700 ${paddings[padding]} font-blocky ${className}`}>
      {children}
    </div>
  );
}