import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useQuery } from '@tanstack/react-query';
import { adminAPI, bettingAPI } from '@/integrations/api/client';
import { useEffect, useRef, useState } from 'react';

export const useStreamManagement = () => {
  const { toast } = useToast();
  const [searchStreamQuery, setSearchStreamQuery] = useState();
  const rangeRef = useRef('[0,7]');

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const session = await supabase.auth.getSession();

      if (!session?.id) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.id)
        .single();

      if (error) throw error;
      return data?.data;
    },
  });

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
    profile,
    streams,
    searchStreamQuery,
    setSearchStreamQuery,
    deleteStream,
    handleRefetchStreams,
  };
};
