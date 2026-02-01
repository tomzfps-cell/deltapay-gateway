import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string;
  change?: {
    value: number;
    label: string;
  };
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  trend = 'neutral',
  className,
}) => {
  return (
    <div className={cn('metric-card group', className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="stat-label">{title}</p>
          <p className="stat-value text-foreground">{value}</p>
          {change && (
            <div className="flex items-center gap-1.5">
              {trend === 'up' && (
                <TrendingUp className="h-3.5 w-3.5 text-success" />
              )}
              {trend === 'down' && (
                <TrendingDown className="h-3.5 w-3.5 text-destructive" />
              )}
              <span
                className={cn(
                  'text-xs font-medium',
                  trend === 'up' && 'text-success',
                  trend === 'down' && 'text-destructive',
                  trend === 'neutral' && 'text-muted-foreground'
                )}
              >
                {change.value > 0 ? '+' : ''}
                {change.value}% {change.label}
              </span>
            </div>
          )}
        </div>
        <div className="rounded-xl bg-primary/10 p-3 text-primary transition-colors group-hover:bg-primary/20">
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
};
