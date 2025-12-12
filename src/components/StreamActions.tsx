import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface StreamActionsProps {
  streamId: string;
  ended?: boolean;
  onDelete?: (id: string) => void;
}

export const StreamActions = ({ streamId, ended, onDelete }: StreamActionsProps) => {

  return (
    <div className="flex items-center gap-2">
      <Link to={`/stream/${streamId}`} className="flex-1">
        <Button className="w-full rounded-full border border-[#7F56D9] font-medium text-[12px]">
          {ended ? "View Results" : "Place Pick"}
        </Button>
      </Link>
    </div>
  );
};
