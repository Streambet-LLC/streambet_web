import { Alert, AlertDescription } from '@/components/ui/alert';
import { StreamCredentials } from '@/components/StreamCredentials';

export const StreamCredentialsSection = ({ streamKey }: { streamKey?: string | null }) => {
  return (
    <Alert className="bg-muted">
      <AlertDescription>
        <StreamCredentials streamKey={streamKey} />
      </AlertDescription>
    </Alert>
  );
};
