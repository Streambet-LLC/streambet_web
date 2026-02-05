import { NonVideoHeader } from './NonVideoHeader';
import { useState, useEffect, useRef } from 'react';
import { QuickPickModal } from '../stream/QuickPickModal';
import { UserBetsChart } from '../UserBetsChart';
import BetCard from '../BetCard';
import { useBettingStatusContext } from '@/contexts/BettingStatusContext';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import api from '@/integrations/api/client';
import { getConnectionErrorMessage } from '@/utils/helper';
import Bugsnag from '@bugsnag/js';

interface RoundDetails {
  roundId: string;
  roundName: string;
  status: string;
  name: string;
  description: string;
  category: any;
  options: any[];
  totalPot: any;
  type: string;
  streamId: string;
  creator: any;
  betRoundType: any;
  [key: string]: any; // Allow additional properties
}

interface NonVideo {
  name: string;
  description?: string;
  thumbnailUrl?: string;
  creatorUsername?: string;
  roundDetails?: RoundDetails[];
  [key: string]: any;
}

interface QuickPickModalSettings {
  streamId: string | null;
  roundId: string | null;
  streamName: string | null;
  selectedOption: string | null;
  description: string | null;
}

interface NonVideoContentProps {
  nonVideoId: string;
  nonVideo: NonVideo | null;
  refetchNonVideo: VoidFunction;
}

export const NonVideoContent = ({
  nonVideoId,
  nonVideo,
  refetchNonVideo,
}: NonVideoContentProps) => {
  const { socketConnect } = useBettingStatusContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [quickPickOpen, setQuickPickOpen] = useState(false);
  const [quickPickModalSettings, setQuickPickModalSettings] = useState<QuickPickModalSettings>({
    streamId: null,
    roundId: null,
    streamName: null,
    selectedOption: null,
    description: null,
  });

  const round = nonVideo?.roundDetails?.[0];

  const refetchNonVideoRef = useRef(refetchNonVideo);
  const lastErrorToastRef = useRef<number>(0);
  
  useEffect(() => {
    refetchNonVideoRef.current = refetchNonVideo;
  }, [refetchNonVideo]);

  const handleQuickPick = (
    streamId: string | null,
    roundId: string | null,
    streamName: string | null,
    selectedOption: string | null,
    description: string | null
  ) => {
    setQuickPickModalSettings({
      streamId,
      roundId,
      streamName,
      selectedOption,
      description,
    });
    setQuickPickOpen(true);
  };

  useEffect(() => {
    const handleBetEvent = (eventName: string, update: any) => {
      if (import.meta.env.DEV) {
        console.log(eventName, update);
      }
      const roundId = update?.bet?.roundId;
      if (roundId) {
        queryClient.invalidateQueries({ queryKey: ['pick-timeline', roundId] });
      }
      refetchNonVideoRef.current();
    };

    const setupSocketEventListeners = (socketInstance: any) => {
      if (!socketInstance) return;

      socketInstance.on('betPlaced', (update) => handleBetEvent('betPlaced', update));
      socketInstance.on('betEdited', (update) => handleBetEvent('betEdited', update));
      socketInstance.on('betCancelled', (update) => handleBetEvent('betCancelled', update));
      socketInstance.on('betCancelledByAdmin', (update) => handleBetEvent('betCancelledByAdmin', update));

      // Handle disconnection events
      socketInstance.on('disconnect', (reason: string) => {
        Bugsnag.leaveBreadcrumb('Socket disconnected', { reason, nonVideoId });
        // Socket.IO will automatically attempt to reconnect with exponential backoff
        // No manual reconnection needed here
      });

      socketInstance.on('connect_error', (error: any) => {
        const now = Date.now();
        if (now - lastErrorToastRef.current > 5000) {
          lastErrorToastRef.current = now;
          
          Bugsnag.notify(new Error('Socket connection error'), (event) => {
            event.severity = 'warning';
            event.context = 'NonVideo Socket';
            event.addMetadata('socket', { 
              nonVideoId, 
              errorMessage: error?.message,
              errorType: error?.type 
            });
          });
          
          toast({
            description: getConnectionErrorMessage(),
            variant: 'destructive',
          });
        }
      });
    };

    if (socketConnect && nonVideoId) {
      api.socket.joinStream(nonVideoId, socketConnect);
      setupSocketEventListeners(socketConnect);
    }

    return () => {
      if (socketConnect) {
        api.socket.leaveStream(nonVideoId, socketConnect);
        socketConnect.off('betPlaced');
        socketConnect.off('betEdited');
        socketConnect.off('betCancelled');
        socketConnect.off('betCancelledByAdmin');
        socketConnect.off('disconnect');
        socketConnect.off('connect_error');
      }
    };
  }, [nonVideoId, socketConnect, queryClient, toast]);

  return (
    <div className="space-y-6">
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Card */}
          <NonVideoHeader nonVideo={nonVideo} />
          {/* User Bets Chart */}
          <UserBetsChart 
            roundId={round?.roundId}
            roundName={round?.roundName}
          />
        </div>
        {/* Right Column - 1/3 */}
        <div className="lg:col-span-1">
          {/* Bet Card - Clickable */}
          {round && nonVideo && (
            <div 
              onClick={() => handleQuickPick(
                nonVideoId,
                round.roundId,
                nonVideo.name,
                null,
                nonVideo.description ?? null
              )}
              className="cursor-pointer"
            >
              <BetCard 
                {...round}
                isForNonVideo
                streamId={nonVideoId}
                streamName={nonVideo.name}
                thumbnail={nonVideo.thumbnailUrl}
                setQuickPick={handleQuickPick}
              />
            </div>
          )}
        </div>
      </div>

      {/* Quick Pick Modal */}
      {quickPickOpen && (
        <QuickPickModal
          open={quickPickOpen}
          onOpenChange={setQuickPickOpen}
          streamId={quickPickModalSettings.streamId}
          roundId={quickPickModalSettings.roundId}
          streamName={quickPickModalSettings.streamName}
          selectedOption={quickPickModalSettings.selectedOption}
          description={quickPickModalSettings.description}
        />
      )}
    </div>
  );
};
