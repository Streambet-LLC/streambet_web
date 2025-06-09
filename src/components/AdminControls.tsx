import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle } from 'lucide-react';

interface AdminControlsProps {
  newStreamTitle: string;
  newStreamDescription: string;
  onNewStreamTitleChange: (value: string) => void;
  onNewStreamDescriptionChange: (value: string) => void;
  onCreateStream: () => void;
}

export const AdminControls = ({
  newStreamTitle,
  newStreamDescription,
  onNewStreamTitleChange,
  onNewStreamDescriptionChange,
  onCreateStream,
}: AdminControlsProps) => {
  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-4">Admin Controls</h2>
      <div className="space-y-4">
        <div>
          <Input
            placeholder="Enter stream title..."
            value={newStreamTitle}
            onChange={e => onNewStreamTitleChange(e.target.value)}
          />
        </div>
        <div>
          <Textarea
            placeholder="Enter stream description..."
            value={newStreamDescription}
            onChange={e => onNewStreamDescriptionChange(e.target.value)}
            rows={3}
          />
        </div>
        <Button onClick={onCreateStream} className="w-full">
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Stream
        </Button>
      </div>
    </Card>
  );
};
