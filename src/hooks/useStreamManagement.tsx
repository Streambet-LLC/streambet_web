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

  const rangeRef = useRef('[0,7]');
  const endedStreamsRangeRef = useRef('[0,7]');
  const { isLoading, isFetching, session } = useAuthContext();

  const { data: streams, refetch: refetchStreams } = useQuery({
    queryKey: ['streams'],
    queryFn: async () => {
      const response = await adminAPI.getStreams({
        range: rangeRef.current,
        sort: '["createdAt","DESC"]',
        filter: JSON.stringify({ q: searchStreamQuery }),
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
      const response = await adminAPI.getStreams({
        range: rangeRef.current,
        sort: '["createdAt","DESC"]',
        filter: JSON.stringify({ q: searchNonVideoQuery }),
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

  return {
    profile: session,
    isProfileLoading: isLoading,
    isProfileFetching: isFetching,
    streams,
    searchStreamQuery,
    setSearchStreamQuery,
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
    searchEndedNonVideoQuery,
    setSearchEndedNonVideQuery,
    setSearchNonVideoQuery,
  };
};
