'use client';

import {
  GripVertical,
  Plus,
  Edit2,
  Trash2,
  Download,
  FileText,
  Cloud,
  Save,
  X,
  ChevronDown,
  Check,
  Eye,
  EyeOff,
  AlertTriangle,
  Info,
  LayoutGrid,
  Rows3,
  Search,
  Loader2
} from 'lucide-react';

const iconMap = {
  gripVertical: GripVertical,
  plus: Plus,
  edit: Edit2,
  trash: Trash2,
  download: Download,
  fileText: FileText,
  cloud: Cloud,
  save: Save,
  x: X,
  chevronDown: ChevronDown,
  check: Check,
  EyeIcon: Eye,
  EyeSlashIcon: EyeOff,
  alert: AlertTriangle,
  info: Info,
  grid: LayoutGrid,
  list: Rows3,
  search: Search,
  spinner: Loader2,
} as const;

type IconName = keyof typeof iconMap;

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
}

export function Icon({ name, size = 16, className = '' }: IconProps) {
  const IconComponent = iconMap[name];

  return <IconComponent size={size} className={className} />;
}

// Export individual icons for convenience
export { GripVertical, Plus, Edit2, Trash2, Download, FileText, Cloud, Save, X, Eye, EyeOff };