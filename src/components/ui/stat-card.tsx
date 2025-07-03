'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  trend?: {
    value: number;
    label: string;
    isPositive?: boolean;
  };
  badge?: {
    text: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  };
  onClick?: () => void;
  className?: string;
}

const variantStyles = {
  default: {
    card: 'border-gray-200 bg-white hover:shadow-md',
    icon: 'text-gray-500',
    value: 'text-gray-900',
    title: 'text-gray-600',
    subtitle: 'text-gray-500',
  },
  success: {
    card: 'border-green-200 bg-green-50 hover:shadow-md hover:bg-green-100',
    icon: 'text-green-600',
    value: 'text-green-900',
    title: 'text-green-700',
    subtitle: 'text-green-600',
  },
  warning: {
    card: 'border-yellow-200 bg-yellow-50 hover:shadow-md hover:bg-yellow-100',
    icon: 'text-yellow-600',
    value: 'text-yellow-900',
    title: 'text-yellow-700',
    subtitle: 'text-yellow-600',
  },
  error: {
    card: 'border-red-200 bg-red-50 hover:shadow-md hover:bg-red-100',
    icon: 'text-red-600',
    value: 'text-red-900',
    title: 'text-red-700',
    subtitle: 'text-red-600',
  },
  info: {
    card: 'border-blue-200 bg-blue-50 hover:shadow-md hover:bg-blue-100',
    icon: 'text-blue-600',
    value: 'text-blue-900',
    title: 'text-blue-700',
    subtitle: 'text-blue-600',
  },
};

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  variant = 'default',
  trend,
  badge,
  onClick,
  className,
}: StatCardProps) {
  const styles = variantStyles[variant];
  const isClickable = !!onClick;

  return (
    <Card
      className={cn(
        'transition-all duration-200',
        styles.card,
        isClickable && 'cursor-pointer hover:scale-105',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <p className={cn('text-sm font-medium', styles.title)}>
                {title}
              </p>
              {badge && (
                <Badge variant={badge.variant || 'default'} className="text-xs">
                  {badge.text}
                </Badge>
              )}
            </div>
            
            <div className="flex items-baseline space-x-2">
              <p className={cn('text-3xl font-bold tracking-tight', styles.value)}>
                {value}
              </p>
              {trend && (
                <div className="flex items-center space-x-1">
                  <span
                    className={cn(
                      'text-xs font-medium',
                      trend.isPositive ? 'text-green-600' : 'text-red-600'
                    )}
                  >
                    {trend.isPositive ? '+' : ''}{trend.value}%
                  </span>
                  <span className="text-xs text-gray-500">
                    {trend.label}
                  </span>
                </div>
              )}
            </div>
            
            {subtitle && (
              <p className={cn('text-sm mt-2', styles.subtitle)}>
                {subtitle}
              </p>
            )}
          </div>
          
          <div className={cn('flex-shrink-0 ml-4', styles.icon)}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Specialized stat cards for common use cases
export function ProgressStatCard({
  title,
  current,
  total,
  icon,
  formatValue = (val) => val.toString(),
  variant = 'default',
  ...props
}: Omit<StatCardProps, 'value' | 'subtitle'> & {
  current: number;
  total: number;
  formatValue?: (value: number) => string;
}) {
  const percentage = total > 0 ? (current / total) * 100 : 0;
  const getVariant = (): StatCardProps['variant'] => {
    if (percentage >= 90) return 'success';
    if (percentage >= 70) return 'info';
    if (percentage >= 50) return 'warning';
    return 'error';
  };

  return (
    <StatCard
      title={title}
      value={formatValue(current)}
      subtitle={`${current} of ${total} (${percentage.toFixed(0)}%)`}
      icon={icon}
      variant={variant === 'default' ? getVariant() : variant}
      badge={{
        text: `${percentage.toFixed(0)}%`,
        variant: percentage >= 70 ? 'default' : 'secondary',
      }}
      {...props}
    />
  );
}

export function TrendStatCard({
  title,
  value,
  previousValue,
  icon,
  timePeriod = 'vs last period',
  ...props
}: Omit<StatCardProps, 'trend'> & {
  previousValue: number;
  timePeriod?: string;
}) {
  const numericValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
  const change = previousValue > 0 ? ((numericValue - previousValue) / previousValue) * 100 : 0;
  
  return (
    <StatCard
      title={title}
      value={value}
      icon={icon}
      trend={{
        value: Math.abs(change),
        label: timePeriod,
        isPositive: change >= 0,
      }}
      {...props}
    />
  );
}

// Analytics-focused stat card with multiple metrics
export function AnalyticsStatCard({
  title,
  primaryValue,
  primaryLabel,
  secondaryMetrics,
  icon,
  variant = 'default',
  ...props
}: Omit<StatCardProps, 'value' | 'subtitle'> & {
  primaryValue: number | string;
  primaryLabel: string;
  secondaryMetrics: Array<{
    label: string;
    value: number | string;
    change?: number;
  }>;
}) {
  const styles = variantStyles[variant];
  
  return (
    <Card className={cn('transition-all duration-200', styles.card, props.className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className={cn('text-sm font-medium mb-2', styles.title)}>
              {title}
            </p>
            
            <div className="flex items-baseline space-x-2">
              <p className={cn('text-3xl font-bold tracking-tight', styles.value)}>
                {primaryValue}
              </p>
            </div>
            
            <p className={cn('text-sm mt-2', styles.subtitle)}>
              {primaryLabel}
            </p>
            
            <div className="mt-4 space-y-2">
              {secondaryMetrics.map((metric, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{metric.label}</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{metric.value}</span>
                    {metric.change !== undefined && (
                      <span
                        className={cn(
                          'text-xs',
                          metric.change >= 0 ? 'text-green-600' : 'text-red-600'
                        )}
                      >
                        {metric.change >= 0 ? '+' : ''}{metric.change}%
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className={cn('flex-shrink-0 ml-4', styles.icon)}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
