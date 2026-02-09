import { useIsMobile } from '@/hooks/use-mobile';
import { Sidebar, SidebarContent, SidebarGroup, SidebarTrigger, useSidebar } from '../ui/sidebar';
import SidebarStreamCard from './SidebarStreamCard';
import { SidebarProfileCard } from './SidebarProfileCard';
import { Button } from '../ui/button';
import { motion } from 'framer-motion';
import {
  SidebarIcon,
  MoreHorizontal,
  Goal,
  LayoutGrid,
  GemIcon,
  Flame,
  AlarmClock,
  HandGrabIcon,
  NotepadTextIcon,
  MousePointerClickIcon,
} from 'lucide-react';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import api from '@/integrations/api/client';
import { BetRoundType, BettingCategory } from '@/enums';
import { useLocation } from 'react-router-dom';
import { getCategoryLabel, getTypeLabel } from '@/utils/categoryHelpers';
import { useAuthContext } from '@/contexts/AuthContext';

type TopStream = {
  id: string;
  streamName: string;
  views: number;
  pfp: string;
  creator: string;
};

interface SidebarBodyProps {
  selectedCategory?: BettingCategory | null;
  setSelectedCategory?: (category: BettingCategory | null) => void;
  selectedBetType?: BetRoundType | null;
  setSelectedBetType?: (type: BetRoundType | null) => void;
}

const CategoryIconContainer = ({
  icon: Icon,
  isSelected,
  compact = false,
}: {
  icon: React.ElementType;
  isSelected: boolean;
  compact?: boolean;
}) => (
  <div
    className={cn(
      'h-7 w-7 rounded-full border border-primary flex items-center justify-center',
      !compact && 'flex-shrink-0',
      isSelected ? 'bg-black border-black' : 'bg-primary/20 border-primary'
    )}
  >
    <Icon className="h-4 w-4 text-primary" />
  </div>
);

