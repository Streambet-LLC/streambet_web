import { Button } from '@/components/ui/button';
import { Settings, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';

interface StreamActionsProps {
  streamId: string;
  onDelete?: (id: string) => void;
}

export const StreamActions = ({ streamId, onDelete }: StreamActionsProps) => {
  const { session } = useAuthContext();

  return (
    <div className="flex items-center gap-2">
      {/* {onDelete && (
        <Button variant="destructive" onClick={() => onDelete(streamId)}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      )}
      {session?.role === 'admin' && (
        <Link to={`/stream/${streamId}/settings`} className="flex-1">
          <Button variant="outline" className="w-full">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </Link>
      )} */}
      <Link to={`/stream/${streamId}`} className="flex-1">
        <Button className="w-full rounded-full border border-[#7F56D9] font-medium text-[12px]">
          View Stream
        </Button>
      </Link>
    </div>
  );
};
