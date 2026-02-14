import { NonVideoHeader } from './NonVideoHeader';
import { useState } from 'react';
import { QuickPickModal } from '../stream/QuickPickModal';
import { UserBetsChart } from '../UserBetsChart';
import BetCard from '../BetCard';
import { useBettingStatusContext } from '@/contexts/BettingStatusContext';
import { useStreamSocketEvents } from '@/hooks/useStreamSocketEvents';
import { BettingCategory, BetRoundType, CurrencyType } from '@/enums';

interface RoundOption {
  id: string;
  option: string;
  percentage: number;
  isWinner: boolean;
  userBet: {
    amount: number;
    currency: CurrencyType;
  } | null;
}

interface TotalPot {
  streamCoins: number;
  goldCoins: number;
  cadeCoins: number;
}

interface RoundDetails {
  roundId: string;
  roundName: string;
  status: string;
  name: string;
  description: string;
  category: BettingCategory;
  options: RoundOption[];
  totalPot: TotalPot;
  type: string;
  streamId: string;
  creator: string | null;
  betRoundType: BetRoundType;
  mechanism?: string;
  lockDate?: string;
  cadeCoinUsersCount?: number;
}

interface NonVideo {
  name: string;
  description?: string;
  thumbnailUrl?: string;
  creatorUsername?: string;
  roundDetails?: RoundDetails[];
  viewerCount?: number;
  status?: string;
  streamType?: string;
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
  
  const [quickPickOpen, setQuickPickOpen] = useState(false);
  const [quickPickModalSettings, setQuickPickModalSettings] = useState<QuickPickModalSettings>({
    streamId: null,
    roundId: null,
    streamName: null,
    selectedOption: null,
    description: null,
  });

  const round = nonVideo?.roundDetails?.[0];

  // Use the shared socket event handling hook
  useStreamSocketEvents({
    streamId: nonVideoId,
    socketConnect,
    onDataUpdate: refetchNonVideo,
    context: 'nonvideo',
  });

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

  return (
    <div className="space-y-6">
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Card */}
          <NonVideoHeader nonVideo={nonVideo} roundTitle={round?.name} />
          {/* User Bets Chart */}
          <UserBetsChart 
            roundId={round?.roundId}
          />
        </div>
        {/* Right Column - 1/3 */}
        <div className="lg:col-span-1">
          {/* Bet Card */}
          {round && nonVideo && (
            <BetCard 
              {...round}
              isForNonVideo
              streamId={nonVideoId}
              streamName={nonVideo.name}
              thumbnail={nonVideo.thumbnailUrl}
              setQuickPick={handleQuickPick}
            />
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
