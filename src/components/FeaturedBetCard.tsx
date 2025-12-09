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
        'relative rounded-featured-card overflow-hidden bg-featured-gradient h-full flex flex-col',
        className
      )}
    >
      {/* Border overlay */}
      <div
        aria-hidden="true"
        className="absolute border border-featured-card-border inset-0 pointer-events-none rounded-featured-card"
      />
      {/* Shadow overlay */}
      <div 
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none rounded-featured-card shadow-neon-glow"
      />
      {/* Content wrapper */}
      <div className="relative h-full flex flex-col">{children}</div>
    </div>
  );
}
