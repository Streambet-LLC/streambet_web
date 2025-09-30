import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StreamList } from './StreamList';
import { HistoricalStreamList } from './HistoricalStreamList';

interface StreamTabsProps {
  currentStreams: any[];
  pastStreams: any[];
  isAdmin?: boolean;
  onDelete?: (id: string) => void;
  onUpdate?: () => void;
}

export const StreamTabs = ({
  currentStreams,
  pastStreams,
  isAdmin,
  onDelete,
  onUpdate,
}: StreamTabsProps) => {
  // Active streams are those that are still live, regardless of betting outcome
  const activeStreams = currentStreams.filter(stream => stream.is_live !== false);

  // Completed streams are only those that have been explicitly ended (is_live = false)
  const completedStreams = [
    ...pastStreams,
    ...currentStreams.filter(stream => stream.is_live === false),
  ];

  return (
    <Tabs defaultValue="current" className="w-full">
      <TabsList>
        <TabsTrigger value="current">Current Streams</TabsTrigger>
        <TabsTrigger value="past">Stream History</TabsTrigger>
      </TabsList>

      <TabsContent value="current" className="mt-6">
        <StreamList
          streams={activeStreams}
          isAdmin={isAdmin}
          onDelete={onDelete}
          onUpdate={onUpdate}
          showAdminControls={true}
        />
      </TabsContent>

      <TabsContent value="past" className="mt-6">
        <HistoricalStreamList streams={completedStreams} />
      </TabsContent>
    </Tabs>
  );
};
