import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import api from '@/integrations/api/client';
import Bugsnag from '@bugsnag/js';
import type { Socket } from 'socket.io-client';

/**
 * Server-emitted auction update payload (see AuctionsService /
 * AuctionsGateway). The gateway emits ONE event name (`auction.update`)
 * and uses `type` to discriminate. Always carries `auctionId`.
 */
export interface AuctionUpdate {
  type: 'bid.placed' | 'auction.extended' | 'auction.cancelled' | 'auction.closed' | string;
  auctionId: string;
  currentBidUsd?: number;
  bidCount?: number;
  leaderUserId?: string | null;
  minNextBidUsd?: number;
  endsAt?: string;
  extensionCount?: number;
  outcome?: 'paid' | 'unsold' | 'failed' | 'pending_payment';
  winnerUserId?: string | null;
}

interface UseAuctionSocketProps {
  /** Auction id to join. When null/undefined the hook is a no-op. */
  auctionId: string | null | undefined;
  /** Optional callback fired on every server update (post-invalidation). */
  onUpdate?: (update: AuctionUpdate) => void;
}

/**
 * Subscribe to live updates for a single auction. Joins the
 * `auction:{id}` room and forwards each update to react-query
 * invalidation so any AuctionSummary-driven UI refreshes automatically.
 *
 * Mirrors the pattern in `useStreamSocketEvents` — connects through
 * `api.socket.connect()` and cleans up on unmount / id change.
 */
export const useAuctionSocket = ({ auctionId, onUpdate }: UseAuctionSocketProps) => {
  const queryClient = useQueryClient();
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (!auctionId) return;

    const socket: Socket | null = api.socket.connect();
    if (!socket) return;

    const join = () => {
      socket.emit('auction.join', { auctionId });
    };

    // Server only broadcasts a single event; the type field discriminates.
    const handleUpdate = (update: AuctionUpdate) => {
      if (!update || update.auctionId !== auctionId) return;

      // Refresh the auction's own query + any list views that surface it.
      queryClient.invalidateQueries({ queryKey: ['auction', auctionId] });
      queryClient.invalidateQueries({ queryKey: ['active-auctions'] });
      queryClient.invalidateQueries({ queryKey: ['shop-items'] });
      queryClient.invalidateQueries({ queryKey: ['seller-shop-items'] });

      try {
        onUpdateRef.current?.(update);
      } catch (err) {
        Bugsnag.notify(err as Error, event => {
          event.context = 'useAuctionSocket onUpdate';
          event.addMetadata('auction', { auctionId, type: update.type });
        });
      }
    };

    const handleReconnect = () => {
      // Re-join after reconnect so we keep getting updates.
      join();
      queryClient.invalidateQueries({ queryKey: ['auction', auctionId] });
    };

    socket.on('auction.update', handleUpdate);
    socket.on('reconnect', handleReconnect);

    if (socket.connected) {
      join();
    } else {
      socket.once('connect', join);
    }

    return () => {
      try {
        socket.emit('auction.leave', { auctionId });
      } catch {
        /* socket may already be torn down */
      }
      socket.off('auction.update', handleUpdate);
      socket.off('reconnect', handleReconnect);
    };
  }, [auctionId, queryClient]);
};

export default useAuctionSocket;
