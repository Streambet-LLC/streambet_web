import { NonVideoHeader } from './NonVideoHeader';
import { useState } from 'react';
import { QuickPickModal } from '../stream/QuickPickModal';
import { UserBetsChart } from './UserBetsChart';
import BetCard from '../BetCard';
import { useNavigate } from 'react-router-dom';

interface NonVideoContentProps {
  nonVideoId: string;
  session: any;
  nonVideo: any;
}

export const NonVideoContent = ({
  nonVideoId,
  session,
  nonVideo,
}: NonVideoContentProps) => {
  const navigate = useNavigate();
  const [quickPickOpen, setQuickPickOpen] = useState(false);
  const [quickPickModalSettings, setQuickPickModalSettings] = useState({
    streamId: null,
    roundId: null,
    streamName: null,
    selectedOption: null,
    description: null,
  });

  const round = nonVideo?.roundDetails?.[0];

  const handleQuickPick = (streamId, roundId, streamName, selectedOption, description) => {
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
          <NonVideoHeader nonVideo={nonVideo} />
          {/* User Bets Chart */}
          <UserBetsChart 
            pickId={nonVideoId}
            roundId={round?.roundId}
          />
        </div>
        {/* Right Column - 1/3 */}
        <div className="lg:col-span-1">
          {/* Bet Card - Clickable */}
          {round && (
            <div 
              onClick={() => handleQuickPick(
                nonVideoId,
                round.roundId,
                nonVideo.name,
                null,
                nonVideo.description
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
