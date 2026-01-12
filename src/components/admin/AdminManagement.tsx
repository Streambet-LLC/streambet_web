import { useState, useRef, useEffect } from 'react';
import { SearchInput } from '@/components/ui/SearchInput';
import { UserTable } from './UserTable';
import { StreamTable } from './StreamTable';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import api, { adminAPI } from '@/integrations/api/client';
import { ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import {
  formatDateTimeForISO,
  getImageLink,
  getMessage,
  isImageSFW,
  isScheduledTimeInPast,
} from '@/utils/helper';
import { validateStreamTitle, validateStreamDescription } from '@/utils/streamValidation';
import { TabSwitch } from '../navigation/TabSwitch';
import { useIsMobile } from '@/hooks/use-mobile';
import { BettingRounds, ValidationError, validateRounds } from './BettingRounds';
import { AdminStreamContent } from './AdminStreamContent';
import { BettingRoundStatus, BettingCategory, CurrencyType, StreamStatus } from '@/enums';
import { StreamInfoForm } from './StreamInfoForm';
import { useCurrencyContext } from '@/contexts/CurrencyContext';
import Bugsnag from '@bugsnag/js';
import {
  cleanTemporaryIds,
  appendCountersToDuplicates,
  deserializeRounds,
  BettingRound,
  BettingOption,
} from '@/utils/bettingRoundsUtils';
import { cn } from '@/lib/utils';
import StreamPayoutReport from './StreamPayoutReport';
import { PrizeConfiguration } from './PrizeConfiguration';
import { PrizeRedemptions } from './PrizeRedemptions';

export const AdminManagement = ({
  session,
  streams,
  refetchStreams,
  searchStreamQuery,
  setSearchStreamQuery,
  onStreamContentChange,
  endedStreams,
  refetchEndedStreams,
  searchEndedStreamQuery,
  setSearchEndedStreamQuery,

  nonVideoStreams,
  refetchNonVideoStreams,
  searchNonVideoQuery,
  setSearchNonVideoQuery,

  endedNonVideoStreams,
  refetchEndedNonVideoStreams,
  searchEndedNonVideoQuery,
  setSearchEndedNonVideoQuery,

  promoStreams,
  refetchPromoStreams,
  searchPromoQuery,
  setSearchPromoQuery,
}) => {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('livestreams');
  const [createStep, setCreateStep] = useState<'info' | 'betting'>('info');
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [isCreateStream, setIsCreateStream] = useState(false);
  const [viewStreamId, setViewStreamId] = useState('');
  const [editStreamId, setEditStreamId] = useState('');
  const [streamAnalyticsId, setStreamAnalyticsId] = useState('');

  // Create livestream form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [embeddedUrl, setEmbeddedUrl] = useState('');
  const [creatorId, setCreatorId] = useState('');
  const [thumbnailError, setThumbnailError] = useState<string | null>(null);
  const [startDateObj, setStartDateObj] = useState<Date | null>(null);
  const [isLiveStream, setIsLiveStream] = useState(false);
  const { toast } = useToast();

  // Betting rounds state
  const [bettingRounds, setBettingRounds] = useState<BettingRound[]>([]);

  // Add error state for betting
  const [bettingErrorRounds, setBettingErrorRounds] = useState<number[]>([]);
  const [showBettingValidation, setShowBettingValidation] = useState(false);

  const [bettingValidationErrors, setBettingValidationErrors] = useState<ValidationError[]>([]);
  const { currency } = useCurrencyContext();
  const isSweepCoins = currency === CurrencyType.SWEEP_COINS;

  const tabs = [
    { key: 'livestreams', label: 'Live Streams' },
    { key: 'ended-streams', label: 'Ended Streams' },
    { key: 'non-video', label: 'Non Video' },
    { key: 'ended-non-video', label: 'Ended Non Video' },
    { key: 'promo-cards', label: 'Promo Cards' },
    { key: 'users', label: 'Users' },
    { key: 'stream-payout', label: 'Stream Payout' },
    { key: 'prize-settings', label: 'Prize Settings' },
    { key: 'prize-redemptions', label: 'Prize Redemptions' },
  ];

  const createStreamMutation = useMutation({
    mutationFn: (payload: any) =>
      editStreamId
        ? api.admin.updateStream(editStreamId, payload)
        : api.admin.createStream(payload),
    onSuccess: response => {
      if (bettingRounds.length > 0) {
        // Apply counters to duplicate option names
        const processedRounds = bettingRounds.map(round => ({
          ...round,
          options: appendCountersToDuplicates(round.options),
        }));

        // Clean temporary option IDs before sending to API
        const cleanedRounds = cleanTemporaryIds(processedRounds);

        const bettingPayload = {
          streamId: editStreamId || response?.data?.id,
          rounds: cleanedRounds,
        };
        createBetMutation.mutate(bettingPayload);
      } else {
        toast({ title: 'Success', description: 'Stream saved successfully!' });
        handleResetAll();
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: getMessage(error) || 'Failed to create event',
        variant: 'destructive',
      });
    },
  });

  const createBetMutation = useMutation({
    mutationFn: (payload: any) =>
      payload?.rounds?.[0]?.roundId
        ? api.admin.updateBettingData(payload)
        : api.admin.createBettingData(payload),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Event and Picks saved successfully!' });
      handleResetAll();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: getMessage(error) || 'Failed to create event',
        variant: 'destructive',
      });
    },
  });

  const [errors, setErrors] = useState({
    title: '',
    description: '',
    embeddedUrl: '',
    thumbnail: '',
    startDate: '',
  });
  const [startTime, setStartTime] = useState('');
  const [timezone, setTimezone] = useState<string | undefined>(undefined);
  const [eventType, setEventType] = useState({
    value: 'stream',
    label: 'Livestream',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [selectedThumbnailFile, setSelectedThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | undefined>(undefined);

  // Notify parent when stream content is being rendered
  useEffect(() => {
    if (onStreamContentChange) {
      onStreamContentChange(!!viewStreamId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewStreamId]);

  // Refs for error scrolling
  const titleRef = useRef<HTMLInputElement>(null);
  const embeddedUrlRef = useRef<HTMLInputElement>(null);
  const startDateRef = useRef<HTMLButtonElement>(null);
  const thumbnailRef = useRef<HTMLDivElement>(null);

  // Extracted validation for start date and time
  function validateStartDateTime(date: Date | null, time: string): string {
    if (!date) {
      return 'Start date is required';
    } else if (!time) {
      return 'Start time is required';
    } else if (!isLiveStream && isScheduledTimeInPast(date, time, timezone)) {
      return 'Must be scheduled for a future time';
    }
    return '';
  }

  // Remove direct validateForm calls from handlers
  const handleStartDateChange = (date: Date | null) => {
    setStartDateObj(date);
  };

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    setStartTime(newTime);
  };

  const handleTimezoneChange = (tz: string) => {
    setTimezone(tz);
  };

  function resetForm() {
    // Reset text inputs
    setTitle('');
    setDescription('');
    setEmbeddedUrl('');
    setCreatorId(null);

    // Reset dates and times
    setStartDateObj(null);
    setStartTime('');
    setTimezone(undefined);

    // Reset thumbnail related states
    setSelectedThumbnailFile(null);
    setThumbnailPreviewUrl(undefined);
    setThumbnailError(null);
    setIsDragging(false);
    setIsUploading(false);
    setIsLiveStream(false);

    // Reset event type to default
    setEventType({
      value: 'stream',
      label: 'Livestream',
    });

    // Reset betting rounds
    setBettingRounds([]);

    setValidationStarted(false);

    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Reset all errors
    setErrors({
      title: '',
      description: '',
      embeddedUrl: '',
      thumbnail: '',
      startDate: '',
    });
  }

  function scrollToFirstError() {
    if (errors.title && titleRef.current) {
      titleRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (errors.embeddedUrl && embeddedUrlRef.current) {
      embeddedUrlRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (errors.thumbnail && thumbnailRef.current) {
      thumbnailRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (errors.startDate && startDateRef.current) {
      startDateRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function formatDateTimeForDisplay(date: Date | null, time: string): string {
    if (!date) return 'Select date';
    const dateStr = format(date, 'MM/dd/yyyy');
    if (!time) return dateStr;

    // Convert 24-hour format to 12-hour format
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const timeStr = `${displayHour}:${minutes} ${ampm}`;

    return `${dateStr} ${timeStr}`;
  }

  const [validationStarted, setValidationStarted] = useState(false);

  function validateForm() {
    const newErrors = {
      title: '',
      description: '',
      embeddedUrl: '',
      thumbnail: '',
      startDate: '',
    };

    let isValid = true;

    // Validate title
    const titleError = validateStreamTitle(title);
    if (titleError) {
      newErrors.title = titleError;
      isValid = false;
    }

    // Validate description
    const descriptionError = validateStreamDescription(description);
    if (descriptionError) {
      newErrors.description = descriptionError;
      isValid = false;
    }

    if (eventType.value === 'stream') {
      if (
        !embeddedUrl?.trim() ||
        (!embeddedUrl?.includes('http') &&
          !embeddedUrl.includes('www') &&
          !embeddedUrl.includes('kick'))
      ) {
        newErrors.embeddedUrl = 'Embed URL is required and should be valid';
        isValid = false;
      }
    }

    // Validate start date/time only for livestreams
    if (eventType.value === 'stream') {
      const dateTimeError = validateStartDateTime(startDateObj, startTime);
      if (dateTimeError) {
        newErrors.startDate = dateTimeError;
        isValid = false;
      }
    }

    if (!selectedThumbnailFile && !thumbnailPreviewUrl) {
      newErrors.thumbnail = 'Thumbnail is required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  }

  const { data: adminAnalytics, isFetching: isAdminAnalyticsLoading } = useQuery({
    queryKey: ['adminAnalytics'],
    queryFn: async () => {
      const response = await adminAPI.getAdminAnalyticsData();
      return response?.data;
    },
  });

  const {
    data: betStreamData,
    isFetching: isBetStreamLoading,
    refetch: refetchBetStreamData,
  } = useQuery({
    queryKey: ['adminBetStreamData'],
    queryFn: async () => {
      const streamId = viewStreamId || editStreamId;
      if (streamId) {
        const response = await adminAPI.getCardCadeData(streamId);
        return response?.data;
      }
      return undefined;
    },
    enabled: false,
  });

  useEffect(() => {
    refetchBetStreamData();
  }, [viewStreamId, editStreamId, refetchBetStreamData]);

  const {
    data: streamAnalytics,
    isFetching: isStreamAnalyticsLoading,
    refetch: refetchStreamAnalytics,
  } = useQuery({
    queryKey: ['adminStreamAnalytics'],
    queryFn: async () => {
      if (streamAnalyticsId) {
        const response = await adminAPI.getStreamAnalytics(streamAnalyticsId);
        return response?.data;
      }
      return undefined;
    },
    enabled: false,
  });

  useEffect(() => {
    refetchStreamAnalytics();
  }, [streamAnalyticsId, refetchStreamAnalytics]);

  const { isPending: isBetStatusUpdating, mutateAsync: betStatusUpdate } = useMutation({
    mutationFn: ({ streamId, payload }: { streamId: string; payload: any }) =>
      api.admin.updateBetStatus(streamId, payload),
    onSuccess: () => {
      refetchBetStreamData();
    },
    onError: (error: any) => {
      const errorMessage: string = getMessage(error) || 'Failed to update pick';
      toast({
        title: errorMessage?.toLowerCase()?.includes('cannot lock')
          ? 'Not able to lock round'
          : `Error in updating the round status`,
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  const { isPending: isDeclareWinnerUpdating, mutateAsync: betDeclareWinner } = useMutation({
    mutationFn: (payload: any) => api.admin.declareWinner(payload),
    onSuccess: () => {
      refetchBetStreamData();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: getMessage(error) || 'Failed to declare the winner',
        variant: 'destructive',
      });
    },
  });

  const { isPending: isBetRoundCancelling, mutateAsync: cancelBetRound } = useMutation({
    mutationFn: (payload: any) => api.admin.cancelBetRound(payload),
    onSuccess: () => {
      refetchBetStreamData();
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to cancel round',
        description: getMessage(error) || 'Failed to update bet',
        variant: 'destructive',
      });
    },
  });

  const { isPending: isStreamEnding, mutateAsync: initiateEndStream } = useMutation({
    mutationFn: (streamId: string) => api.admin.endStream(streamId),
    onSuccess: () => {
      toast({
        title: 'Stream ended',
        description: 'Stream has successfully ended',
      });
      handleResetAll();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: getMessage(error) || 'Failed to end stream',
        variant: 'destructive',
      });
    },
  });

  const {
    data: streamData,
    isFetching: isStreamLoading,
    refetch: refetchStreamData,
  } = useQuery({
    queryKey: ['adminStreamData'],
    queryFn: async () => {
      if (editStreamId) {
        const response = await adminAPI.getStream(editStreamId);
        return response?.data;
      }
      return undefined;
    },
    enabled: false,
  });

  useEffect(() => {
    refetchStreamData();
  }, [editStreamId, refetchStreamData]);

  const handleOpenRound = (streamId: string) => {
    betStatusUpdate({ streamId, payload: { newStatus: BettingRoundStatus.OPEN } });
  };

  const handleLockBets = (streamId: string) => {
    betStatusUpdate({ streamId, payload: { newStatus: BettingRoundStatus.LOCKED } });
  };

  const handleEndRound = (optionId: string) => {
    betDeclareWinner(optionId);
  };

  const handleCancelRound = (roundId: string) => {
    cancelBetRound(roundId);
  };

  useEffect(() => {
    if (!isStreamLoading && streamData) {
      setTitle(streamData?.streamName);
      setDescription(streamData?.description);
      setEmbeddedUrl(streamData?.embeddedUrl);
      setCreatorId(streamData.creatorId);

      // Set event type based on stream data
      if (streamData.streamType) {
        let label = 'Non Video';
        if (streamData.streamType === 'stream') {
          label = 'Livestream';
        } else if (streamData.streamType === 'promo') {
          label = 'Promo Card';
        }
        setEventType({
          value: streamData.streamType,
          label,
        });
      }

      // Auto-populate first round with 2 options if no rounds exist
      const rounds = streamData?.rounds || [];
      if (rounds.length === 0) {
        setBettingRounds([
          {
            roundName: 'First round',
            lockDate: null,
            lockTime: undefined,
            lockTimezone: undefined,
            options: [{ option: 'Option 1' }, { option: 'Option 2' }],
          },
        ]);
      } else {
        setBettingRounds(deserializeRounds(rounds));
      }

      setIsLiveStream(streamData?.status === StreamStatus.LIVE);

      // Set thumbnail if available
      if (streamData.thumbnailUrl) {
        setThumbnailPreviewUrl(getImageLink(streamData.thumbnailUrl));
      }

      // Set start date and time if scheduledStartTime is available
      if (streamData.scheduledStartTime) {
        const date = new Date(streamData.scheduledStartTime);
        setStartDateObj(date);

        // Extract time in HH:mm format
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        setStartTime(`${hours}:${minutes}`);
      }
    }
  }, [streamData, isStreamLoading]);

  function handleUploadClick() {
    if (fileInputRef.current) fileInputRef.current.click();
  }
  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) handleFile(file);
  }
  async function handleFile(file: File) {
    // Validate file type
    setErrors({
      ...errors,
      thumbnail: '',
      title: '',
      embeddedUrl: '',
      startDate: '',
    });

    if (!file.type.startsWith('image/')) {
      setErrors({
        ...errors,
        thumbnail: 'Please upload an image file',
        title: '',
        embeddedUrl: '',
        startDate: '',
      });
      return;
    }
    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setErrors({
        ...errors,
        thumbnail: 'Please upload an image smaller than 5MB',
        title: '',
        embeddedUrl: '',
        startDate: '',
      });
      return;
    }
    // Validate image dimensions
    const isValid = await validateImage(file);
    if (!isValid) return;

    setIsUploading(true);
    const isSfw = await isImageSFW(URL.createObjectURL(file));
    setIsUploading(false);

    if (!isSfw) {
      setErrors({
        ...errors,
        thumbnail:
          'Sorry, but the chosen image might be inappropriate. Please choose a different one.',
        title: '',
        embeddedUrl: '',
        startDate: '',
      });
      return;
    }

    setSelectedThumbnailFile(file);
    setThumbnailPreviewUrl(URL.createObjectURL(file));
    setErrors(errors => ({ ...errors, thumbnail: '' }));
  }

  async function validateImage(file: File): Promise<boolean> {
    return new Promise(resolve => {
      const img = new window.Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        const isValidSize = img.width <= 1920 && img.height <= 1080;
        if (!isValidSize) {
          setErrors(errors => ({ ...errors, thumbnail: 'Image must be maximum 1920x1080px' }));
          resolve(false);
        } else {
          resolve(true);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        setErrors(errors => ({ ...errors, thumbnail: 'Failed to load image for validation' }));
        resolve(false);
      };
    });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }
  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }
  function handleDeleteThumbnail() {
    setSelectedThumbnailFile(null);
    setThumbnailPreviewUrl(undefined);
    setErrors({
      ...errors,
      thumbnail: '',
      title: '',
      embeddedUrl: '',
      startDate: '',
    });
    // Clear the file input to allow reselection
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function handleCreateStream() {
    setValidationStarted(true);

    // Validation: check for rounds with no options
    const errorIndices = bettingRounds
      .map((round, idx) => (round.options.length < 2 ? idx : -1))
      .filter(idx => idx !== -1);

    if (errorIndices.length > 0) {
      setBettingErrorRounds(errorIndices);
      setShowBettingValidation(true);
      toast({
        title: 'Validation Error',
        description:
          'Each round must have at least two options. Please add options to all rounds before saving.',
        variant: 'destructive',
      });
      // Scroll to first error
      setTimeout(() => {
        const el = document.querySelector('[data-round-index="' + errorIndices[0] + '"]');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 500);
      return;
    }

    // Validate for duplicate round/option names and auto-lock dates
    const validationErrors = validateRounds(bettingRounds);
    setBettingValidationErrors(validationErrors);
    setShowBettingValidation(true);
    if (validationErrors.length > 0) {
      // Scroll to first validation error
      setTimeout(() => {
        const first = validationErrors[0];
        const el = document.querySelector('[data-round-index="' + first.roundIndex + '"]');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 500);
      toast({
        title: 'Validation Error',
        description: validationErrors[0].message,
        variant: 'destructive',
      });
      return;
    }

    let thumbnailImageUrl = streamData?.thumbnailUrl || '';

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
    }

    // Only format and validate scheduledStartTime for livestreams
    let scheduledStartTime;
    if (eventType.value === 'stream') {
      scheduledStartTime = formatDateTimeForISO(startDateObj, startTime, timezone);

      if (!scheduledStartTime && startDateObj && startTime) {
        toast({
          variant: 'destructive',
          title: 'Invalid Timezone',
          description:
            'The selected timezone could not be processed. Please try a different timezone or contact support.',
        });
        return;
      }
    }

    const payload = {
      name: title,
      description,
      embeddedUrl,
      thumbnailUrl: thumbnailImageUrl,
      ...(eventType.value === 'stream' && { scheduledStartTime }),
      creatorId,
      ...(!editStreamId && { type: eventType.value }),
    };

    console.log(payload);

    createStreamMutation.mutate(payload);
  }

  const handleResetAll = () => {
    setIsCreateStream(false);
    setViewStreamId('');
    setEditStreamId('');
    setStreamAnalyticsId('');
    setCreateStep('info');
    resetForm();
    setBettingRounds([]);
  };

  // New: handle next step from info to betting
  const handleNextStep = async () => {
    if (!validateForm()) {
      setTimeout(() => scrollToFirstError(), 100);
      toast({
        title: 'Form error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    // Promo cards don't need betting rounds - create directly
    if (eventType.value === 'promo') {
      await handleCreateStream();
      return;
    }

    // Auto-populate first round with 2 options if empty
    if (bettingRounds.length === 0) {
      const firstRound: BettingRound = {
        roundName: eventType.value === 'non-video' ? title : 'First round',
        options: [{ option: 'Option 1' }, { option: 'Option 2' }],
      };
      setBettingRounds([firstRound]);
    }

    setCreateStep('betting');
  };

  // New: handle back from betting to info
  const handleBackStep = () => {
    setCreateStep('info');
    setBettingValidationErrors([]);
    setBettingErrorRounds([]);
    setShowBettingValidation(false);
  };

  // Wrap setBettingRounds to auto-clear errors if all rounds have at least one option
  const handleRoundsChange = (newRounds: BettingRound[]) => {
    setBettingRounds(newRounds);
    // If all rounds have at least 2 options, clear errors
    if (newRounds.every(r => r.options.length >= 2)) {
      setBettingErrorRounds([]);
      setShowBettingValidation(false);
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [nonVideoPage, setNonVideoPage] = useState(1);
  const [endStreamCurrentPage, setEndStreamCurrentPage] = useState(1);
  const [endedNonVideoCurrentPage, setEndedNonVideoCurrentPage] = useState(1);
  const [promoPage, setPromoPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchStreamQuery]);

  useEffect(() => {
    setEndStreamCurrentPage(1);
  }, [searchEndedStreamQuery]);

  useEffect(() => {
    setNonVideoPage(1);
  }, [searchNonVideoQuery]);

  useEffect(() => {
    setEndedNonVideoCurrentPage(1);
  }, [searchEndedNonVideoQuery]);

  useEffect(() => {
    setPromoPage(1);
  }, [searchPromoQuery]);

  // Add useEffect for validation
  useEffect(() => {
    if (validationStarted) {
      validateForm();
    }
  }, [title, embeddedUrl, startDateObj, startTime, selectedThumbnailFile, thumbnailPreviewUrl]);

  const addNewRound = () => {
    const roundNumber = bettingRounds.length + 1;
    const roundNames = [
      'First',
      'Second',
      'Third',
      'Fourth',
      'Fifth',
      'Sixth',
      'Seventh',
      'Eighth',
      'Ninth',
      'Tenth',
    ];
    const defaultName =
      roundNumber <= roundNames.length
        ? `${roundNames[roundNumber - 1]} round`
        : `Round ${roundNumber}`;

    const newRound: BettingRound = {
      roundName: defaultName,
      options: [{ option: 'Option 1' }, { option: 'Option 2' }],
    };

    handleRoundsChange([...bettingRounds, newRound]);
  };

  return (
    <div className="space-y-6">
      {isStreamLoading ? (
        <div className="flex items-center justify-center min-h-[60vh] w-full">
          <Loader2 className="animate-spin h-12 w-12 text-primary" />
        </div>
      ) : streamAnalyticsId ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] w-full px-2 sm:px-0">
          <div className="flex flex-col rounded-2xl w-full max-w-xl bg-[#0D0D0D] border-none shadow-lg px-3 sm:px-6 pt-4 sm:pt-[16px] pb-8 sm:pb-[48px]">
            {/* Header */}
            <div className="mb-4 sm:mb-6">
              <Button
                type="button"
                variant="secondary"
                className="flex w-[94px] h-[44px] items-center gap-2 bg-[#272727] text-white px-5 py-2 rounded-lg shadow-none border-none text-sm sm:text-base"
                style={{ borderRadius: '10px', fontWeight: 400 }}
                disabled={
                  createStreamMutation.isPending || createBetMutation.isPending || isUploading
                }
                onClick={() => setStreamAnalyticsId('')}
              >
                <ArrowLeft className="h-4 w-4 mr-0" /> Back
              </Button>
            </div>
            <span className="text-base sm:text-lg text-white font-[500]">
              My Live Stream Analytics
            </span>
            <Separator className="bg-[#222] my-4 sm:my-5" />
            {/* Body */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {/* Card 1 */}
              <div className="rounded-xl bg-[#161616] h-[100px] sm:h-[114px] p-4 sm:p-6 flex flex-col justify-between">
                <span
                  className="font-medium text-[13px] sm:text-[14px] text-white/75"
                  style={{ fontWeight: 500, color: 'rgba(255,255,255,0.75)' }}
                >
                  Pot Value
                </span>
                <span
                  className="font-semibold text-[20px] sm:text-[24px] text-white"
                  style={{ fontWeight: 600, color: 'rgba(255,255,255,1)' }}
                >
                  {isStreamAnalyticsLoading ? (
                    <svg
                      className="animate-spin h-8 w-8 text-primary"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      ></path>
                    </svg>
                  ) : (
                    (
                      (isSweepCoins
                        ? streamAnalytics?.totalBetValue?.sweepCoins
                        : streamAnalytics?.totalBetValue?.goldCoins) || 0
                    )?.toLocaleString('en-US')
                  )}
                </span>
              </div>
              {/* Card 2 */}
              <div className="rounded-xl bg-[#161616] h-[100px] sm:h-[114px] p-4 sm:p-6 flex flex-col justify-between">
                <span
                  className="font-medium text-[13px] sm:text-[14px] text-white/75"
                  style={{ fontWeight: 500, color: 'rgba(255,255,255,0.75)' }}
                >
                  Platform Vig
                </span>
                <span
                  className="font-semibold text-[20px] sm:text-[24px] text-white"
                  style={{ fontWeight: 600, color: 'rgba(255,255,255,1)' }}
                >
                  {isStreamAnalyticsLoading ? (
                    <svg
                      className="animate-spin h-8 w-8 text-primary"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      ></path>
                    </svg>
                  ) : (
                    streamAnalytics?.platformVig
                  )}
                </span>
              </div>
              {/* Card 3 */}
              <div className="rounded-xl bg-[#161616] h-[100px] sm:h-[114px] p-4 sm:p-6 flex flex-col justify-between">
                <span
                  className="font-medium text-[13px] sm:text-[14px] text-white/75"
                  style={{ fontWeight: 500, color: 'rgba(255,255,255,0.75)' }}
                >
                  Users
                </span>
                <span
                  className="font-semibold text-[20px] sm:text-[24px] text-white"
                  style={{ fontWeight: 600, color: 'rgba(255,255,255,1)' }}
                >
                  {isStreamAnalyticsLoading ? (
                    <svg
                      className="animate-spin h-8 w-8 text-primary"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      ></path>
                    </svg>
                  ) : (
                    (streamAnalytics?.totalBetPlacedUsers || 0)?.toLocaleString('en-US')
                  )}
                </span>
              </div>
              {/* Card 4 */}
              <div className="rounded-xl bg-[#161616] h-[100px] sm:h-[114px] p-4 sm:p-6 flex flex-col justify-between">
                <span
                  className="font-medium text-[13px] sm:text-[14px] text-white/75"
                  style={{ fontWeight: 500, color: 'rgba(255,255,255,0.75)' }}
                >
                  Time Streaming
                </span>
                <span
                  className="font-semibold text-[20px] sm:text-[24px] text-white"
                  style={{ fontWeight: 600, color: 'rgba(255,255,255,1)' }}
                >
                  {isStreamAnalyticsLoading ? (
                    <svg
                      className="animate-spin h-8 w-8 text-primary"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      ></path>
                    </svg>
                  ) : (
                    streamAnalytics?.totalStreamTime
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : isCreateStream || editStreamId ? (
        <div className="flex justify-center items-center min-h-[60vh]">
          <Card
            className={cn(
              'w-full bg-[#0D0D0D] p-2 rounded-2xl shadow-lg border-none',
              createStep === 'info' && 'max-w-xl'
            )}
          >
            <CardContent className="p-4 !pt-2 sm:p-6">
              {/* Back button only at top */}
              <div className="mb-6">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex w-[94px] h-[44px] items-center gap-2 bg-[#272727] text-white px-5 py-2 rounded-lg shadow-none border-none"
                  style={{ borderRadius: '10px', fontWeight: 400 }}
                  disabled={
                    createStreamMutation.isPending || createBetMutation.isPending || isUploading
                  }
                  onClick={() => {
                    if (createStep === 'betting') {
                      handleBackStep();
                    } else {
                      handleResetAll();
                    }
                  }}
                >
                  <ArrowLeft className="h-4 w-4 mr-0" /> Back
                </Button>
              </div>
              {/* Label and Create button in same row */}
              <div className="flex flex-row items-center justify-between mb-6">
                <span className="text-lg text-white font-light">
                  {createStep === 'betting'
                    ? editStreamId
                      ? 'Edit your Picks options'
                      : 'Create your Picks options'
                    : editStreamId
                      ? 'Manage Event'
                      : 'Create Event'}
                </span>
                {/* Step 1: Next button, Step 2: Submit button */}
                {createStep === 'info' ? (
                  <Button
                    type="button"
                    className="bg-primary text-black font-bold px-6 py-2 rounded-lg shadow-none border-none w-[79px] h-[40px]"
                    style={{ borderRadius: '10px' }}
                    onClick={async e => {
                      e.preventDefault();
                      setValidationStarted(true);
                      await handleNextStep();
                    }}
                    disabled={
                      createStreamMutation.isPending || createBetMutation.isPending || isUploading
                    }
                  >
                    Next
                  </Button>
                ) : (
                  (eventType.value === 'stream' || bettingRounds.length === 0) && (
                    <Button
                      type="button"
                      className="bg-[#272727] text-white font-medium px-3 rounded-lg border-none text-sm flex items-center justify-center hover:bg-[#232323] focus:bg-[#232323] active:bg-[#1a1a1a] transition-colors"
                      style={{ height: 44, fontSize: '16px', fontWeight: 500 }}
                      disabled={
                        createStreamMutation.isPending || createBetMutation.isPending || isUploading
                      }
                      onClick={addNewRound}
                    >
                      + New round
                    </Button>
                  )
                )}
              </div>
              <Separator className="my-4 bg-[#232323]" />
              {/* Form fields */}
              <form className="space-y-8" onSubmit={e => e.preventDefault()}>
                {/* Step 1: Info */}
                {createStep === 'info' && (
                  <StreamInfoForm
                    isLive={isLiveStream}
                    isEdit={!!editStreamId}
                    initialValues={{
                      title,
                      description,
                      embeddedUrl,
                      thumbnailPreviewUrl,
                      startDateObj,
                      startTime,
                      timezone,
                      streamId: editStreamId || undefined,
                      bettingRoundStatus: streamData?.bettingRoundStatus || undefined,
                      creatorId,
                      eventType,
                    }}
                    errors={errors}
                    isUploading={isUploading}
                    loading={createStreamMutation.isPending || createBetMutation.isPending}
                    isDragging={isDragging}
                    onChange={fields => {
                      if (!validationStarted) {
                        if ('title' in fields) setTitle(fields.title ?? '');
                        if ('description' in fields) setDescription(fields.description ?? '');
                        if ('embeddedUrl' in fields) setEmbeddedUrl(fields.embeddedUrl ?? '');
                        if ('startDateObj' in fields) {
                          setStartDateObj(fields.startDateObj ?? null);
                          if (fields.startDateObj && !startTime) {
                            setStartTime('00:00');
                          }
                        }
                        if ('startTime' in fields) setStartTime(fields.startTime ?? '');
                        if ('creatorId' in fields) {
                          setCreatorId(fields.creatorId);
                        }
                        return;
                      }
                      const newErrors = { ...errors };
                      if ('title' in fields) {
                        setTitle(fields.title ?? '');
                        newErrors.title = validateStreamTitle(fields.title ?? '') || '';
                      }
                      if ('description' in fields) {
                        setDescription(fields.description ?? '');
                        newErrors.description =
                          validateStreamDescription(fields.description ?? '') || '';
                      }
                      if ('creatorId' in fields) {
                        setCreatorId(fields.creatorId ?? '');
                        // No validation for description
                      }
                      if ('embeddedUrl' in fields) {
                        setEmbeddedUrl(fields.embeddedUrl ?? '');
                        const value = fields.embeddedUrl ?? '';
                        if (
                          !value.trim() ||
                          (!value.includes('http') &&
                            !value.includes('www') &&
                            !value.includes('kick'))
                        )
                          newErrors.embeddedUrl = 'Embed URL is required and should be valid';
                        else newErrors.embeddedUrl = '';
                      }
                      if ('startDateObj' in fields || 'startTime' in fields) {
                        const date = 'startDateObj' in fields ? fields.startDateObj : startDateObj;
                        const time = 'startTime' in fields ? fields.startTime : startTime;

                        if ('startDateObj' in fields) {
                          setStartDateObj(date);
                          if (date && !time) {
                            setStartTime('00:00');
                          }
                        }
                        if ('startTime' in fields) {
                          setStartTime(time);
                        }

                        // Only validate for livestreams
                        if (eventType.value === 'stream') {
                          newErrors.startDate = validateStartDateTime(date, time);
                        }
                      }
                      setErrors(newErrors);
                    }}
                    onFileChange={file =>
                      handleFileChange({ target: { files: file ? [file] : [] } } as any)
                    }
                    onSubmit={async () => {
                      setValidationStarted(true);
                      await handleNextStep();
                    }}
                    onDeleteThumbnail={handleDeleteThumbnail}
                    onStartDateChange={handleStartDateChange}
                    onStartTimeChange={handleStartTimeChange}
                    onTimezoneOffsetChange={handleTimezoneChange}
                    onChangeEventType={val => setEventType(val)}
                  />
                )}
                {/* Step 2: Betting */}
                {createStep === 'betting' && (
                  <BettingRounds
                    eventType={eventType.value}
                    isSaving={
                      createStreamMutation.isPending || createBetMutation.isPending || isUploading
                    }
                    statusMap={
                      betStreamData?.data?.rounds
                        ? Object.fromEntries(
                            betStreamData?.data?.rounds.map(r => [r?.roundId, r?.status])
                          )
                        : {}
                    }
                    rounds={bettingRounds}
                    onRoundsChange={handleRoundsChange}
                    onErrorRoundsChange={errorRounds => setBettingErrorRounds(errorRounds)}
                    editStreamId={editStreamId}
                    showValidationErrors={showBettingValidation}
                    errorRounds={bettingErrorRounds}
                    validationErrors={bettingValidationErrors}
                    createStream={true}
                    handleCreateStream={handleCreateStream}
                    betCardInfo={{
                      thumbnail: thumbnailPreviewUrl,
                      description,
                      creator: session.username,
                      streamName: title,
                      type: eventType.value,
                    }}
                  />
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      ) : viewStreamId ? (
        <AdminStreamContent
          streamId={viewStreamId}
          session={session}
          betData={betStreamData?.data?.rounds}
          isStreamEnding={isStreamEnding}
          isBetRoundCancelling={isBetRoundCancelling}
          isUpdatingAction={isBetStatusUpdating || isDeclareWinnerUpdating || isBetStreamLoading}
          handleOpenRound={handleOpenRound}
          handleLockBets={handleLockBets}
          handleEndRound={handleEndRound}
          handleCancelRound={handleCancelRound}
          handleEndStream={initiateEndStream}
          refetchBetData={refetchBetStreamData}
          handleBack={() => handleResetAll()}
        />
      ) : (
        <>
          {/* Top bar (tabs, search, create button) only when not creating stream */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[24px] mb-12">
            {/* Users Card */}
            <div
              className="bg-[rgba(22,22,22,1)] rounded-xl flex flex-col justify-center"
              style={{ minHeight: 109, height: 109, padding: 24 }}
            >
              <span
                style={{
                  color: 'rgba(255,255,255,0.75)',
                  fontWeight: 500,
                  fontSize: 14,
                  textAlign: 'left',
                }}
              >
                Users
              </span>
              {isAdminAnalyticsLoading ? (
                <svg
                  className="animate-spin h-8 w-8 text-primary"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  ></path>
                </svg>
              ) : (
                <span
                  style={{
                    color: 'rgba(255,255,255,1)',
                    fontWeight: 600,
                    fontSize: 24,
                    textAlign: 'left',
                  }}
                >
                  {adminAnalytics?.totalUsers}
                </span>
              )}
            </div>
            {/* Active Streams Card */}
            <div
              className="bg-[rgba(22,22,22,1)] rounded-xl flex flex-col justify-center"
              style={{ minHeight: 109, height: 109, padding: 24 }}
            >
              <span
                style={{
                  color: 'rgba(255,255,255,0.75)',
                  fontWeight: 500,
                  fontSize: 14,
                  textAlign: 'left',
                }}
              >
                Active Streams
              </span>
              {isAdminAnalyticsLoading ? (
                <svg
                  className="animate-spin h-8 w-8 text-primary"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  ></path>
                </svg>
              ) : (
                <span
                  style={{
                    color: 'rgba(255,255,255,1)',
                    fontWeight: 600,
                    fontSize: 24,
                    textAlign: 'left',
                  }}
                >
                  {adminAnalytics?.totalLiveStreams}
                </span>
              )}
            </div>
            {/* Active Bets Card */}
            <div
              className="bg-[rgba(22,22,22,1)] rounded-xl flex flex-col justify-center"
              style={{ minHeight: 109, height: 109, padding: 24 }}
            >
              <span
                style={{
                  color: 'rgba(255,255,255,0.75)',
                  fontWeight: 500,
                  fontSize: 14,
                  textAlign: 'left',
                }}
              >
                Active Picks
              </span>
              {isAdminAnalyticsLoading ? (
                <svg
                  className="animate-spin h-8 w-8 text-primary"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  ></path>
                </svg>
              ) : (
                <span
                  style={{
                    color: 'rgba(255,255,255,1)',
                    fontWeight: 600,
                    fontSize: 24,
                    textAlign: 'left',
                  }}
                >
                  {adminAnalytics?.totalActiveBets}
                </span>
              )}
            </div>
            {/* Time Live Card */}
            <div
              className="bg-[rgba(22,22,22,1)] rounded-xl flex flex-col justify-center"
              style={{ minHeight: 109, height: 109, padding: 24 }}
            >
              <span
                style={{
                  color: 'rgba(255,255,255,0.75)',
                  fontWeight: 500,
                  fontSize: 14,
                  textAlign: 'left',
                }}
              >
                Time Live
              </span>
              {isAdminAnalyticsLoading ? (
                <svg
                  className="animate-spin h-8 w-8 text-primary"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  ></path>
                </svg>
              ) : (
                <span
                  style={{
                    color: 'rgba(255,255,255,1)',
                    fontWeight: 600,
                    fontSize: 24,
                    textAlign: 'left',
                  }}
                >
                  {adminAnalytics?.totalLiveTime}
                </span>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="w-full mb-4">
            <TabSwitch
              tabs={tabs}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              className="ml-4"
            />
          </div>

          <Separator className="!mt-1" />

          {/* Search and Action Buttons - Below Separator */}
          {activeTab !== 'stream-payout' && (
            <div className={`w-full mb-4 mt-4 ${isMobile ? 'px-4' : 'px-4'}`}>
              {activeTab === 'users' && (
                <SearchInput
                  id="search-users"
                  placeholder="Search users..."
                  value={searchUserQuery}
                  onChange={setSearchUserQuery}
                  width="lg"
                />
              )}

              {activeTab === 'ended-streams' && (
                <SearchInput
                  id="search-ended-streams"
                  placeholder="Search ended streams..."
                  value={searchEndedStreamQuery}
                  onChange={setSearchEndedStreamQuery}
                  width="lg"
                />
              )}

              {activeTab === 'livestreams' && (
                <div
                  className={`${isMobile ? 'flex flex-col space-y-3' : 'flex items-center'} w-full`}
                >
                  <SearchInput
                    id="search-streams"
                    placeholder="Search streams..."
                    value={searchStreamQuery}
                    onChange={setSearchStreamQuery}
                    width="md"
                    className={isMobile ? '' : 'mr-2'}
                  />
                  <button
                    type="button"
                    className={`bg-primary text-black font-bold px-6 py-2 rounded-full hover:bg-opacity-90 transition-colors ${isMobile ? 'w-full' : ''}`}
                    onClick={() => {
                      resetForm();
                      setIsCreateStream(true);
                      setEditStreamId('');
                      setViewStreamId('');
                      setCreateStep('info');
                      setBettingRounds([]);
                      setErrors({
                        title: '',
                        description: '',
                        embeddedUrl: '',
                        thumbnail: '',
                        startDate: '',
                      });
                      setBettingErrorRounds([]);
                      setBettingValidationErrors([]);
                      setShowBettingValidation(false);
                    }}
                  >
                    Create Event
                  </button>
                </div>
              )}

              {activeTab === 'non-video' && (
                <div
                  className={`${isMobile ? 'flex flex-col space-y-3' : 'flex items-center'} w-full`}
                >
                  <SearchInput
                    id="search-non-video"
                    placeholder="Search Non-Video..."
                    value={searchNonVideoQuery}
                    onChange={setSearchNonVideoQuery}
                    width="md"
                    className={isMobile ? '' : 'mr-2'}
                  />
                  <button
                    type="button"
                    className={`bg-primary text-black font-bold px-6 py-2 rounded-full hover:bg-opacity-90 transition-colors ${isMobile ? 'w-full' : ''}`}
                    onClick={() => {
                      resetForm();
                      setIsCreateStream(true);
                      setEditStreamId('');
                      setViewStreamId('');
                      setCreateStep('info');
                      setBettingRounds([]);
                      setErrors({
                        title: '',
                        description: '',
                        embeddedUrl: '',
                        thumbnail: '',
                        startDate: '',
                      });
                      setBettingErrorRounds([]);
                      setBettingValidationErrors([]);
                      setShowBettingValidation(false);
                    }}
                  >
                    Create Event
                  </button>
                </div>
              )}

              {activeTab === 'ended-non-video' && (
                <SearchInput
                  id="search-ended-non-video"
                  placeholder="Search ended non-videos..."
                  value={searchEndedNonVideoQuery}
                  onChange={setSearchEndedNonVideoQuery}
                  width="lg"
                />
              )}

              {activeTab === 'promo-cards' && (
                <div
                  className={`${isMobile ? 'flex flex-col space-y-3' : 'flex items-center'} w-full`}
                >
                  <SearchInput
                    id="search-promo"
                    placeholder="Search Promo Cards..."
                    value={searchPromoQuery}
                    onChange={setSearchPromoQuery}
                    width="md"
                    className={isMobile ? '' : 'mr-2'}
                  />
                  <button
                    type="button"
                    className={`bg-primary text-black font-bold px-6 py-2 rounded-full hover:bg-opacity-90 transition-colors ${isMobile ? 'w-full' : ''}`}
                    onClick={() => {
                      resetForm();
                      setIsCreateStream(true);
                      setEditStreamId('');
                      setViewStreamId('');
                      setCreateStep('info');
                      setEventType({ value: 'promo', label: 'Promo Card' });
                      setBettingRounds([]);
                      setErrors({
                        title: '',
                        description: '',
                        embeddedUrl: '',
                        thumbnail: '',
                        startDate: '',
                      });
                      setBettingErrorRounds([]);
                      setBettingValidationErrors([]);
                      setShowBettingValidation(false);
                    }}
                  >
                    Create Promo Card
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tab Content */}

          {activeTab === 'livestreams' && (
            <div className="space-y-4">
              <StreamTable
                streams={streams}
                setStreamAnalyticsId={setStreamAnalyticsId}
                refetchStreams={refetchStreams}
                setViewStreamId={setViewStreamId}
                setEditStreamId={setEditStreamId}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
              />
            </div>
          )}

          {activeTab === 'ended-streams' && (
            <div className="space-y-4">
              <StreamTable
                streams={endedStreams}
                setStreamAnalyticsId={setStreamAnalyticsId}
                refetchStreams={refetchEndedStreams}
                setViewStreamId={setViewStreamId}
                setEditStreamId={setEditStreamId}
                currentPage={endStreamCurrentPage}
                setCurrentPage={setEndStreamCurrentPage}
              />
            </div>
          )}

          {activeTab === 'non-video' && (
            <div className="space-y-4">
              <StreamTable
                streams={nonVideoStreams}
                setStreamAnalyticsId={setStreamAnalyticsId}
                refetchStreams={refetchNonVideoStreams}
                setViewStreamId={setViewStreamId}
                setEditStreamId={setEditStreamId}
                currentPage={nonVideoPage}
                setCurrentPage={setNonVideoPage}
              />
            </div>
          )}

          {activeTab === 'ended-non-video' && (
            <div className="space-y-4">
              <StreamTable
                streams={endedNonVideoStreams}
                setStreamAnalyticsId={setStreamAnalyticsId}
                refetchStreams={refetchEndedNonVideoStreams}
                setViewStreamId={setViewStreamId}
                setEditStreamId={setEditStreamId}
                currentPage={endedNonVideoCurrentPage}
                setCurrentPage={setEndedNonVideoCurrentPage}
              />
            </div>
          )}

          {activeTab === 'promo-cards' && (
            <div className="space-y-4">
              <StreamTable
                streams={promoStreams}
                setStreamAnalyticsId={setStreamAnalyticsId}
                refetchStreams={refetchPromoStreams}
                setViewStreamId={setViewStreamId}
                setEditStreamId={setEditStreamId}
                currentPage={promoPage}
                setCurrentPage={setPromoPage}
                isPromoTab={true}
              />
            </div>
          )}

          {activeTab === 'stream-payout' && (
            <div className="space-y-4">
              <StreamPayoutReport />
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-4">
              <UserTable searchUserQuery={searchUserQuery} />
            </div>
          )}

          {activeTab === 'prize-settings' && (
            <div className="space-y-4">
              <PrizeConfiguration />
            </div>
          )}

          {activeTab === 'prize-redemptions' && (
            <div className="space-y-4">
              <PrizeRedemptions />
            </div>
          )}
        </>
      )}
    </div>
  );
};
