import api from '@/integrations/api/client';
import { StreamHeader } from './StreamHeader';
import { useEffect, useRef, useState } from 'react';
import { BettingRoundStatus, StreamStatus } from '@/enums';
import { getConnectionErrorMessage, getImageLink } from '@/utils/helper';
import { StreamPlayer } from '../StreamPlayer';
import { useNavigate } from 'react-router-dom';
import { WinnerAnimation } from './WinnerAnimation';
import Chat from './Chat';
import { useBettingStatusContext } from '@/contexts/BettingStatusContext';
import { CardContent } from '../ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselDots,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '../ui/carousel';
import { useToast } from '@/hooks/use-toast';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import BetCard from '../BetCard';
import { QuickPickModal } from './QuickPickModal';
import { UserBetsChart } from '../UserBetsChart';
import { useQueryClient } from '@tanstack/react-query';

interface StreamContentProps {
  streamId: string;
  session: any;
  stream: any;
  refreshKey?: number;
  refetchStream: VoidFunction;
}

export const StreamContent = ({
  streamId,
  session,
  stream,
  refreshKey,
  refetchStream,
}: StreamContentProps) => {
  const navigate = useNavigate();
  const isStreamScheduled = stream?.status === StreamStatus.SCHEDULED;
  const isStreamEnded = stream?.status === StreamStatus.ENDED;
  const isNonVideo = stream ? stream.streamType === 'non-video' : false;

  const { isConnected: isNetworkConnected } = useNetworkStatus();
  const [showWinnerAnimation, setShowWinnerAnimation] = useState(false);
  const [isUserWinner, setIsUserWinner] = useState(false);
  const [isUserLoser, setIsUserLoser] = useState(false);
  const [messageList, setMessageList] = useState<any>();
  const [carouselApi, setCarouselApi] = useState(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const { toast } = useToast();
  const [quickPickOpen, setQuickPickOpen] = useState(false);
  const [quickPickModalSettings, setQuickPickModalSettings] = useState({
    streamId: null,
    roundId: null,
    streamName: null,
    selectedOption: null,
    description: null,
  });
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const { socketConnect } = useBettingStatusContext();
  const queryClient = useQueryClient();
  const [viewerCount, setViewerCount] = useState(0);
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const [selectedRoundName, setSelectedRoundName] = useState<string | null>(null);

  const refetchStreamRef = useRef(refetchStream);
  useEffect(() => {
    refetchStreamRef.current = refetchStream;
  }, [refetchStream]);

  useEffect(() => {
    if (stream) {
      setViewerCount(stream.viewerCount || 0);
      const activeRound = stream.roundDetails.findIndex(
        round => round.status?.toLowerCase() === BettingRoundStatus.OPEN
      );

      if (activeRound > -1) {
        setActiveIdx(activeRound);
        // Set selected round for chart
        const round = stream.roundDetails[activeRound];
        setSelectedRoundId(round.roundId);
        setSelectedRoundName(round.roundName);
      } else if (stream.roundDetails.length > 0) {
        // No open round, default to first round
        const round = stream.roundDetails[0];
        setSelectedRoundId(round.roundId);
        setSelectedRoundName(round.roundName);
      }
    }
  }, [stream]);

  const handleBetEvent = (eventName: string, update: any) => {
    console.log(eventName, update);
    const roundId = update?.bet?.roundId;
    if (roundId) {
      queryClient.invalidateQueries({ queryKey: ['pick-timeline', roundId] });
    }
    refetchStreamRef.current();
  };

  const setupSocketEventListeners = (socketInstance: any) => {
    if (!socketInstance) return;

    socketInstance.on('newMessage', update => {
      console.log('newMessage', update);
      setMessageList(update);
    });

    // Handle disconnection events
    socketInstance.on('disconnect', (reason: string) => {
      console.log('Socket disconnected:', reason);
      if (reason !== 'io client disconnect') {
        // Only attempt reconnection if it wasn't an intentional disconnect
        api.socket.joinStream(streamId, socketConnect);
      }
    });

    socketInstance.on('connect_error', (error: any) => {
      console.log('Socket connection error:', error);
      api.socket.joinStream(streamId, socketConnect);
      setLoading(false);
    });

    socketInstance.on('viewerCountUpdated', count => {
      console.log('viewerCountUpdated', count);
      setViewerCount(count);
    });

    socketInstance.on('streamEnded', update => {
      toast({
        description: 'Stream has ended.',
        variant: 'default',
        duration: 10000,
      });
      refetchStream();
    });

    socketInstance.on('betPlaced', (update) => handleBetEvent('betPlaced', update));
    socketInstance.on('betEdited', (update) => handleBetEvent('betEdited', update));
    socketInstance.on('betCancelled', (update) => handleBetEvent('betCancelled', update));
    socketInstance.on('betCancelledByAdmin', (update) => handleBetEvent('betCancelledByAdmin', update));
  };

  const sendMessageSocket = (data: { message: string; imageURL: string }) => {
    if (socketConnect && socketConnect.connected) {
      socketConnect.emit('sendChatMessage', {
        streamId: streamId,
        message: data?.message,
        imageURL: data?.imageURL,
        timestamp: new Date(),
      });
    } else {
      toast({
        description: getConnectionErrorMessage({ isOnline: isNetworkConnected }),
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (socketConnect) {
      api.socket.joinStream(streamId, socketConnect);

      // Setup event listeners
      setupSocketEventListeners(socketConnect);
    }

    // Return cleanup function to remove event listeners and leave stream
    return () => {
      // Cleanup reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      // Leave the stream
      api.socket.leaveStream(streamId, socketConnect);

      // Remove all event listeners
      if (socketConnect) {
        socketConnect.off('scheduledStreamUpdatedToLive');
        socketConnect.off('bettingUpdate');
        socketConnect.off('viewerCountUpdated');
        socketConnect.off('potentialAmountUpdate');
        socketConnect.off('bettingLocked');
        socketConnect.off('winnerDeclared');
        socketConnect.off('betPlaced');
        socketConnect.off('betOpened');
        socketConnect.off('betCancelledByAdmin');
        socketConnect.off('betCancelled');
        socketConnect.off('betEdited');
        socketConnect.off('newMessage');
        socketConnect.off('roundUpdated');
        socketConnect.off('streamEnded');
        socketConnect.off('disconnect');
        socketConnect.off('connect_error');
        socketConnect.off('error');
      }
    };
  }, [streamId, socketConnect]);

  useEffect(() => {
    if (carouselApi && typeof activeIdx === 'number') {
      setTimeout(() => carouselApi.scrollTo(activeIdx), 500);
    }
  }, [carouselApi, activeIdx]);

  // Sync carousel selection with chart
  useEffect(() => {
    if (carouselApi && stream?.roundDetails) {
      const handleSelect = () => {
        const selected = carouselApi.selectedScrollSnap();
        const round = stream.roundDetails[selected];
        if (round) {
          setSelectedRoundId(round.roundId);
          setSelectedRoundName(round.roundName);
        }
      };

      carouselApi.on('select', handleSelect);

      return () => {
        carouselApi.off('select', handleSelect);
      };
    }
  }, [carouselApi, stream]);

  return (
    <div className="space-y-8">
      {/* Stream Name and Description - Full Width Above Grid */}
      <StreamHeader stream={stream} viewerCount={viewerCount} />
      <CardContent className="bg-red px-0 !p-0  w-full">
        <div className="text-2xl font-bold pl-2 mb-5">All Picks</div>
        <Carousel
          setApi={setCarouselApi}
          opts={{ align: 'center', containScroll: 'trimSnaps', slidesToScroll: 1 }}
          className="w-full"
        >
          <CarouselContent>
            {stream &&
              stream.roundDetails.map((round, idx) => {
                return (
                  <CarouselItem key={idx} className="md:basis-1/2 lg:basis-1/3">
                    <BetCard
                      {...round}
                      isForStream
                      setQuickPick={(
                        streamId,
                        roundId,
                        streamName,
                        selectedOption,
                        description
                      ) => {
                        setQuickPickModalSettings({
                          streamId,
                          streamName,
                          roundId,
                          selectedOption,
                          description,
                        });
                        setQuickPickOpen(true);
                      }}
                    />
                  </CarouselItem>
                );
              })}
          </CarouselContent>
          <div className="flex items-center justify-between pt-4">
            <CarouselPrevious
              className="relative top-0 left-0 translate-y-[unset] translate-x-[unset]"
              size="lg"
            />
            <CarouselDots className="relative" />
            <CarouselNext
              className="relative top-0 left-0 translate-y-[unset] translate-x-[unset]"
              size="lg"
            />
          </div>
        </Carousel>
      </CardContent>

      {/* Pick Pool History Chart */}
      {selectedRoundId && (
        <UserBetsChart 
          roundId={selectedRoundId}
          roundName={selectedRoundName}
        />
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6 max-h-screen">
          <div className="relative">
            {isStreamScheduled && isNonVideo ? (
              <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
                {stream?.thumbnailUrl && (
                  <img
                    src={getImageLink(stream.thumbnailUrl)}
                    alt={stream?.name}
                    className="object-cover w-full h-full"
                  />
                )}
              </div>
            ) : isStreamEnded ? (
              <div className="aspect-video rounded-lg overflow-hidden bg-black border border-primary flex items-center justify-center px-2">
                <p className="text-white text-2xl font-bold">Stream has ended.</p>
              </div>
            ) : (
              <>
                {isNonVideo ? (
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
                    {stream?.thumbnailUrl && (
                      <img
                        src={getImageLink(stream.thumbnailUrl)}
                        alt={stream?.name}
                        className="object-cover w-full h-full"
                      />
                    )}
                  </div>
                ) : (
                  <StreamPlayer showInfo streamId={streamId} />
                )}
              </>
            )}
          </div>

          {session == null && (
            <div className="bg-[#181818] p-4 rounded-[16px] flex flex-col items-center space-y-3 w-full mx-auto">
              <h2 className="text-white text-lg font-semibold">Sign in to play</h2>
              <button
                className="w-full bg-lime-400 text-black font-medium py-2 rounded-full hover:bg-lime-300 transition"
                onClick={() => navigate(`/login?redirect=/stream/${streamId}`)}
              >
                Sign in
              </button>
            </div>
          )}

          <WinnerAnimation
            show={showWinnerAnimation}
            isWinner={isUserWinner}
            isLoser={isUserLoser}
            onClose={() => setShowWinnerAnimation(false)}
          />
        </div>
        <div className="lg:col-span-1 flex flex-col h-full">
          <div className="flex-1 h-full space-y-6">
            <div className={session == null ? 'pointer-events-none blur-[1px] select-none' : ''}>
              <Chat
                isDisabled={isStreamEnded}
                sendMessageSocket={sendMessageSocket}
                newSocketMessage={messageList}
                session={session}
                streamId={streamId}
              />
            </div>
          </div>
        </div>
      </div>
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
