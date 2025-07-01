import { useEffect, useState } from 'react';
import { StreamPlayer } from '@/components/StreamPlayer';
import { CommentSection } from '@/components/CommentSection';
import { AdminBettingRoundsCard } from './AdminBettingRoundsCard';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogContent } from '@/components/ui/dialog';
import api from '@/integrations/api/client';

interface AdminStreamContentProps {
  streamId: string;
  session: any;
  betData: any;
  isUpdatingAction: boolean;
  handleOpenRound: (streamId: string) => void;
  handleLockBets: (streamId: string) => void;
  handleEndRound: (streamId: string) => void;
}

export const AdminStreamContent = ({
  streamId,
  session,
  betData,
  isUpdatingAction,
  handleOpenRound,
  handleLockBets,
  handleEndRound
}: AdminStreamContentProps) => {
  const [streamName, setStreamName] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    async function fetchStreamName() {
      try {
        const streamData = await api.admin.getStream(streamId);
        setStreamName(streamData?.data?.streamName || '');
      } catch (e) {
        setStreamName('');
      }
    }
    fetchStreamName();
  }, [streamId]);

  return (
    <div className="flex flex-col gap-8 h-full">
      {/* Back button at the very top */}
      <div className="flex items-center mb-1">
        <button type="button" className="p-1" style={{ lineHeight: 0 }}>
          <ArrowLeft size={20} color="#fff" />
        </button>
      </div>
      <div className="flex flex-row gap-8 w-full flex-1 items-stretch min-h-0" style={{minHeight:0, height:'calc(100vh - 80px)'}}>
        {/* Left: Video and betting */}
        <div className="flex-1 flex flex-col min-w-0 h-full">
          {/* Stream name */}
          <span style={{ color: '#fff', fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{streamName}</span>
          {/* View live link label below stream name */}
          <div className="flex items-center mb-2 mt-1">
            <ExternalLink size={16} className="mr-1" style={{ opacity: 0.5, color: '#fff' }} />
            <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 400, fontSize: 12 }}>
              View live link
            </span>
          </div>
          <StreamPlayer streamId={streamId} />
          <AdminBettingRoundsCard
            isUpdatingAction={isUpdatingAction}
            betData={betData}
            handleOpenRound={handleOpenRound}
            handleLockBets={handleLockBets}
            handleEndRound={handleEndRound}
          />
        </div>
        {/* Right: Chat and controls */}
        <div className="w-full max-w-md flex flex-col h-full flex-1 min-h-0">
          {/* Controls at top right of chat */}
          <div className="flex items-center justify-end gap-3 mb-2">
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
              onClick={() => {}}
            >
              End stream
            </Button>
          </div>
          <div className="flex-1 h-full min-h-0 flex flex-col">
            <CommentSection session={session} streamId={streamId} showInputOnly={false} />
          </div>
        </div>
      </div>
    </div>
  );
};
