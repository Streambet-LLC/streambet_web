import { Loader2 } from 'lucide-react';

export const LoadingBettingInterface = () => {
  return (
    <div className="flex justify-center items-center h-32">
      <div className="flex items-center gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <p>Loading betting interface...</p>
      </div>
    </div>
  );
};
