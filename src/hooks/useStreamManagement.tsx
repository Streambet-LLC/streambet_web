import { useToast } from '@/components/ui/use-toast';
import { useQuery } from '@tanstack/react-query';
import { adminAPI } from '@/integrations/api/client';
import { useEffect, useRef, useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';

export const useStreamManagement = () => {
  const { toast } = useToast();
  const [searchStreamQuery, setSearchStreamQuery] = useState('');
  const [searchNonVideoQuery, setSearchNonVideoQuery] = useState('');
  const [searchEndedStreamQuery, setSearchEndedStreamQuery] = useState('');
  const [searchEndedNonVideoQuery, setSearchEndedNonVideQuery] = useState('');
  
  // Pick status filters for livestreams and non-video tabs
  const [pickStatusFiltersLiveStream, setPickStatusFiltersLiveStream] = useState<string[]>([]);
  const [pickStatusFiltersNonVideo, setPickStatusFiltersNonVideo] = useState<string[]>([]);

  const defaultRange = '[0,7]';

  const rangeRef = useRef(defaultRange);
  const endedStreamsRangeRef = useRef(defaultRange);
  const { isLoading, isFetching, session } = useAuthContext();

  const { data: streams, refetch: refetchStreams } = useQuery({
    queryKey: ['streams'],
    queryFn: async () => {
      const filterObj: any = { q: searchStreamQuery };
      if (pickStatusFiltersLiveStream.length > 0) {
        filterObj.pickStatus = pickStatusFiltersLiveStream;
      }
      
      const response = await adminAPI.getStreams({
        range: rangeRef.current,
        sort: '["createdAt","DESC"]',
        filter: JSON.stringify(filterObj),
        type: 'stream',
      });

      return response;
    },
    enabled: false,
    // Increase refetch frequency to see new streams faster
    refetchInterval: 5000,
  });

  const { data: endedStreams, refetch: refetchEndedStreams } = useQuery({
    queryKey: ['ended-streams'],
    queryFn: async () => {
      const response = await adminAPI.getStreams({
        range: endedStreamsRangeRef.current,
        sort: '["endTime","DESC"]',
        filter: JSON.stringify({
          streamStatus: 'ended',
          ...(searchEndedStreamQuery && { q: searchEndedStreamQuery }),
        }),
        type: 'stream',
      });

      return response;
    },
    enabled: false,
    // Increase refetch frequency to see new streams faster
    refetchInterval: 5000,
  });

  const { data: nonVideoStreams, refetch: refetchNonVideoStreams } = useQuery({
    queryKey: ['non-video'],
    queryFn: async () => {
      const filterObj: any = { q: searchNonVideoQuery };
      if (pickStatusFiltersNonVideo.length > 0) {
        filterObj.pickStatus = pickStatusFiltersNonVideo;
      }
      
      const response = await adminAPI.getStreams({
        range: rangeRef.current,
        sort: '["createdAt","DESC"]',
        filter: JSON.stringify(filterObj),
        type: 'non-video',
      });

      return response;
    },
    enabled: false,
    // Increase refetch frequency to see new streams faster
    refetchInterval: 5000,
  });

  const { data: endedNonVideoStreams, refetch: refetchEndedNonVideoStreams } = useQuery({
    queryKey: ['ended-non-video'],
    queryFn: async () => {
      const response = await adminAPI.getStreams({
        range: endedStreamsRangeRef.current,
        sort: '["endTime","DESC"]',
        filter: JSON.stringify({
          streamStatus: 'ended',
          ...(searchEndedNonVideoQuery && { q: searchEndedNonVideoQuery }),
        }),
        type: 'non-video',
      });

      return response;
    },
    enabled: false,
    // Increase refetch frequency to see new streams faster
    refetchInterval: 5000,
  });

  const deleteStream = async (id: string) => {};

  const handleRefetchStreams = (range?: string) => {
    rangeRef.current = range || '';
    refetchStreams();
  };

  const handleRefetchEndedStreams = (range?: string) => {
    endedStreamsRangeRef.current = range || '';
    refetchEndedStreams();
  };

  const handleNonVideoRefetchStreams = (range?: string) => {
    rangeRef.current = range || '';
    refetchNonVideoStreams();
  };

  const handleEndedNonVideoRefetchStreams = (range?: string) => {
    endedStreamsRangeRef.current = range || '';
    refetchEndedNonVideoStreams();
  };

  useEffect(() => {
    if (rangeRef.current !== '') {
      refetchStreams();
    }
  }, [searchStreamQuery, refetchStreams]);

  useEffect(() => {
    refetchEndedNonVideoStreams();
  }, [searchEndedNonVideoQuery, refetchEndedNonVideoStreams]);

  useEffect(() => {
    refetchNonVideoStreams();
  }, [searchNonVideoQuery, refetchNonVideoStreams]);

  useEffect(() => {
    refetchEndedStreams();
  }, [searchEndedStreamQuery, refetchEndedStreams]);
  
  // Refetch when pick status filters change
  useEffect(() => {
    rangeRef.current = defaultRange;
    refetchStreams();
  }, [defaultRange, pickStatusFiltersLiveStream, refetchStreams]);
  
  useEffect(() => {
    rangeRef.current = defaultRange;
    refetchNonVideoStreams();
  }, [defaultRange, pickStatusFiltersNonVideo, refetchNonVideoStreams]);

  return {
    profile: session,
    isProfileLoading: isLoading,
    isProfileFetching: isFetching,
    streams,
    searchStreamQuery,
    setSearchStreamQuery,
    pickStatusFiltersLiveStream,
    setPickStatusFiltersLiveStream,
    deleteStream,
    handleRefetchStreams,
    endedStreams,
    handleRefetchEndedStreams,
    searchEndedStreamQuery,
    setSearchEndedStreamQuery,

    handleNonVideoRefetchStreams,
    handleEndedNonVideoRefetchStreams,
    nonVideoStreams,
    endedNonVideoStreams,
    searchNonVideoQuery,
    pickStatusFiltersNonVideo,
    setPickStatusFiltersNonVideo,
    searchEndedNonVideoQuery,
    setSearchEndedNonVideQuery,
    setSearchNonVideoQuery,
  };
};
