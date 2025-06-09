import { Button } from '@/components/ui/button';
import { ExternalLink, StopCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';

interface StreamHeaderProps {
  streamId: string;
  title: string;
  isLive: boolean;
  onEndStream: () => Promise<void>;
}

export const StreamHeader = ({ streamId, title, isLive, onEndStream }: StreamHeaderProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleEndStream = async () => {
    setIsLoading(true);
    try {
      await onEndStream();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-card rounded-lg border mb-6 sticky top-24 z-10 shadow-sm">
      <div>
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="text-muted-foreground">
          Stream Status:{' '}
          {isLive ? (
            <span className="text-green-500 font-medium">Live</span>
          ) : (
            <span className="text-gray-500 font-medium">Offline</span>
          )}
        </p>
      </div>

      <div className="flex items-center gap-4 w-full sm:w-auto">
        <Button
          variant="destructive"
          onClick={handleEndStream}
          disabled={isLoading}
          className="flex items-center bg-red-600 hover:bg-red-700 w-full sm:w-auto"
        >
          <StopCircle className="w-4 h-4 mr-2" />
          {isLoading ? 'Ending Stream...' : 'End Stream'}
        </Button>
        <Link
          to={`/stream/${streamId}`}
          className="flex items-center text-sm text-muted-foreground hover:text-primary whitespace-nowrap"
        >
          <ExternalLink className="w-4 h-4 mr-1" />
          View Live Page
        </Link>
      </div>
    </div>
  );
};
