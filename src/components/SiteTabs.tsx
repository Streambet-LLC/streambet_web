import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

/**
 * The two top-level sections of collectiqapp.xyz, in the order Nick set:
 * Hermes Auctions first (the home page), collectIQ Analytics second.
 * Shared by every main-site header so the tabs never drift apart.
 */
const TABS = [
  {
    to: '/',
    label: 'Hermes Auctions',
    short: 'Auctions',
    icon: '/hermes/hermes-mark-32.png',
    isActive: (path: string) => path === '/' || path.startsWith('/auctions'),
  },
  {
    to: '/analytics',
    label: 'collectIQ Analytics',
    short: 'Analytics',
    icon: '/favicon.png',
    isActive: (path: string) => path.startsWith('/analytics'),
  },
];

export function SiteTabs({ className }: { className?: string }) {
  const { pathname } = useLocation();
  return (
    <nav aria-label="Sections" className={cn('flex items-center gap-1', className)}>
      {TABS.map(tab => {
        const active = tab.isActive(pathname);
        return (
          <Link
            key={tab.to}
            to={tab.to}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1.5 text-sm font-semibold transition-colors sm:px-3',
              active ? 'bg-white/10 text-white' : 'text-white/55 hover:bg-white/5 hover:text-white'
            )}
          >
            <img src={tab.icon} alt="" className="hidden h-4 w-4 sm:block" />
            <span className="sm:hidden">{tab.short}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/** collectIQ home link: the icon on phones, the wordmark from `sm` up. */
export function CollectIqLogoLink({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      aria-label="collectIQ home"
      className={cn('flex shrink-0 items-center', className)}
    >
      <img src="/favicon.png" alt="collectIQ" className="h-8 w-8 sm:hidden" />
      <img src="/collectiq-mark.png" alt="collectIQ" className="hidden h-7 w-auto sm:block" />
    </Link>
  );
}
