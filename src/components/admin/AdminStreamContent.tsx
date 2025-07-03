import { useEffect, useState } from 'react';
import { StreamPlayer } from '@/components/StreamPlayer';
import { CommentSection } from '@/components/CommentSection';
import { AdminBettingRoundsCard } from './AdminBettingRoundsCard';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogContent } from '@/components/ui/dialog';
import api from '@/integrations/api/client';
import { StreamStatus } from '@/enums';

interface AdminStreamContentProps {
  streamId: string;
  session: any;
  betData: any;
  isUpdatingAction: boolean;
  isStreamEnding: boolean;
  handleOpenRound: (streamId: string) => void;
  handleLockBets: (streamId: string) => void;
  handleEndRound: (streamId: string) => void;
  handleEndStream: (streamId: string) => void;
  handleBack: VoidFunction;
}

export const AdminStreamContent = ({
  streamId,
  session,
  betData,
  isUpdatingAction,
  isStreamEnding,
  handleOpenRound,
  handleLockBets,
  handleEndRound,
  handleEndStream,
  handleBack,
}: AdminStreamContentProps) => {
  const [streamInfo, setStreamInfo] = useState<any>(undefined);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [endStreamDialogOpen, setEndStreamDialogOpen] = useState(false);

  useEffect(() => {
    async function fetchStreamData() {
      try {
        const streamData = await api.admin.getStream(streamId);
        setStreamInfo(streamData?.data || undefined);
      } catch (e) {
        setStreamInfo(undefined);
      }
    }
    fetchStreamData();
  }, [streamId]);

  const isStreamEnded = streamInfo?.status === StreamStatus.ENDED;

  return (
    <div className="flex flex-col gap-0 h-full">
      {/* Back button at the very top */}
      <div className="flex items-center mb-1">
        <button type="button" className="p-1" style={{ lineHeight: 0 }}
          onClick={() => handleBack()}
        >
          <ArrowLeft size={20} color="#fff" />
        </button>
      </div>
      {/* Responsive layout: stack on mobile, row on desktop */}
      <div className="flex flex-col md:flex-row gap-8 w-full flex-1 items-stretch min-h-0" style={{minHeight:0, height:'calc(100vh - 80px)'}}>
        {/* Left: Video and betting */}
        <div className="flex-1 flex flex-col min-w-0 h-full order-1 md:order-none">
          {/* Stream name */}
          <span style={{ color: '#fff', fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{streamInfo?.streamName}</span>
          {/* View live link label below stream name */}
          <a href={streamInfo?.embeddedUrl} target='_blank'>
          <div className="flex items-center mb-5 mt-1">
            <ExternalLink size={16} className="mr-1" style={{ opacity: 0.5, color: '#fff' }} />
            <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 400, fontSize: 12 }}>
              View live link
              </span>
            </div>
            </a>
          <div className="relative">
            <StreamPlayer streamId={streamId} />
            {isStreamEnded && (
              <div className="absolute inset-0 z-20 flex items-center border border-primary justify-center bg-black text-white text-2xl font-bold rounded-lg">
                Stream has ended
              </div>
            )}
          </div>
          <AdminBettingRoundsCard
            isStreamEnded={isStreamEnded}
            isUpdatingAction={isUpdatingAction}
            betData={betData}
            handleOpenRound={handleOpenRound}
            handleLockBets={handleLockBets}
            handleEndRound={handleEndRound}
          />
        </div>
        {/* Right: Chat and controls */}
        <div className="w-full max-w-md flex flex-col flex-1 min-h-0 order-2 md:order-none md:max-w-md md:w-full">
          {/* Controls at top right of chat */}
          <div className={`flex items-center justify-end gap-3 mb-5 ${isStreamEnded ? 'invisible' : 'visible'}`}>
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                <DialogTrigger asChild>
                  <Button
                    className="h-10 px-6 rounded-lg border border-[#2D343E] bg-[#0D0D0D] text-white/75 font-medium text-[14px] transition-colors duration-150 hover:text-black"
                    style={{ fontWeight: 500, borderRadius: '10px', height: 40 }}
                    onClick={() => setSettingsOpen(true)}
                  >
                    Stream Settings
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-xs text-center">
                  <div className="py-8 text-lg font-semibold">Coming Soon!</div>
                </DialogContent>
              </Dialog>
              <Button
                className="h-10 px-6 rounded-lg bg-destructive text-white font-bold text-[14px]"
                style={{ fontWeight: 700, borderRadius: '10px', background: '#FF1418', height: 40 }}
                disabled={isStreamEnding}
                onClick={() => setEndStreamDialogOpen(true)}
              >
                {isStreamEnding ? 'Ending...' : 'End stream'}
              </Button>
          </div>
          {/* End Stream Confirmation Dialog */}
          <Dialog open={endStreamDialogOpen} onOpenChange={setEndStreamDialogOpen}>
            <DialogContent className="max-w-xs text-center border border-primary bg-[#000]">
              <div className="pt-6 text-lg font-semibold">Confirm end stream?</div>
              <div className="flex justify-center gap-4 mt-4">
                <Button
                  variant="default"
                  className="px-6 font-bold"
                  onClick={() => {
                    handleEndStream(streamId);
                    setEndStreamDialogOpen(false);
                  }}
                  disabled={isStreamEnding}
                >
                  Confirm
                </Button>
                <Button
                  variant="outline"
                  className="px-6"
                  onClick={() => setEndStreamDialogOpen(false)}
                  disabled={isStreamEnding}
                >
                  Cancel
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <div className="flex-1 min-h-0 flex flex-col h-full">
            <CommentSection session={session} streamId={streamId} showInputOnly={false} />
          </div>
        </div>
      </div>
    </div>
  );
};
