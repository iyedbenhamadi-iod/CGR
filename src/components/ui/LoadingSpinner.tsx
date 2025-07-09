import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: number;
  className?: string;
  text?: string;
}

export default function LoadingSpinner({ 
  size = 24, 
  className = '', 
  text = 'Chargement...' 
}: LoadingSpinnerProps) {
  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <Loader2 className="animate-spin text-blue-600" size={size} />
      {text && (
        <span className="text-gray-600 text-sm">{text}</span>
      )}
    </div>
  );
}