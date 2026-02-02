import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: number;
  trendLabel?: string;
  variant?: 'default' | 'primary' | 'accent' | 'success';
  className?: string;
}

const KPICard = ({ 
  title, 
  value, 
  icon, 
  trend, 
  trendLabel,
  variant = 'default',
  className 
}: KPICardProps) => {
  const getTrendIcon = () => {
    if (trend === undefined || trend === 0) return <Minus className="h-4 w-4" />;
    return trend > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />;
  };

  const getTrendColor = () => {
    if (trend === undefined || trend === 0) return 'text-muted-foreground';
    return trend > 0 ? 'text-success' : 'text-destructive';
  };

  const variantStyles = {
    default: 'bg-card border-border',
    primary: 'bg-primary text-primary-foreground border-primary',
    accent: 'gradient-accent border-accent text-accent-foreground',
    success: 'bg-success text-success-foreground border-success',
  };

  const iconBgStyles = {
    default: 'bg-secondary text-primary',
    primary: 'bg-primary-foreground/20 text-primary-foreground',
    accent: 'bg-accent-foreground/20 text-accent-foreground',
    success: 'bg-success-foreground/20 text-success-foreground',
  };

  return (
    <Card className={cn(
      'kpi-card-hover overflow-hidden',
      variantStyles[variant],
      className
    )}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <p className={cn(
              'stat-label',
              variant !== 'default' && 'opacity-80'
            )}>
              {title}
            </p>
            <p className="stat-value animate-count-up">
              {value}
            </p>
            {trend !== undefined && (
              <div className={cn('flex items-center gap-1 text-sm font-medium', getTrendColor())}>
                {getTrendIcon()}
                <span>{Math.abs(trend)}%</span>
                {trendLabel && (
                  <span className="text-muted-foreground font-normal ml-1">
                    {trendLabel}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className={cn(
            'p-3 rounded-xl',
            iconBgStyles[variant]
          )}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default KPICard;
