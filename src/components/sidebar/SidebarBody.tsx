import { useIsMobile } from '@/hooks/use-mobile';
import { Sidebar, SidebarContent, SidebarGroup, SidebarTrigger, useSidebar } from '../ui/sidebar';
import SidebarStreamCard from './SidebarStreamCard';
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
import { useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import api from '@/integrations/api/client';
import { BetRoundType, BettingCategory } from '@/enums';
import { useLocation, Link } from 'react-router-dom';
import { getCategoryLabel, getTypeLabel } from '@/utils/categoryHelpers';
import { useAuthContext } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { getImageLink } from '@/utils/helper';

type TopStream = {
  id: string;
  streamName: string;
  views: number;
  pfp: string;
  creator: string;
};

type Creator = {
  id: string;
  username: string;
  profileImageUrl: string;
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

  const { data: creators } = useQuery({
    queryKey: ['sidebar-creators'],
    queryFn: async () => {
      const response = await api.user.getCreators();
      return response.data as Creator[];
    },
  });

  // Shuffle and limit creators to 5
  const randomizedCreators = useMemo(() => {
    if (!creators || creators.length === 0) return [];

    // Fisher-Yates shuffle algorithm
    const shuffled = [...creators];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, 5);
  }, [creators]);

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
        <SidebarGroup className="flex flex-col gap-2 overflow-auto flex-1 pb-20">
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

          {/* Creators Section - Always Show */}
          <div className="border-t border-border my-2" />
          {controls.open && !controls.isMobile && (
            <div
              className="flex items-center justify-between pl-2 mb-2"
              id="sidebar-creators-label"
            >
              <div className="text-sm font-semibold">Creators</div>
              <Link
                to="/creators"
                className="text-xs text-primary hover:text-primary/80 transition-colors pr-2 font-medium"
              >
                See All
              </Link>
            </div>
          )}
          <div
            className="flex flex-col gap-2"
            role="navigation"
            aria-label="Featured creators"
            aria-labelledby={
              controls.open && !controls.isMobile ? 'sidebar-creators-label' : undefined
            }
          >
            {randomizedCreators && randomizedCreators.length > 0
              ? randomizedCreators.map(creator => (
                  <Link
                    key={creator.id}
                    to={`/${creator.username}`}
                    className={cn(
                      'h-auto overflow-visible transition-all cursor-pointer no-underline',
                      controls.open && !controls.isMobile
                        ? 'p-2.5 rounded-[8px] bg-sidebar-card-bg/50 border border-primary/50 hover:bg-primary/5 hover:border-primary flex items-center gap-2.5'
                        : 'px-1 py-1 rounded-md hover:bg-sidebar-compact-hover flex justify-center'
                    )}
                  >
                    <Avatar
                      className={cn(controls.open && !controls.isMobile ? 'h-8 w-8' : 'h-7 w-7')}
                    >
                      <AvatarImage
                        src={getImageLink(creator.profileImageUrl)}
                        alt={creator.username}
                      />
                      <AvatarFallback className="text-[10px]">
                        {creator.username[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {controls.open && !controls.isMobile && (
                      <span className="text-[13px] font-semibold text-primary truncate">
                        {creator.username}
                      </span>
                    )}
                  </Link>
                ))
              : null}
          </div>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
