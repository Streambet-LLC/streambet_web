import { useEffect, useState } from 'react';
import moment from 'moment';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlatformIcon } from './AnalyticsBadges';
import { platformLabel, type SocialPlatform } from '@/mocks/analytics';
import { analyticsAPI } from '@/integrations/api/client';
import type { ApiExternalSignal } from '@/types/analytics-api';
import { RefreshCw, Loader2, ExternalLink, Radar } from 'lucide-react';

const SOURCE_STYLES: Record<string, string> = {
  consented: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  ebay_api: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  vendor: 'border-violet-500/30 bg-violet-500/10 text-violet-300',
};

const SOURCE_LABEL: Record<string, string> = {
  consented: 'Consented',
  ebay_api: 'eBay API',
  vendor: 'Vendor',
};

/**
 * Per-collector external-signal panel. Lists the compliant signals we've
 * gathered (consented social handles today) and lets an admin re-run the
 * connectors. Drops into the profile detail page.
 */
export const ExternalSignalsCard = ({ userId }: { userId: string }) => {
  const [signals, setSignals] = useState<ApiExternalSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [collecting, setCollecting] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    analyticsAPI
      .getCollectorSignals(userId)
      .then(s => active && setSignals(s))
      .catch(() => active && setSignals([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [userId]);

  const collect = async () => {
    setCollecting(true);
    try {
      const fresh = await analyticsAPI.collectCollectorSignals(userId);
      setSignals(fresh);
      toast.success(
        `Collected ${fresh.length} signal${fresh.length === 1 ? '' : 's'}.`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Collection failed.');
    } finally {
      setCollecting(false);
    }
  };

  return (
    <Card className="bg-[rgba(22,22,22,1)] border-white/5 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium text-white">
            <Radar className="h-4 w-4 text-[#B4FF39]" />
            External Signals
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Compliant signals gathered from consented handles and official
            sources — the basis for identity reconciliation and lists.
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 border-white/10 bg-white/5 hover:bg-white/10"
          onClick={collect}
          disabled={collecting}
        >
          {collecting ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          )}
          Collect
        </Button>
      </div>

      {loading ? (
        <div className="py-6 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : signals.length === 0 ? (
        <div className="rounded-md border border-dashed border-white/10 p-6 text-center text-sm text-muted-foreground">
          No signals yet. Click <span className="text-white/80">Collect</span>{' '}
          to pull this collector's consented handles into the graph.
        </div>
      ) : (
        <div className="space-y-1.5">
          {signals.map(s => (
            <div
              key={s.id}
              className="flex items-center gap-3 rounded-lg border border-white/5 bg-black/30 px-3 py-2.5"
            >
              <PlatformIcon
                platform={s.platform as SocialPlatform}
                className="h-4 w-4 text-muted-foreground shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white truncate">
                    @{s.handle}
                  </span>
                  {s.label && (
                    <span className="text-[10px] text-muted-foreground truncate">
                      {s.label}
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {platformLabel(s.platform as SocialPlatform)}
                  {s.confidence != null ? ` · ${s.confidence}% match` : ''}
                  {s.collectedAt
                    ? ` · ${moment(s.collectedAt).fromNow()}`
                    : ''}
                </div>
              </div>
              <Badge
                variant="outline"
                className={`shrink-0 text-[10px] font-normal ${
                  SOURCE_STYLES[s.source] ??
                  'border-white/10 bg-white/5 text-white/50'
                }`}
              >
                {SOURCE_LABEL[s.source] ?? s.source}
              </Badge>
              {s.url && (
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted-foreground hover:text-white shrink-0"
                  aria-label="Open profile"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
