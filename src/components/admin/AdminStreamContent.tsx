import { useEffect, useState } from 'react';
import { StreamPlayer } from '@/components/StreamPlayer';
import { CommentSection } from '@/components/CommentSection';
import { AdminBettingRoundsCard } from './AdminBettingRoundsCard';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogContent } from '@/components/ui/dialog';
import api from '@/integrations/api/client';
import { StreamStatus } from '@/enums';
import { StreamInfoForm } from './StreamInfoForm';
import { BettingRounds } from './BettingRounds';
import { Separator } from '@/components/ui/separator';

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

// Helper to parse YYYY-MM-DD as local date
function parseLocalDate(dateStr) {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
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
  const [bettingSettingsOpen, setBettingSettingsOpen] = useState(false);
  const [editableRounds, setEditableRounds] = useState([]);
  const [bettingErrorRounds, setBettingErrorRounds] = useState([]);
  const [showBettingValidation, setShowBettingValidation] = useState(false);

  // Stream info form state for editing
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    embeddedUrl: '',
    thumbnailPreviewUrl: '',
    startDateObj: null,
    startTime: '',
    streamId: '',
  });
  const [editErrors, setEditErrors] = useState({
    title: '',
    embeddedUrl: '',
    thumbnail: '',
    startDate: '',
  });
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);

  // Add loading state for betting save
  const [bettingSaveLoading, setBettingSaveLoading] = useState(false);

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

  // Populate form when streamInfo changes
  useEffect(() => {
    if (streamInfo) {
      const dateObj = streamInfo.scheduledStartTime ? new Date(streamInfo.scheduledStartTime) : null;
      setEditForm({
        title: streamInfo.streamName || '',
        description: streamInfo.description || '',
        embeddedUrl: streamInfo.embeddedUrl || '',
        thumbnailPreviewUrl: streamInfo.thumbnailUrl || '',
        startDateObj: dateObj,
        startTime: dateObj
          ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
          : '',
        streamId: streamInfo.id || '',
      });
    }
  }, [streamInfo]);

  // Populate editableRounds when betData changes
  useEffect(() => {
    if (betData) {
      setEditableRounds(betData.map(r => ({ ...r })));
    }
  }, [betData]);

  // Handlers for StreamInfoForm
  const handleEditFormChange = (fields) => {
    setEditForm((prev) => ({ ...prev, ...fields }));
    // Optionally clear errors for changed fields
    setEditErrors((prev) => {
      const updated = { ...prev };
      Object.keys(fields).forEach((key) => { if (updated[key]) updated[key] = ''; });
      return updated;
    });
  };
  const handleEditFileChange = (file) => {
    // Implement file upload logic here, update thumbnailPreviewUrl and setIsUploading as needed
    // For now, just set preview URL if file is present
    if (file) {
      const url = URL.createObjectURL(file);
      setEditForm((prev) => ({ ...prev, thumbnailPreviewUrl: url }));
    }
  };
  const handleEditDeleteThumbnail = () => {
    setEditForm((prev) => ({ ...prev, thumbnailPreviewUrl: '' }));
  };
  const handleEditStartDateChange = (date) => {
    setEditForm((prev) => ({ ...prev, startDateObj: date }));
  };
  const handleEditStartTimeChange = (e) => {
    setEditForm((prev) => ({ ...prev, startTime: e.target.value }));
  };
  const handleEditSubmit = async () => {
    setLoading(true);
    // Implement API call to update stream info here
    // On success, close dialog and refetch stream info
    setSettingsOpen(false);
    setLoading(false);
  };

  const isStreamEnded = streamInfo?.status === StreamStatus.ENDED;

  return (
    <div className="flex flex-col gap-0 h-full px-6 md:px-12" style={{ overflowX: 'hidden' }}>
      {/* Back button at the very top */}
      <div className="flex items-center mb-1">
        <button type="button" className="p-1" style={{ lineHeight: 0 }}
          onClick={() => handleBack()}
        >
          <ArrowLeft size={20} color="#fff" />
        </button>
      </div>
      {/* Responsive layout: stack on mobile, row on desktop */}
      <div className="flex flex-col md:flex-row gap-4 w-full flex-1 items-stretch min-h-0" style={{minHeight:0, height:'calc(100vh - 80px)'}}>
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
            editStreamId={streamId}
            isStreamEnded={isStreamEnded}
            isUpdatingAction={isUpdatingAction}
            betData={betData}
            handleOpenRound={handleOpenRound}
            handleLockBets={handleLockBets}
            handleEndRound={handleEndRound}
          />
        </div>
        {/* Right: Chat and controls */}
        <div className="w-full max-w-md flex flex-col flex-1 min-h-0 order-2 md:order-none">
          {/* Controls above comment section, left-aligned */}
          <div className={`flex items-center gap-3 mb-6 ${isStreamEnded ? 'invisible' : 'visible'}`} style={{ justifyContent: 'flex-start' }}>
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
              <DialogContent className="max-w-2xl winner-scrollbar overflow-y-auto max-h-[90vh] p-0 border border-primary no-dialog-close">
                <div className="p-6">
                  {/* Back button at the very top */}
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex w-[94px] h-[44px] items-center gap-2 bg-[#272727] text-white px-5 py-2 rounded-lg shadow-none border-none mb-4"
                    style={{ borderRadius: '10px', fontWeight: 400 }}
                    onClick={() => setSettingsOpen(false)}
                  >
                    <ArrowLeft className="h-4 w-4 mr-0" /> Back
                  </Button>
                  {/* Header row: label, Update button */}
                  <div className="flex items-center mb-4">
                    <div className="flex-1 flex items-center justify-between">
                      <span className="text-white font-medium" style={{ fontWeight: 500, fontSize: 18 }}>Stream Settings</span>
                      <Button
                        type="button"
                        className="bg-primary text-black font-bold px-6 py-2 rounded-lg shadow-none border-none w-[120px] h-[40px]"
                        style={{ borderRadius: '10px' }}
                        onClick={handleEditSubmit}
                        disabled={loading || isUploading}
                      >
                        {loading || isUploading ? 'Saving...' : 'Update'}
                      </Button>
                    </div>
                  </div>
                  <Separator className="my-4 bg-[#232323]" />
                  <StreamInfoForm
                    initialValues={editForm}
                    errors={editErrors}
                    isUploading={isUploading}
                    loading={loading}
                    isDragging={isDragging}
                    onChange={handleEditFormChange}
                    onFileChange={handleEditFileChange}
                    onSubmit={handleEditSubmit}
                    onDeleteThumbnail={handleEditDeleteThumbnail}
                    onStartDateChange={handleEditStartDateChange}
                    onStartTimeChange={handleEditStartTimeChange}
                  />
                </div>
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
            <div className="h-full" style={{ maxWidth: 320, width: '100%' }}>
              <CommentSection session={session} streamId={streamId} showInputOnly={false} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
