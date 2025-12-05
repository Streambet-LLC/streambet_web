import { useIsMobile } from "@/hooks/use-mobile";
import { Sidebar, SidebarContent, SidebarGroup, SidebarTrigger, useSidebar } from "../ui/sidebar";
import SidebarStreamCard from "./SidebarStreamCard";
import { Button } from "../ui/button";
import { 
  SidebarIcon, 
  Video,
  Trophy,
  MoreHorizontal,
  Goal,
  LayoutGrid,
  MonitorPlay,
  GemIcon,
  SwordsIcon
} from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import api from "@/integrations/api/client";
import { BettingCategory } from "@/enums";
import { useLocation } from "react-router-dom";
import { getCategoryLabel } from "@/utils/categoryHelpers";

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
        'top-16 py-2 !transition-none bg-background', 
        controls.open ? "w-60" : "w-fit",
        controls.isMobile && "max-w-[50px]"
      )}
    >
      <SidebarContent>
        <SidebarGroup className="flex flex-col gap-2 overflow-auto h-[calc(100vh-80px)]">
          <div className="flex justify-between items-center md:mb-2">
            {controls.open && !controls.isMobile && <div className='text-sm font-semibold pl-2'>Live Creators</div>}
            {!controls.isMobile ?
              <Button variant="ghost" onClick={controls.toggleSidebar} className="w-8 h-8" >
                <SidebarIcon />
              </Button> :
              <div className="flex flex-col items-center mx-auto">
                <Video className="text-muted-foreground" />
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
                className="flex flex-col gap-1"
                role="navigation"
                aria-label="Pick categories"
                aria-labelledby={controls.open && !controls.isMobile ? "sidebar-categories-label" : undefined}
              >
                <Button
                  onClick={() => setSelectedCategory?.(null)}
                  className={cn(
                    "h-auto overflow-visible",
                    controls.open && !controls.isMobile ? "justify-start p-2" : "justify-center items-center px-1 py-1",
                    selectedCategory === null ? "bg-primary text-black" : "bg-transparent text-white hover:bg-zinc-700"
                  )}
                  aria-pressed={selectedCategory === null}
                  aria-label="Show all categories"
                >
                  {controls.open && !controls.isMobile ? (
                    <div className="flex items-center gap-2 w-full">
                      <div className="h-7 w-7 rounded-full bg-green-500/70 flex items-center justify-center flex-shrink-0">
                        <GemIcon className="h-4 w-4" />
                      </div>
                      <span className="truncate">All</span>
                    </div>
                  ) : (
                    <div className="h-7 w-7 rounded-full bg-green-500/70 flex items-center justify-center">
                      <GemIcon className="h-4 w-4" />
                    </div>
                  )}
                </Button>
                {Object.values(BettingCategory).map((category) => {
                  const IconComponent = getCategoryIcon(category);
                  return (
                    <Button
                      key={category}
                      onClick={() => setSelectedCategory?.(category)}
                      className={cn(
                        "h-auto overflow-visible",
                        controls.open && !controls.isMobile ? "justify-start text-left p-2" : "justify-center items-center px-1 py-1",
                        selectedCategory === category ? "bg-primary text-black" : "bg-transparent text-white hover:bg-zinc-700"
                      )}
                      aria-pressed={selectedCategory === category}
                      aria-label={`Filter by ${getCategoryLabel(category)}`}
                    >
                      {controls.open && !controls.isMobile ? (
                        <div className="flex items-center gap-2 w-full">
                          <div className="h-7 w-7 rounded-full bg-green-500/70 flex items-center justify-center flex-shrink-0">
                            <IconComponent className="h-4 w-4" />
                          </div>
                          <span className="truncate">{getCategoryLabel(category)}</span>
                        </div>
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-green-500/70 flex items-center justify-center">
                          <IconComponent className="h-4 w-4" />
                        </div>
                      )}
                    </Button>
                  );
                })}
              </div>
            </>
          )}
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}