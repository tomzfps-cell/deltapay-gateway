import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThemedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  primaryColor?: string;
  buttonRadius?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

const radiusClasses = {
  sm: 'rounded',
  md: 'rounded-md',
  lg: 'rounded-lg',
};

export const ThemedButton: React.FC<ThemedButtonProps> = ({
  primaryColor = '#06B6D4',
  buttonRadius = 'md',
  loading = false,
  children,
  className,
  disabled,
  ...props
}) => {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white shadow-md transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed',
        radiusClasses[buttonRadius],
        className
      )}
      style={{
        backgroundColor: primaryColor,
        boxShadow: `0 4px 14px ${primaryColor}40`,
      }}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
};

export default ThemedButton;
