import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface FeaturedBetCardProps {
  children: ReactNode;
  className?: string;
}

export default function FeaturedBetCard({ children, className }: FeaturedBetCardProps) {
  return (
    <div
      className={cn(
        'relative rounded-featured-card overflow-hidden h-full flex flex-col',
        className
      )}
      style={{ backgroundColor: 'var(--card-grid-bg)' }}
    >
      {/* Border overlay */}
      <div
        aria-hidden="true"
        className="absolute border border-card-grid-border inset-0 pointer-events-none rounded-featured-card"
      />
      {/* Shadow overlay */}
      <div 
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none rounded-featured-card shadow-neon-glow"
      />
      {/* Content wrapper */}
      <div className="relative flex flex-col flex-1">{children}</div>
    </div>
  );
}
