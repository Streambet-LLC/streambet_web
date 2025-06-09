import { useEffect, useState } from 'react';
import { api } from '@/integrations/api/client';
import { useQueryClient } from '@tanstack/react-query';

interface BettingUpdate {
  bettingVariableId: string;
  totalBetsAmount: number;
  betCount: number;
  status?: string;
}

interface WinnerDeclared {
  bettingVariableId: string;
  winnerName: string;
}

interface ChatMessage {
  type: 'system' | 'user';
  username: string;
  message: string;
  timestamp: Date;
}

export function useBettingStreamUpdates(streamId: string) {
  const queryClient = useQueryClient();
  const [bettingUpdates, setBettingUpdates] = useState<BettingUpdate[]>([]);
  const [winnerDeclared, setWinnerDeclared] = useState<WinnerDeclared | null>(null);
  const [bettingLocked, setBettingLocked] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!streamId) return;

    // Connect to WebSocket
    const socket = api.socket.connect();

    if (!socket) {
      console.error('Failed to connect to WebSocket');
      return;
    }

    setIsConnected(true);

    // Join the stream room
    api.socket.joinStream(streamId);

    // Set up event listeners
    socket.on('bettingUpdate', (update: BettingUpdate) => {
      setBettingUpdates(prev => {
        const exists = prev.some(b => b.bettingVariableId === update.bettingVariableId);
        if (exists) {
          return prev.map(b => (b.bettingVariableId === update.bettingVariableId ? update : b));
        } else {
          return [...prev, update];
        }
      });

      // Invalidate betting options query to refresh data
      queryClient.invalidateQueries({
        queryKey: ['betting-options', streamId],
      });
    });

    socket.on('bettingLocked', (data: { bettingVariableId: string }) => {
      setBettingLocked(data.bettingVariableId);

      // Invalidate betting options query to refresh locked status
      queryClient.invalidateQueries({
        queryKey: ['betting-options', streamId],
      });
    });

    socket.on('winnerDeclared', (data: WinnerDeclared) => {
      setWinnerDeclared(data);

      // Invalidate user bets to show updated results
      queryClient.invalidateQueries({
        queryKey: ['user-bets'],
      });

      // Invalidate wallet balance to show updated balance
      queryClient.invalidateQueries({
        queryKey: ['wallet-balance'],
      });

      // Invalidate betting options to show resolved status
      queryClient.invalidateQueries({
        queryKey: ['betting-options', streamId],
      });
    });

    socket.on('chatMessage', (message: ChatMessage) => {
      setChatMessages(prev => [...prev, message]);
    });

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Clean up
    return () => {
      api.socket.leaveStream(streamId);
      api.socket.disconnect();
    };
  }, [streamId, queryClient]);

  // Function to send chat messages
  const sendChatMessage = (message: string) => {
    if (!streamId || !isConnected) return;
    api.socket.sendChatMessage(streamId, message);
  };

  return {
    bettingUpdates,
    winnerDeclared,
    bettingLocked,
    chatMessages,
    isConnected,
    sendChatMessage,
  };
}
