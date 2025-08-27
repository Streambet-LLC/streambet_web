import { useEffect, useRef, useState } from 'react';
import { StreamPlayer } from '@/components/StreamPlayer';
import { AdminBettingRoundsCard } from './AdminBettingRoundsCard';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogContent } from '@/components/ui/dialog';
import api from '@/integrations/api/client';
import { StreamStatus } from '@/enums';
import { StreamInfoForm } from './StreamInfoForm';
import { Separator } from '@/components/ui/separator';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { formatDateTime, formatDateTimeForISO, getMessage, getConnectionErrorMessage, getImageLink } from '@/utils/helper';
import Chat from '../stream/Chat';
import { useNavigate } from 'react-router-dom';
import { useBettingStatusContext } from '@/contexts/BettingStatusContext';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import Bugsnag from '@bugsnag/js';

interface AdminStreamContentProps {
  streamId: string;
  session: any;
  betData: any;
  isUpdatingAction: boolean;
  isStreamEnding: boolean;
  isBetRoundCancelling: boolean;
  handleOpenRound: (roundId: string) => void;
  handleLockBets: (roundId: string) => void;
  handleEndRound: (optionId: string) => void;
  handleEndStream: (streamId: string) => void;
  handleCancelRound: (roundId: string) => void;
  refetchBetData: VoidFunction;
  handleBack: VoidFunction;
}

type BettingTotals = {
  totalTokenBet?: number;
  totalTokenAmount?: number;
  totalCoinBet?: number;
  totalCoinAmount?: number;
};


