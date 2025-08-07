import { ReactNode } from 'react';

interface MinimalLayoutProps {
  children: ReactNode;
  className?: string;
}

export const MinimalLayout = ({ children, className = "" }: MinimalLayoutProps) => {
  return (
    <div className={`min-h-screen bg-background ${className}`}>
      {children}
    </div>
  );
}; 