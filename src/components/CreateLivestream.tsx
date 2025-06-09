import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BettingOptionsInput } from './stream/BettingOptionsInput';
import { ThumbnailUpload } from './stream/ThumbnailUpload';
import { Textarea } from './ui/textarea';
import { useToast } from './ui/use-toast';

interface CreateLivestreamProps {
  newStreamTitle: string;
  newStreamDescription: string;
  onNewStreamTitleChange: (value: string) => void;
  onNewStreamDescriptionChange: (value: string) => void;
  onCreateStream: (bettingOptions: string[], thumbnailUrl?: string) => void;
}

export const CreateLivestream = ({
  newStreamTitle,
  newStreamDescription,
  onNewStreamTitleChange,
  onNewStreamDescriptionChange,
  onCreateStream,
}: CreateLivestreamProps) => {
  const [bettingOptions, setBettingOptions] = useState<string[]>([]);
  const [thumbnailUrl, setThumbnailUrl] = useState<string>();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission

    // Only proceed if the submit was triggered by the Create Stream button
    const target = e.target as HTMLFormElement;
    const submitButton = target.querySelector('button[type="submit"]');
    if (document.activeElement !== submitButton) {
      return;
    }

    if (!newStreamTitle.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a stream title',
        variant: 'destructive',
      });
      return;
    }

    if (bettingOptions.length < 2) {
      toast({
        title: 'Error',
        description: 'Please add at least 2 betting options',
        variant: 'destructive',
      });
      return;
    }

    onCreateStream(bettingOptions, thumbnailUrl);
    setBettingOptions([]);
    setThumbnailUrl(undefined);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        placeholder="Stream title"
        value={newStreamTitle}
        onChange={e => onNewStreamTitleChange(e.target.value)}
        required
      />

      <Textarea
        placeholder="Stream description"
        value={newStreamDescription}
        onChange={e => onNewStreamDescriptionChange(e.target.value)}
      />

      <BettingOptionsInput bettingOptions={bettingOptions} setBettingOptions={setBettingOptions} />

      <ThumbnailUpload onUploadComplete={setThumbnailUrl} />

      <Button type="submit" disabled={bettingOptions.length < 2}>
        Create Stream
      </Button>
    </form>
  );
};
