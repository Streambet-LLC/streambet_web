import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { SidebarProvider, useSidebar } from '../ui/sidebar';
import { Sheet, SheetContent } from '../ui/sheet';
import { Button } from '../ui/button';
import SidebarBody from './SidebarBody';
import { BetRoundType, BettingCategory } from '@/enums';

interface SidebarProps {
  selectedCategory?: BettingCategory | null;
  setSelectedCategory?: (category: BettingCategory | null) => void;
  selectedBetType?: BetRoundType | null;
  setSelectedBetType?: (type: BetRoundType | null) => void;
}

/**
 * Renders the desktop sticky rail OR, on mobile, a "Filters" button that opens
 * the same SidebarBody inside a slide-in Sheet. Both share the single
 * SidebarProvider context (open/openMobile) below.
 */
function SidebarInner(props: SidebarProps) {
  const { isMobile, openMobile, setOpenMobile } = useSidebar();

  if (isMobile) {
    return (
      <>
        <Button
          type="button"
          onClick={() => setOpenMobile(true)}
          className="md:hidden fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-full bg-primary text-black px-4 py-2 shadow-lg hover:bg-primary/90"
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="font-semibold">Filters</span>
        </Button>
        <Sheet open={openMobile} onOpenChange={setOpenMobile}>
          <SheetContent
            side="left"
            className="w-[300px] max-w-[85vw] bg-background p-0 overflow-y-auto [&>button]:hidden"
          >
            <SidebarBody {...props} forceExpanded />
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <div className="sticky top-16 h-[calc(100dvh-64px)] hidden md:block bg-background border-r">
      <SidebarBody {...props} />
    </div>
  );
}

export default function Sidebar(props: SidebarProps) {
  const [defaultOpen] = useState(() => {
    const state = localStorage.getItem('sidebar_state');

    return state !== 'false';
  });

  // `contents` makes the provider generate no box of its own, so on desktop the
  // sticky rail below is the real flex child (preserving the original layout) and
  // on mobile the fixed FAB + portaled Sheet take no layout space.
  return (
    <SidebarProvider className="contents !transition-none" defaultOpen={defaultOpen}>
      <SidebarInner {...props} />
    </SidebarProvider>
  );
}
