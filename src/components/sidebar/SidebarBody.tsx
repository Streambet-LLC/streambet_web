import { useIsMobile } from "@/hooks/use-mobile";
import { Sidebar, SidebarContent, SidebarGroup, SidebarTrigger, useSidebar } from "../ui/sidebar";
import SidebarStreamCard from "./SidebarStreamCard";
import { Button } from "../ui/button";
import { Expand, SidebarIcon, Video } from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import api from "@/integrations/api/client";

type TopStream = {
  id: string;
  streamName: string;
  views: number;
  pfp: string;
  creator: string;
}

export default function SidebarBody() {
  const controls = useSidebar();

  const { data } = useQuery({
    queryKey: ["homepage-live-creators"],
    queryFn: async () => {
      const response = await api.userStream.getTopLiveStreams();

      return response.data as TopStream[];
    }
  });

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
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}