import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VerifiedBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export default function VerifiedBadge({
  size = 'md',
  showText = true,
  className,
}: VerifiedBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap',
        'bg-gradient-to-r from-green-500 to-emerald-500 text-white',
        'ring-2 ring-green-500/30 shadow-sm',
        sizeClasses[size],
        className
      )}
      title="This profile has been claimed and verified by the lobbyist"
    >
      <CheckCircle2 className={iconSizes[size]} />
      {showText && 'Verified'}
    </span>
  );
}
