import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { socketAPI } from '@/integrations/api/client';

/**
 * Joins the auction's socket room and refetches its queries on every
 * `auction.update` (bids, extensions, close). Works logged-out: the socket
 * connects anonymously when there's no token.
 */
export function useAuctionLive(auctionId: string | undefined) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!auctionId) return;
    const hasToken = !!localStorage.getItem('refreshToken');
    const socket = socketAPI.connect(hasToken);
    if (!socket) return;

    const join = () => socket.emit('auction.join', { auctionId });
    const onUpdate = (payload: { auctionId?: string }) => {
      if (payload?.auctionId && payload.auctionId !== auctionId) return;
      qc.invalidateQueries({ queryKey: ['hermes-auction', auctionId] });
      qc.invalidateQueries({ queryKey: ['hermes-bids', auctionId] });
      qc.invalidateQueries({ queryKey: ['hermes-list'] });
      qc.invalidateQueries({ queryKey: ['hermes-market'] });
    };

    if (socket.connected) join();
    socket.on('connect', join);
    socket.on('auction.update', onUpdate);
    return () => {
      socket.emit('auction.leave', { auctionId });
      socket.off('connect', join);
      socket.off('auction.update', onUpdate);
    };
  }, [auctionId, qc]);
}
