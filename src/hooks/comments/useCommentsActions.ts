import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

export const useCommentsActions = (
  streamId: string | undefined,
  session: any,
  refetchComments: () => Promise<void>,
  realtimeEventsReceivedRef: React.MutableRefObject<Set<string>>
) => {
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleComment = async () => {
    if (!session) {
      console.log('Comment attempted without session');
      navigate('/login');
      return;
    }

    if (!comment.trim() || isSubmitting) return;

    try {
      console.log('Posting comment:', comment, 'user:', session.user.id, 'to stream:', streamId);
      setIsSubmitting(true);

      const { error, data } = await supabase
        .from('comments')
        .insert({
          content: comment,
          user_id: session.user.id,
          stream_id: streamId,
        })
        .select();

      if (error) {
        toast({
          title: 'Error posting comment',
          description: error.message,
          variant: 'destructive',
        });
        throw error;
      }

      console.log('Comment posted successfully:', data);

      // Clear comment only after successful posting
      setComment('');

      // Force an immediate refetch
      queryClient.invalidateQueries({
        queryKey: ['comments', streamId],
        refetchType: 'all',
      });

      // Optimistically add the comment to the list
      if (data && data.length > 0) {
        // Mark this event as already processed
        const commentId = data[0]?.id;
        if (commentId) {
          realtimeEventsReceivedRef.current.add(commentId);
        }

        // Ensure we refetch to get the latest comments
        await refetchComments();
      }
    } catch (error) {
      console.error('Error posting comment:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    comment,
    setComment,
    handleComment,
    isSubmitting,
  };
};
