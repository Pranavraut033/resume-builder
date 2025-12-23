'use client';

import { ReactNode } from 'react';
import { Icon } from './Icon';

interface SectionProps {
  title: string;
  children: ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  canDelete?: boolean;
  className?: string;
}

export function Section({
  title,
  children,
  onEdit,
  onDelete,
  canDelete = false,
  className = ''
}: SectionProps) {
  return (
    <div className={`mb-8 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white border-b-2 border-blue-500 pb-1">
          {title}
        </h2>
        <div className="flex gap-2">
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Edit section"
            >
              <Icon name="edit" size={16} />
            </button>
          )}
          {canDelete && onDelete && (
            <button
              onClick={onDelete}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete section"
            >
              <Icon name="trash" size={16} />
            </button>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}