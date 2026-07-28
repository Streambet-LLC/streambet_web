import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { analyticsAPI } from '@/integrations/api/client';
import { Loader2, Plus, Check } from 'lucide-react';

export type PortfolioDestination = 'watchlist' | 'holdings' | 'sold';

const DEST_LABEL: Record<PortfolioDestination, string> = {
  watchlist: 'watchlist',
  holdings: 'holdings',
  sold: 'sold cards',
};

/**
 * Save a card to one of the three portfolio buckets.
 *
 * Watchlist is listed first and worded plainly because it is the safe default;
 * the other two are phrased as first-person claims ("I own this") so nobody
 * lands in holdings or sold by misclick — we should never assume ownership or
 * a sale from interest alone.
 *
 * Shared by the chat valuation card and the AI Market Reports list so both
 * offer the same choices and wording.
 */
export const SaveToPortfolioMenu = ({
  subject,
  label = 'Save to portfolio',
  className = '',
  onSaved,
}: {
  /** The card to save, e.g. "Crown Zenith Dialga VSTAR #GG08 PSA 10". */
  subject: string;
  label?: string;
  className?: string;
  onSaved?: (destination: PortfolioDestination) => void;
}) => {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<PortfolioDestination | null>(null);

  const save = async (destination: PortfolioDestination) => {
    if (saving) return;
    setSaving(true);
    try {
      if (destination === 'sold') {
        // No sale numbers here — the row is created so they can fill in what
        // it sold for on the Portfolio tab.
        await analyticsAPI.addSoldCard({ name: subject });
        toast.success(`Logged “${subject}” as sold — add the numbers in Portfolio.`);
      } else {
        await analyticsAPI.addTrackedCard({
          name: subject,
          owned: destination === 'holdings',
        });
        toast.success(
          destination === 'holdings'
            ? `Added “${subject}” to your holdings`
            : `Added “${subject}” to your watchlist`
        );
      }
      setSaved(destination);
      onSaved?.(destination);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save that card.');
    } finally {
      setSaving(false);
    }
  };

  // Confirm in place as well as by toast — in a scrolling chat the toast is
  // long gone by the time they look back at the card.
  if (saved) {
    return (
      <span
        className={`inline-flex items-center gap-1 text-[11px] text-[#B4FF39] ${className}`}
      >
        <Check className="h-3.5 w-3.5" />
        Saved to your {DEST_LABEL[saved]}
      </span>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={saving || !subject}
          className={`h-7 shrink-0 gap-1 px-2 text-[11px] text-muted-foreground hover:text-[#B4FF39] ${className}`}
          title="Save this card to your portfolio"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="border-white/10 bg-[rgba(22,22,22,1)]"
      >
        <DropdownMenuItem onClick={() => void save('watchlist')}>
          Add to watchlist
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void save('holdings')}>
          I own this — add to holdings
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void save('sold')}>
          I sold this — log a sale
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
