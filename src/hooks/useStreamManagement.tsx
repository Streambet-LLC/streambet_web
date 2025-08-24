import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useQuery } from '@tanstack/react-query';
import { adminAPI, bettingAPI } from '@/integrations/api/client';
import { useEffect, useRef, useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';

export const useStreamManagement = () => {
  const { toast } = useToast();
  const [searchStreamQuery, setSearchStreamQuery] = useState();
  const rangeRef = useRef('[0,7]');
  const { isLoading, session } = useAuthContext();


  const { data: streams, refetch: refetchStreams } = useQuery({
    queryKey: ['streams'],
    queryFn: async () => {

      const response = await adminAPI.getStreams({
        range: searchStreamQuery ? '[0,24]' : rangeRef.current,
        sort: '["createdAt","DESC"]',
        filter: JSON.stringify({ q: searchStreamQuery }),
      });


      return response;
    },
    enabled: false,
    // Increase refetch frequency to see new streams faster
    refetchInterval: 5000,
  });

  const deleteStream = async (id: string) => {
  };

  const handleRefetchStreams = (range?: string) => {
    rangeRef.current = range || '';
    refetchStreams();
  };

  useEffect(() => {
    if (rangeRef.current !== '') {
      refetchStreams();
    }
  }, [searchStreamQuery, refetchStreams])

  return {
    profile: session,
    isProfileLoading: isLoading,
    streams,
    searchStreamQuery,
    setSearchStreamQuery,
    deleteStream,
    handleRefetchStreams,
  };
};
