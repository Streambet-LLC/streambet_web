import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useQuery } from '@tanstack/react-query';

export const useStreamManagement = () => {
  const { toast } = useToast();

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user?.id) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: streams, refetch: refetchStreams } = useQuery({
    queryKey: ['streams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('streams')
        .select(
          `
          *,
          profiles (
            username
          )
        `
        )
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('Fetched streams for admin:', data);
      return data;
    },
    // Increase refetch frequency to see new streams faster
    refetchInterval: 5000,
  });

  const deleteStream = async (id: string) => {
    try {
      console.log('Deleting stream:', id);

      // First, delete all comments associated with the stream
      const { error: commentsError } = await supabase.from('comments').delete().eq('stream_id', id);

      if (commentsError) {
        console.error('Error deleting comments:', commentsError);
        throw new Error('Failed to delete stream comments');
      }

      // Then, delete all bets associated with the stream
      const { error: betsError } = await supabase.from('stream_bets').delete().eq('stream_id', id);

      if (betsError) {
        console.error('Error deleting bets:', betsError);
        throw new Error('Failed to delete stream bets');
      }

      // Finally, delete the stream itself
      const { error: streamError } = await supabase.from('streams').delete().eq('id', id);

      if (streamError) {
        console.error('Error deleting stream:', streamError);
        throw new Error('Failed to delete stream');
      }

      toast({
        title: 'Success',
        description: 'Stream deleted successfully',
      });

      // Explicitly refetch with a slight delay to ensure database consistency
      setTimeout(async () => {
        await refetchStreams();
      }, 500);
    } catch (error: any) {
      console.error('Error in deleteStream:', error);
      toast({
        title: 'Error deleting stream',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  return {
    profile,
    streams,
    deleteStream,
    refetchStreams,
  };
};
