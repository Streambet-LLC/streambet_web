import { useIsMobile } from '@/hooks/use-mobile';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';

interface TabItem {
     key: string;
     label: string;
     tooltip?: string;
};

type TabProps = {
  className?: string;
  tabs: TabItem[];
  activeTab: string;
  setActiveTab: (activeTab: string) => void;
  /** When true, the tab bar is always horizontally scrollable (not just on mobile). */
  scrollable?: boolean;
};

export const TabSwitch = ({
  className,
  tabs,
  activeTab,
  setActiveTab,
  scrollable = false,
}: TabProps) => {
  const isMobile = useIsMobile();
  const shouldScroll = isMobile || scrollable;

  return (
    <div className={`flex items-center justify-between w-full mb-4 ${className}`}>
      <div className={`flex ${shouldScroll ? 'w-full overflow-x-auto scrollbar-hide' : ''}`}>
        {tabs.map((tab, idx) => {
          const isActive = activeTab === tab.key;
          const isFirst = idx === 0;
          const isLast = idx === tabs.length - 1;

          const button = (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                                        ${shouldScroll ? 'flex-shrink-0 whitespace-nowrap' : ''} 
                                        ${isMobile ? 'px-3 py-2 text-xs' : 'px-6 py-2 text-sm'} font-medium
                                        border border-[#2D343E]
                                        ${isLast ? 'border-r-1' : ''}
                                        ${isFirst ? 'rounded-l-lg' : ''}
                                        ${isLast ? 'rounded-r-lg' : ''}
                                        ${isActive ? 'bg-[#2A2A2A] text-white' : ' text-white hover:bg-[#1f1f1f]'}
                                        ${tab.tooltip ? 'flex items-center gap-1' : ''}
                                   `}
              style={{
                borderColor: '#2D343E',
              }}
            >
              {tab.label}
              {tab.tooltip && (
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                        className="inline-flex items-center text-muted-foreground hover:text-white transition-colors"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{tab.tooltip}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </button>
          );

          return button;
        })}
      </div>
    </div>
  );
};
