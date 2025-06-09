interface StreamOfflineProps {
  thumbnailUrl?: string | null;
}

export const StreamOffline = ({ thumbnailUrl }: StreamOfflineProps) => {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white"
      style={
        thumbnailUrl
          ? { backgroundImage: `url(${thumbnailUrl})`, backgroundSize: 'cover' }
          : undefined
      }
    >
      Stream is offline
    </div>
  );
};
