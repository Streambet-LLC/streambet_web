import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';

export const useCommentsQuery = (streamId: string | undefined, userId: string) => {
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const { data: comments = [], refetch: refetchCommentsInternal } = useQuery({
    queryKey: ['comments', streamId, page, userId],
    queryFn: async () => {
      // Return empty array for invalid streamId
      if (!streamId || streamId === 'new') {
        console.log('StreamId is invalid, returning empty comments array');
        return [];
      }

      console.log('Fetching comments for stream:', streamId, 'page:', page, 'user:', userId);
      setIsLoading(true);

      try {
        const { data, error } = await supabase
          .from('comments')
          .select(
            `
            id,
            content,
            created_at,
            user_id,
            user:profiles(username, avatar_url)
          `
          )
          .eq('stream_id', streamId)
          .order('created_at', { ascending: true })
          .range(page * 100, (page + 1) * 100 - 1);

        if (error) {
          console.error('Error fetching comments:', error);
          throw error;
        }

        console.log(`Fetched ${data?.length || 0} comments for stream ${streamId}`);
        return data || [];
      } finally {
        setIsLoading(false);
      }
    },
    enabled: !!streamId && streamId !== 'new',
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  return {
    comments,
    refetchCommentsInternal,
    isLoading,
    page,
    setPage,
  };
};
