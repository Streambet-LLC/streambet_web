import { useQuery } from '@tanstack/react-query';
import api from '@/integrations/api/client';

export const useStreamData = (streamId: string) => {
  return useQuery({
    queryKey: ['stream', streamId],
    queryFn: async () => {
      const data = await api.betting.getStream(streamId);
      return data;
     },
  });
};
