interface TabItem {
     key: string;
     label: string;
};

type TabProps = {
     className?: string;
     tabs: TabItem[];
     activeTab: string;
     setActiveTab: (activeTab: string) => void;
};

export const TabSwitch = ({
     className,
     tabs,
     activeTab,
     setActiveTab,
}: TabProps) =>
     <div className={`flex items-center justify-between w-full mb-4 ${className}`}>
          <div className="flex">
               {tabs.map((tab, idx) => {
                    const isActive = activeTab === tab.key;
                    const isFirst = idx === 0;
                    const isLast = idx === tabs.length - 1;

                    return (
                         <button
                              key={tab.key}
                              onClick={() => setActiveTab(tab.key)}
                              className={`
       px-6 py-2 text-sm font-medium
       border border-[#2D343E]
       ${isLast ? 'border-r-1' : ''}
       ${isFirst ? 'rounded-l-lg' : ''}
       ${isLast ? 'rounded-r-lg' : ''}
       ${isActive ? 'bg-[#2A2A2A] text-white' : ' text-white hover:bg-[#1f1f1f]'}
     `}
                              style={{
                                   borderColor: '#2D343E',
                              }}
                         >
                              {tab.label}
                         </button>
                    );
               })}
          </div>
     </div>;
