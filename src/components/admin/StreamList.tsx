import { StreamCard } from '@/components/StreamCard';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface StreamListProps {
  streams: any[];
  isAdmin?: boolean;
  onDelete?: (id: string) => void;
  onUpdate?: () => void;
  showAdminControls?: boolean;
}

export const StreamList = ({
  streams,
  isAdmin,
  onDelete,
  onUpdate,
  showAdminControls = false,
}: StreamListProps) => {
  if (!streams.length) {
    return (
      <Alert variant="default" className="bg-muted">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>No streams are currently available.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {streams.map(stream => (
        <StreamCard
          key={stream.id}
          stream={stream}
          isAdmin={isAdmin}
          onDelete={onDelete}
          onUpdate={onUpdate}
          showAdminControls={showAdminControls}
        />
      ))}
    </div>
  );
};
