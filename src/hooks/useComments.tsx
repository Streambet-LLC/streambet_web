import { useCallback } from 'react';
import { useCommentsQuery } from './comments/useCommentsQuery';
import { useCommentsSubscription } from './comments/useCommentsSubscription';
import { useCommentsActions } from './comments/useCommentsActions';

export const useComments = (streamId: string | undefined, session: any) => {
  // Unique key based on user ID
  const userId = session?.user?.id || 'anonymous';

  // Fetch comments data
  const { comments, refetchCommentsInternal, isLoading, page, setPage } = useCommentsQuery(
    streamId,
    userId
  );

  // Wrapper for refetchCommentsInternal
  const refetchComments = useCallback(async () => {
    if (!streamId || streamId === 'new') return;

    console.log('Manually refetching comments for stream:', streamId);
    try {
      await refetchCommentsInternal();
    } catch (error) {
      console.error('Error refetching comments:', error);
    }
  }, [streamId, refetchCommentsInternal]);

  // Set up realtime subscription
  const { realtimeEventsReceivedRef } = useCommentsSubscription(streamId, userId, refetchComments);

  // Comment actions (post, etc.)
  const { comment, setComment, handleComment, isSubmitting } = useCommentsActions(
    streamId,
    session,
    refetchComments,
    realtimeEventsReceivedRef
  );

  return {
    comment,
    setComment,
    comments,
    handleComment,
    refetchComments,
    isLoading,
    isSubmitting,
    page,
    setPage,
  };
};
