import { useEffect, useState } from 'react';
import { SidebarProvider, SidebarTrigger } from '../ui/sidebar';
import SidebarBody from './SidebarBody';
import { BetRoundType, BettingCategory } from '@/enums';

interface SidebarProps {
  selectedCategory?: BettingCategory | null;
  setSelectedCategory?: (category: BettingCategory | null) => void;
  selectedBetType?: BetRoundType | null;
  setSelectedBetType?: (type: BetRoundType | null) => void;
}

export default function Sidebar({
  selectedCategory,
  setSelectedCategory,
  selectedBetType,
  setSelectedBetType,
}: SidebarProps) {
  const [defaultOpen] = useState(() => {
    const state = localStorage.getItem('sidebar_state');

    return state !== 'false';
  });

  return (
    <div>
      <SidebarProvider
        className="!transition-none bg-background border-r"
        defaultOpen={defaultOpen}
      >
        <SidebarBody
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          selectedBetType={selectedBetType}
          setSelectedBetType={setSelectedBetType}
        />
      </SidebarProvider>
    </div>
  );
}
