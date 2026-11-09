import { SiteHeader } from './SiteHeader';

interface NavigationProps {
  /** Retained for call-site compatibility; unused since the tabs replaced admin links. */
  onDashboardClick?: () => void;
  /** Retained for call-site compatibility; search is no longer in the nav. */
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}

/**
 * Top bar for the analytics side (dashboard, deep dives, legal pages): the
 * shared collectiqapp.xyz header, fixed (these layouts reserve 64 px for it
 * and scroll their own content).
 */
export const Navigation = (_props: NavigationProps) => <SiteHeader fixed />;