// Helper to parse YYYY-MM-DD as local date
function parseLocalDate(dateStr) {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// Helper to check if a date is today
function isToday(date) {
  if (!date) return false;
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

// Helper to check if a time is valid for today
function isTimeValid(time, date) {
  if (!date || !time) return true;
  if (!isToday(date)) return true;
  const [hours, minutes] = time.split(':').map(Number);
  const now = new Date();
  const selectedTime = new Date(date);
  selectedTime.setHours(hours, minutes);
  return selectedTime > now;
}

// Validation function for stream settings form
function validateForm({ title, embeddedUrl, thumbnailPreviewUrl, startDateObj, startTime }, selectedThumbnailFile, isLiveStream) {
  const newErrors = {
    title: '',
    embeddedUrl: '',
    thumbnail: '',
    startDate: '',
  };
  let isValid = true;
  if (!title) {
    newErrors.title = 'Title is required';
    isValid = false;
  } else if (title.trim().length < 3 || title.trim().length > 70) {
    newErrors.title = 'Title must be 3-70 characters';
    isValid = false;
  }
  if (!embeddedUrl?.trim() || (!embeddedUrl.includes('http') && !embeddedUrl.includes('www') && !embeddedUrl.includes('kick'))) {
    newErrors.embeddedUrl = 'Embed URL is required and should be valid';
    isValid = false;
  }
  if (!selectedThumbnailFile && !thumbnailPreviewUrl) {
    newErrors.thumbnail = 'Thumbnail is required';
    isValid = false;
  }
  if (!startDateObj) {
    newErrors.startDate = 'Start date is required';
    isValid = false;
  } else if (!startTime) {
    newErrors.startDate = 'Start time is required';
    isValid = false;
  } else if (!isLiveStream && isToday(startDateObj) && !isTimeValid(startTime, startDateObj)) {
    newErrors.startDate = 'Cannot select past time for today';
    isValid = false;
  }
  return { isValid, newErrors };
}

export const AdminStreamContent = ({
  streamId,
  session,
  betData,
  isUpdatingAction,
  isBetRoundCancelling,
  isStreamEnding,
  handleOpenRound,
  handleLockBets,
  handleEndRound,
  handleEndStream,
  handleCancelRound,
  refetchBetData,
  handleBack,
}: AdminStreamContentProps) => {
  const navigate = useNavigate();
  const { isConnected: isNetworkConnected } = useNetworkStatus();
  const [streamInfo, setStreamInfo] = useState<any>(undefined);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [endStreamDialogOpen, setEndStreamDialogOpen] = useState(false);
  const [editableRounds, setEditableRounds] = useState([]);
  const [selectedThumbnailFile, setSelectedThumbnailFile] = useState<File | null>(null);
  const [bettingUpdate, setBettingUpdate] = useState<BettingTotals | null>(null);
  const [messageList, setMessageList] = useState<any>();
  const { socketConnect, handleSocketReconnection } = useBettingStatusContext();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

     // Function to setup socket event listeners
      const setupSocketEventListeners = (socketInstance: any) => {
        if (!socketInstance) return;

        socketInstance.on('scheduledStreamUpdatedToLive', () => {
          console.log('scheduledStreamUpdatedToLive admin');
            fetchStreamData();
        });

        socketInstance.on('bettingUpdate', (update: any) => {
        console.log('bettingUpdate admin', update);
          setBettingUpdate(update);
        });
    
        socketInstance.on('newMessage', (update) => {
          console.log('admin newMessage', update);
          setMessageList(update)
        });
    
        socketInstance.on('streamEnded', (update) => {
          console.log('streamEnded', update);
          navigate('/');
        });
    
        // Handle disconnection events
        socketInstance.on('disconnect', (reason: string) => {
          console.log('Socket disconnected:', reason);
          if (reason !== 'io client disconnect') {
             api.socket.joinStream(streamId, socketConnect);
            // Only attempt reconnection if it wasn't an intentional disconnect
            handleSocketReconnection();
          }
        });
    
        socketInstance.on('connect_error', (error: any) => {
          console.log('Socket connection error:', error);
           api.socket.joinStream(streamId, socketConnect);
          handleSocketReconnection();
        });
      };

useEffect(() => {
    console.log('socketConnect value',  socketConnect);
    if(socketConnect){
    api.socket.joinStream(streamId, socketConnect);
    
    // Setup event listeners
    setupSocketEventListeners(socketConnect);
    }
  
   
  }, [streamId,socketConnect]);

  useEffect (()=> () => {
      // Cleanup ping-pong intervals
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      api.socket.leaveStream(streamId, socketConnect);

      if (socketConnect) {
            socketConnect?.off('newMessage');
            socketConnect?.off('streamEnded');
            socketConnect?.off('scheduledStreamUpdatedToLive');
      }
    }, []);

    const handleOpenRoundData = (streamId: string) => {
      handleOpenRound(streamId);
      setBettingUpdate(null);
    };

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
  const { toast } = useToast();

  async function fetchStreamData() {
    try {
      const streamData = await api.admin.getStream(streamId);
      setStreamInfo(streamData?.data || undefined);
    } catch (e) {
      Bugsnag.notify(e); 
      setStreamInfo(undefined);
    }
  };

  useEffect(() => {
    fetchStreamData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamId]);

  useEffect(()=>{
    if (!isUpdatingAction) {
      fetchStreamData()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUpdatingAction])

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
    setSelectedThumbnailFile(file);
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

  const createStreamMutation = useMutation({
    mutationFn: (payload: any) => api.admin.updateStream(streamInfo.streamId, payload),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Stream updated successfully!' });
      fetchStreamData();
      setSettingsOpen(false);
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: getMessage(error) || 'Failed to create stream', variant: 'destructive' });
    },
  });

  // Add useEffect for validation
  useEffect(() => {
    if (settingsOpen) { // Only validate when settings dialog is open
      const { isValid, newErrors } = validateForm(editForm, selectedThumbnailFile, isLiveStream);
      setEditErrors(newErrors);
    }
  }, [editForm.title, editForm.embeddedUrl, editForm.thumbnailPreviewUrl, editForm.startDateObj, editForm.startTime, selectedThumbnailFile, settingsOpen]);

  const handleEditSubmit = async () => {
    // Run validation first
    const { isValid, newErrors } = validateForm(editForm, selectedThumbnailFile, isLiveStream);
    setEditErrors(newErrors);
    if (!isValid) {
      return;
    }
    let thumbnailImageUrl = streamInfo?.thumbnailUrl || '';
    if (selectedThumbnailFile?.name) {
      try {
        setIsUploading(true);
        const response = await api.auth.uploadImage(selectedThumbnailFile, 'thumbnail');
        thumbnailImageUrl = response?.data?.Key;
        setIsUploading(false);
      } catch (error) {
        Bugsnag.notify(error); 
        toast({
          variant: 'destructive',
          title: 'Error uploading stream thumbnail',
          description: getMessage(error) || 'Failed to upload thumbnail. Please try again.',
        });
        setIsUploading(false);
        return;
      }
    };
    // Implement API call to update stream info here
    const payload = {
      name: editForm.title,
      description: editForm.description,
      embeddedUrl: editForm.embeddedUrl,
      thumbnailUrl: thumbnailImageUrl,
      scheduledStartTime: formatDateTimeForISO(editForm.startDateObj, editForm.startTime),
    };

    createStreamMutation.mutate(payload);
  };

  const isStreamScheduled = streamInfo?.status === StreamStatus.SCHEDULED;
  const isLiveStream = streamInfo?.status === StreamStatus.LIVE;
  const isStreamEnded = streamInfo?.status === StreamStatus.ENDED;

   // Mutation to send a message
  const sendMessageSocket = (data: { message: string;imageURL:string;}) => {
    console.log(socketConnect, 'socket in sendMessageSocket');
    if (socketConnect && socketConnect.connected) {
      socketConnect.emit('sendChatMessage', {
        streamId: streamId,
        message: data?.message,
        imageURL:data?.imageURL,
        timestamp: new Date(),
      });
      
    } else {
      toast({
        description: getConnectionErrorMessage({ isOnline: isNetworkConnected }),
        variant: 'destructive',
      });
    }
  }



  return (
    <div className="flex flex-col gap-0 h-full px-6 md:px-12">
      {/* Back button at the very top */}
      <div className="flex items-center mb-1">
        <button type="button" className="p-1" style={{ lineHeight: 0 }}
          onClick={() => handleBack()}
        >
          <ArrowLeft size={20} color="#fff" />
        </button>
      </div>
      {/* Responsive layout: stack on mobile, row on desktop */}
      <div className="flex flex-col md:flex-row gap-4 w-full flex-1 items-stretch min-h-0" style={{ minHeight: 0, height: 'calc(100vh - 80px)' }}>
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
            {isStreamScheduled || isStreamEnded ? <div className="relative aspect-video rounded-lg overflow-hidden">
              {/* Background thumbnail with low opacity */}
              {isStreamScheduled && streamInfo?.thumbnailUrl && (
                <div 
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                  style={{
                    backgroundImage: `url(${getImageLink(encodeURIComponent(streamInfo.thumbnailUrl))})`,
                    opacity: 0.3
                  }}
                />
              )}
              {/* Fallback black background if no thumbnail */}
              {!streamInfo?.thumbnailUrl && (
                <div className="absolute inset-0 bg-black" />
              )}
              <div className={`relative z-10 px-2 w-full h-full flex items-center border border-primary justify-center text-white ${isStreamScheduled ? 'text-md' : 'text-2xl'} font-bold rounded-lg`}>
                {isStreamScheduled ? `Stream scheduled on ${formatDateTime(streamInfo?.scheduledStartTime)}.` : 'Stream has ended.'}
              </div>
            </div> : <StreamPlayer streamId={streamId} />}
          </div>
          <AdminBettingRoundsCard
            isStreamScheduled={isStreamScheduled}
            editStreamId={streamId}
            isStreamEnded={isStreamEnded}
            isUpdatingAction={isUpdatingAction}
            isBetRoundCancelling={isBetRoundCancelling}
            betData={betData}
            handleOpenRound={(streamId: string) => handleOpenRoundData(streamId)}
            handleLockBets={handleLockBets}
            handleEndRound={handleEndRound}
            handleCancelRound={handleCancelRound}
            refetchBetData={refetchBetData}
            streamInfo={streamInfo}
            bettingUpdate={bettingUpdate}
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
                        disabled={createStreamMutation.isPending || isUploading}
                      >
                        {createStreamMutation.isPending || isUploading ? 'Saving...' : 'Update'}
                      </Button>
                    </div>
                  </div>
                  <Separator className="my-4 bg-[#232323]" />
                  <StreamInfoForm
                    isLive={isLiveStream}
                    isEdit
                    initialValues={{
                      ...editForm,
                      bettingRoundStatus: streamInfo?.bettingRoundStatus || undefined,
                    }}
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
            {!isStreamScheduled&&<Button
              className="h-10 px-6 rounded-lg bg-destructive text-white font-bold text-[14px]"
              style={{ fontWeight: 700, borderRadius: '10px', background: '#FF1418', height: 40 }}
              disabled={isStreamEnding}
              onClick={() => setEndStreamDialogOpen(true)}
            >
              {isStreamEnding ? 'Ending...' : 'End stream'}
            </Button>}
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
            <div className="h-full w-full md:max-w-[320px]">
               <Chat
                  sendMessageSocket={sendMessageSocket}
                  newSocketMessage={messageList}
                  session={session}
                  streamId={streamId} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