export default function SidebarBody({
  selectedCategory,
  setSelectedCategory,
  selectedBetType,
  setSelectedBetType,
}: SidebarBodyProps) {
  const controls = useSidebar();
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const { session } = useAuthContext();

  const { data } = useQuery({
    queryKey: ['homepage-live-creators'],
    queryFn: async () => {
      const response = await api.userStream.getTopLiveStreams();

      return response.data as TopStream[];
    },
  });

  // Icon options for each category
  const getCategoryIcon = (category: BettingCategory) => {
    const iconMap = {
      [BettingCategory.POKEMON_CARDS]: LayoutGrid,
      [BettingCategory.SPORTS_CARDS]: Goal,
      // HOTFIX: Temporarily removed from UI - backend still supports this
      // [BettingCategory.EMERGING_SPORTS]: SwordsIcon,
      [BettingCategory.OTHER]: MoreHorizontal,
    };
    return iconMap[category];
  };

  const getTypeIcon = (type: BetRoundType) => {
    const iconMap = {
      [BetRoundType.AUCTION]: HandGrabIcon,
      [BetRoundType.FUTURE]: AlarmClock,
      [BetRoundType.OPINION]: NotepadTextIcon,
      [BetRoundType.PICK]: MousePointerClickIcon,
    };
    return iconMap[type];
  };

  return (
    <Sidebar
      collapsible="none"
      className={cn(
        'top-16 py-2 !transition-none bg-background flex flex-col',
        controls.open ? 'w-60' : 'w-fit',
        controls.isMobile && 'max-w-[50px]'
      )}
    >
      <SidebarContent className="flex flex-col h-full">
        <SidebarGroup className="flex flex-col gap-2 overflow-auto flex-1 pb-28 md:pb-48">
          <div className="flex justify-between items-center md:mb-2">
            {controls.open && !controls.isMobile && (
              <div className="flex items-center gap-1.5 pl-2">
                <Flame className="h-4 w-4 text-live-hot" />
                <span className="text-sm font-semibold">Live Now</span>
              </div>
            )}
            {!controls.isMobile ? (
              <Button variant="ghost" onClick={controls.toggleSidebar} className="w-8 h-8">
                <SidebarIcon />
              </Button>
            ) : (
              <div className="flex flex-col items-center mx-auto">
                <Flame className="h-4 w-4 text-live-hot" />
                <div className="text-[8px] text-muted-foreground font-bold">LIVE</div>
              </div>
            )}
          </div>
          {data?.map((stream, i) => (
            <SidebarStreamCard
              key={i}
              pfp={stream.pfp}
              viewerCount={stream.views}
              streamName={stream.streamName}
              streamId={stream.id}
              creator={stream.creator}
              compact={!controls.open || controls.isMobile}
            />
          ))}

          {isHomePage && (
            <>
              {/* Categories Section */}
              <div className="border-t border-border my-2" />
              {controls.open && !controls.isMobile && (
                <div className="text-sm font-semibold pl-2 mb-2" id="sidebar-categories-label">
                  Markets
                </div>
              )}
              <div
                className="flex flex-col gap-2"
                role="navigation"
                aria-label="Pick markets"
                aria-labelledby={
                  controls.open && !controls.isMobile ? 'sidebar-categories-label' : undefined
                }
              >
                <Button
                  asChild
                  onClick={() => setSelectedCategory?.(null)}
                  className={cn(
                    'h-auto overflow-visible transition-all cursor-pointer',
                    controls.open && !controls.isMobile
                      ? 'justify-start p-2.5 rounded-[8px] bg-sidebar-card-bg/50 border border-primary hover:bg-primary/5'
                      : 'justify-center items-center px-1 py-1 rounded-md hover:bg-sidebar-compact-hover',
                    selectedCategory === null
                      ? '!bg-primary !text-black hover:!bg-primary !border-primary'
                      : 'text-white bg-transparent border-primary/50 hover:border-primary'
                  )}
                  aria-pressed={selectedCategory === null}
                  aria-label="Show all markets"
                >
                  <motion.div whileHover={controls.open && !controls.isMobile ? { x: 4 } : {}}>
                    {controls.open && !controls.isMobile ? (
                      <div className="flex items-center gap-2.5 w-full">
                        <CategoryIconContainer
                          icon={GemIcon}
                          isSelected={selectedCategory === null}
                        />
                        <span className="text-[13px] font-semibold">All</span>
                      </div>
                    ) : (
                      <CategoryIconContainer
                        icon={GemIcon}
                        isSelected={selectedCategory === null}
                        compact
                      />
                    )}
                  </motion.div>
                </Button>
                {Object.values(BettingCategory).map(category => {
                  const IconComponent = getCategoryIcon(category);
                  return (
                    <Button
                      asChild
                      key={category}
                      onClick={() => setSelectedCategory?.(category)}
                      className={cn(
                        'h-auto overflow-visible transition-all cursor-pointer',
                        controls.open && !controls.isMobile
                          ? 'justify-start text-left p-2.5 rounded-[8px] bg-sidebar-card-bg/50 border border-primary hover:bg-primary/5'
                          : 'justify-center items-center px-1 py-1 rounded-md hover:bg-sidebar-compact-hover',
                        selectedCategory === category
                          ? '!bg-primary !text-black hover:!bg-primary !border-primary'
                          : 'text-white bg-transparent border-primary/50 hover:border-primary'
                      )}
                      aria-pressed={selectedCategory === category}
                      aria-label={`Filter by ${getCategoryLabel(category)}`}
                    >
                      <motion.div whileHover={controls.open && !controls.isMobile ? { x: 4 } : {}}>
                        {controls.open && !controls.isMobile ? (
                          <div className="flex items-center gap-2.5 w-full">
                            <CategoryIconContainer
                              icon={IconComponent}
                              isSelected={selectedCategory === category}
                            />
                            <span className="text-[13px] font-semibold">
                              {getCategoryLabel(category)}
                            </span>
                          </div>
                        ) : (
                          <CategoryIconContainer
                            icon={IconComponent}
                            isSelected={selectedCategory === category}
                            compact
                          />
                        )}
                      </motion.div>
                    </Button>
                  );
                })}
              </div>
              {/* Bet Types Section */}
              <div className="border-t border-border my-2" />
              {controls.open && !controls.isMobile && (
                <div className="text-sm font-semibold pl-2 mb-2" id="sidebar-bet-type-label">
                  Categories
                </div>
              )}
              <div
                className="flex flex-col gap-2"
                role="navigation"
                aria-label="Pick category"
                aria-labelledby={
                  controls.open && !controls.isMobile ? 'sidebar-bet-type-label' : undefined
                }
              >
                <Button
                  asChild
                  onClick={() => setSelectedBetType?.(null)}
                  className={cn(
                    'h-auto overflow-visible transition-all cursor-pointer',
                    controls.open && !controls.isMobile
                      ? 'justify-start p-2.5 rounded-[8px] bg-sidebar-card-bg/50 border border-primary hover:bg-primary/5'
                      : 'justify-center items-center px-1 py-1 rounded-md hover:bg-sidebar-compact-hover',
                    selectedBetType === null
                      ? '!bg-primary !text-black hover:!bg-primary !border-primary'
                      : 'text-white bg-transparent border-primary/50 hover:border-primary'
                  )}
                  aria-pressed={selectedBetType === null}
                  aria-label="Show all types"
                >
                  <motion.div whileHover={controls.open && !controls.isMobile ? { x: 4 } : {}}>
                    {controls.open && !controls.isMobile ? (
                      <div className="flex items-center gap-2.5 w-full">
                        <CategoryIconContainer
                          icon={GemIcon}
                          isSelected={selectedBetType === null}
                        />
                        <span className="text-[13px] font-semibold">All</span>
                      </div>
                    ) : (
                      <CategoryIconContainer
                        icon={GemIcon}
                        isSelected={selectedBetType === null}
                        compact
                      />
                    )}
                  </motion.div>
                </Button>
                {Object.values(BetRoundType).map(type => {
                  const IconComponent = getTypeIcon(type);
                  return (
                    <Button
                      asChild
                      key={type}
                      onClick={() => setSelectedBetType?.(type)}
                      className={cn(
                        'h-auto overflow-visible transition-all cursor-pointer',
                        controls.open && !controls.isMobile
                          ? 'justify-start text-left p-2.5 rounded-[8px] bg-sidebar-card-bg/50 border border-primary hover:bg-primary/5'
                          : 'justify-center items-center px-1 py-1 rounded-md hover:bg-sidebar-compact-hover',
                        selectedBetType === type
                          ? '!bg-primary !text-black hover:!bg-primary !border-primary'
                          : 'text-white bg-transparent border-primary/50 hover:border-primary'
                      )}
                      aria-pressed={selectedBetType === type}
                      aria-label={`Filter by ${getTypeLabel(type)}`}
                    >
                      <motion.div whileHover={controls.open && !controls.isMobile ? { x: 4 } : {}}>
                        {controls.open && !controls.isMobile ? (
                          <div className="flex items-center gap-2.5 w-full">
                            <CategoryIconContainer
                              icon={IconComponent}
                              isSelected={selectedBetType === type}
                            />
                            <span className="text-[13px] font-semibold">{getTypeLabel(type)}</span>
                          </div>
                        ) : (
                          <CategoryIconContainer
                            icon={IconComponent}
                            isSelected={selectedBetType === type}
                            compact
                          />
                        )}
                      </motion.div>
                    </Button>
                  );
                })}
              </div>
            </>
          )}
        </SidebarGroup>
      </SidebarContent>

      {/* Profile Card at Bottom - Fixed to bottom of viewport */}
      {session && (
        <div
          className={cn(
            'fixed bottom-0 z-20',
            controls.open && !controls.isMobile ? 'w-60' : controls.isMobile ? 'w-[50px]' : 'w-fit'
          )}
        >
          <SidebarProfileCard compact={!controls.open || controls.isMobile} />
        </div>
      )}
    </Sidebar>
  );
}
