import { useCallback, useEffect, useState } from 'react';
import moment from 'moment';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, History, MessageSquare, ChevronRight } from 'lucide-react';
import { analyticsAPI } from '@/integrations/api/client';
import type {
  ApiInsightsConversation,
  ApiInsightsExchange,
} from '@/types/analytics-api';

/**
 * Browse past Insights conversations by date and reopen one into the chat.
 */
export const InsightsHistoryDialog = ({
  open,
  onClose,
  onOpenConversation,
}: {
  open: boolean;
  onClose: () => void;
  onOpenConversation: (
    conversationId: string,
    exchanges: ApiInsightsExchange[]
  ) => void;
}) => {
  const [items, setItems] = useState<ApiInsightsConversation[]>([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await analyticsAPI.listInsightsHistory(limit, 0);
      setItems(r.data);
      setTotal(r.total);
    } catch {
      /* keep last known */
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const openConversation = async (c: ApiInsightsConversation) => {
    setOpeningId(c.conversationId);
    try {
      const exchanges = await analyticsAPI.getInsightsConversation(
        c.conversationId
      );
      onOpenConversation(c.conversationId, exchanges);
      onClose();
    } catch {
      /* ignore */
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="bg-[rgba(18,18,18,1)] border-white/10 text-white max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4 text-[#B4FF39]" /> Insights history
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto -mx-2 px-2">
          {loading && items.length === 0 ? (
            <div className="flex items-center gap-2 py-10 justify-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : items.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No past conversations yet.
            </div>
          ) : (
            <div className="space-y-1.5">
              {items.map(c => (
                <button
                  key={c.conversationId}
                  type="button"
                  onClick={() => openConversation(c)}
                  disabled={openingId === c.conversationId}
                  className="w-full flex items-center gap-2.5 rounded-lg border border-white/5 bg-black/30 px-3 py-2.5 text-left hover:bg-white/5"
                >
                  <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-white/90">
                      {c.title}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      {moment(c.lastAt).format('MMM D, h:mm A')} ·{' '}
                      {c.count} {c.count === 1 ? 'message' : 'messages'}
                    </span>
                  </span>
                  {openingId === c.conversationId ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                </button>
              ))}
              {total > items.length && (
                <button
                  type="button"
                  onClick={() => setLimit(l => l + 20)}
                  className="w-full rounded-lg border border-white/5 bg-black/20 px-3 py-1.5 text-center text-xs text-muted-foreground hover:bg-white/5 hover:text-white"
                >
                  Load more ({total - items.length})
                </button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
