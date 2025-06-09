import { CopyableCode } from './CopyableCode';

interface StreamCredentialsProps {
  streamKey?: string | null;
}

export const StreamCredentials = ({ streamKey }: StreamCredentialsProps) => {
  const RTMP_SERVER = 'rtmp://rtmp.livepeer.com/live';

  return (
    <div className="space-y-4">
      <CopyableCode
        label="RTMP Server:"
        value={RTMP_SERVER}
        description="Use this RTMP URL in your streaming software (e.g. OBS)"
      />

      {streamKey && (
        <CopyableCode
          label="Stream Key:"
          value={streamKey}
          description="Enter this stream key in your streaming software"
        />
      )}
    </div>
  );
};
