import { useIsMobile } from "@/hooks/use-mobile";
import { Sidebar, SidebarContent, SidebarGroup, SidebarTrigger, useSidebar } from "../ui/sidebar";
import SidebarStreamCard from "./SidebarStreamCard";
import { SidebarProfileCard } from "./SidebarProfileCard";
import { Button } from "../ui/button";
import { motion } from "framer-motion";
import { 
  SidebarIcon, 
  Video,
  Trophy,
  MoreHorizontal,
  Goal,
  LayoutGrid,
  MonitorPlay,
  GemIcon,
  Flame
} from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import api from "@/integrations/api/client";
import { BettingCategory } from "@/enums";
import { useLocation } from "react-router-dom";
import { getCategoryLabel } from "@/utils/categoryHelpers";
import { useAuthContext } from "@/contexts/AuthContext";

type TopStream = {
  id: string;
  streamName: string;
  views: number;
  pfp: string;
  creator: string;
}

interface SidebarBodyProps {
  selectedCategory?: BettingCategory | null;
  setSelectedCategory?: (category: BettingCategory | null) => void;
}

export default function SidebarBody({ selectedCategory, setSelectedCategory }: SidebarBodyProps) {
  const controls = useSidebar();
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const { session } = useAuthContext();

  const { data } = useQuery({
    queryKey: ["homepage-live-creators"],
    queryFn: async () => {
      const response = await api.userStream.getTopLiveStreams();

      return response.data as TopStream[];
    }
  });

  // Icon options for each category
  const getCategoryIcon = (category: BettingCategory) => {
    const iconMap = {
      [BettingCategory.TRADING_CARDS]: LayoutGrid,
      [BettingCategory.NEOSPORTS_ALTERNATIVE]: Goal,
      [BettingCategory.SPORTS]: Trophy,
      [BettingCategory.STREAMING_COMPETITIONS]: MonitorPlay,
      // HOTFIX: Temporarily removed from UI - backend still supports this
      // [BettingCategory.EMERGING_SPORTS]: SwordsIcon,
      [BettingCategory.OTHER]: MoreHorizontal,
    };
    return iconMap[category];
  };

  return (
    <Sidebar 
      collapsible="none" 
      className={cn(
        'top-16 py-2 !transition-none bg-background flex flex-col', 
        controls.open ? "w-60" : "w-fit",
        controls.isMobile && "max-w-[50px]"
      )}
    >
      <SidebarContent className="flex flex-col h-full">
        <SidebarGroup className="flex flex-col gap-2 overflow-auto flex-1 pb-24">
          <div className="flex justify-between items-center md:mb-2">
            {controls.open && !controls.isMobile && (
              <div className='flex items-center gap-1.5 pl-2'>
                <Flame className="h-4 w-4 text-live-hot" />
                <span className='text-sm font-semibold'>Live Now</span>
              </div>
            )}
            {!controls.isMobile ?
              <Button variant="ghost" onClick={controls.toggleSidebar} className="w-8 h-8" >
                <SidebarIcon />
              </Button> :
              <div className="flex flex-col items-center mx-auto">
                <Flame className="h-4 w-4 text-live-hot" />
                <div className="text-[8px] text-muted-foreground font-bold">LIVE</div>
              </div>
            }
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
              <div className="border-t border-border my-2" />
              {controls.open && !controls.isMobile && (
                <div className='text-sm font-semibold pl-2 mb-2' id="sidebar-categories-label">Categories</div>
              )}
              <div 
                className="flex flex-col gap-2"
                role="navigation"
                aria-label="Pick categories"
                aria-labelledby={controls.open && !controls.isMobile ? "sidebar-categories-label" : undefined}
              >
                <Button
                  asChild
                  onClick={() => setSelectedCategory?.(null)}
                  className={cn(
                    "h-auto overflow-visible transition-all",
                    controls.open && !controls.isMobile 
                      ? "justify-start p-2.5 rounded-[8px] bg-sidebar-card-bg/50 border border-sidebar-card-border hover:border-primary/30 hover:bg-primary/5" 
                      : "justify-center items-center px-1 py-1 rounded-md hover:bg-sidebar-compact-hover",
                    selectedCategory === null 
                      ? "!bg-primary !text-black hover:!bg-primary !border-primary" 
                      : "text-white bg-transparent"
                  )}
                  aria-pressed={selectedCategory === null}
                  aria-label="Show all categories"
                >
                  <motion.div whileHover={controls.open && !controls.isMobile ? { x: 4 } : {}}>
                    {controls.open && !controls.isMobile ? (
                      <div className="flex items-center gap-2.5 w-full">
                        <div className="h-7 w-7 rounded-full bg-green-500/70 flex items-center justify-center flex-shrink-0">
                          <GemIcon className="h-4 w-4" />
                        </div>
                        <span className="text-[13px] font-semibold">All</span>
                      </div>
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-green-500/70 flex items-center justify-center">
                        <GemIcon className="h-4 w-4" />
                      </div>
                    )}
                  </motion.div>
                </Button>
                {Object.values(BettingCategory).map((category) => {
                  const IconComponent = getCategoryIcon(category);
                  return (
                    <Button
                      asChild
                      key={category}
                      onClick={() => setSelectedCategory?.(category)}
                      className={cn(
                        "h-auto overflow-visible transition-all",
                        controls.open && !controls.isMobile 
                          ? "justify-start text-left p-2.5 rounded-[8px] bg-sidebar-card-bg/50 border border-sidebar-card-border hover:border-primary/30 hover:bg-primary/5" 
                          : "justify-center items-center px-1 py-1 rounded-md hover:bg-sidebar-compact-hover",
                        selectedCategory === category 
                          ? "!bg-primary !text-black hover:!bg-primary !border-primary" 
                          : "text-white bg-transparent"
                      )}
                      aria-pressed={selectedCategory === category}
                      aria-label={`Filter by ${getCategoryLabel(category)}`}
                    >
                      <motion.div whileHover={controls.open && !controls.isMobile ? { x: 4 } : {}}>
                        {controls.open && !controls.isMobile ? (
                          <div className="flex items-center gap-2.5 w-full">
                            <div className="h-7 w-7 rounded-full bg-green-500/70 flex items-center justify-center flex-shrink-0">
                              <IconComponent className="h-4 w-4" />
                            </div>
                            <span className="text-[13px] font-semibold">{getCategoryLabel(category)}</span>
                          </div>
                        ) : (
                          <div className="h-7 w-7 rounded-full bg-green-500/70 flex items-center justify-center">
                            <IconComponent className="h-4 w-4" />
                          </div>
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
        <div className={cn(
          "fixed bottom-0 z-20",
          controls.open && !controls.isMobile ? "w-60" : controls.isMobile ? "w-[50px]" : "w-fit"
        )}>
          <SidebarProfileCard compact={!controls.open || controls.isMobile} />
        </div>
      )}
    </Sidebar>
  )
}