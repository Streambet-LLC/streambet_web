import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

type StreamState = {
  locked: boolean;
  outcome: string | null;
};

export const useStreamStateHandler = (
  stream: any,
  userId: string | null | undefined,
  refetchBet: () => void
) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [previousState, setPreviousState] = useState<StreamState>({
    locked: false,
    outcome: null,
  });

  useEffect(() => {
    if (!stream) return;

    const isLockedChanged = previousState.locked !== stream.betting_locked;
    const isOutcomeChanged = previousState.outcome !== stream.betting_outcome;

    if (isLockedChanged || isOutcomeChanged) {
      setPreviousState({
        locked: !!stream.betting_locked,
        outcome: stream.betting_outcome,
      });

      if (stream.betting_locked && isLockedChanged && !stream.betting_outcome) {
        console.log('Betting just got locked');
        toast({
          title: 'Betting Locked',
          description: 'Betting has been locked for this stream. Good luck!',
        });
      }

      if (stream.betting_outcome && isOutcomeChanged) {
        console.log('Winner just declared:', stream.betting_outcome);

        if (userId) {
          queryClient.invalidateQueries({ queryKey: ['profile', userId] });
          queryClient.invalidateQueries({ queryKey: ['transactions', userId] });

          refetchBet();
        }
      }
    }
  }, [stream, toast, userId, previousState, queryClient, refetchBet]);
};
