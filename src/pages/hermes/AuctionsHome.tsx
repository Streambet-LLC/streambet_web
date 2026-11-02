import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HermesShell } from '@/components/hermes/HermesShell';
import { AuctionCard } from '@/components/hermes/AuctionCard';
import { CATEGORIES, CATEGORY_LABEL } from '@/components/hermes/format';
import { Skeleton } from '@/components/ui/skeleton';
import { AuctionCategory, hermesAPI } from '@/integrations/api/hermes';

/** Hermes Auctions home: Live and Upcoming lots, filterable by category. */
export default function AuctionsHome() {
  const [bucket, setBucket] = useState<'live' | 'upcoming'>('live');
  const [category, setCategory] = useState<AuctionCategory | undefined>();
  const list = useQuery({
    queryKey: ['hermes-list', bucket, category],
    queryFn: () => hermesAPI.list(bucket, category),
    refetchInterval: 30_000,
  });

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
      active
        ? 'border-[#C7FA09] bg-[#C7FA09] text-black'
        : 'border-white/15 text-white/75 hover:border-white/35'
    }`;

  return (
    <HermesShell>
      <section className="mb-8 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#C7FA09]/15 via-[#141414] to-[#0a0a0a] p-6 sm:p-10">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#C7FA09]">
          Zero-fee collectibles auctions
        </p>
        <h1 className="mt-3 max-w-2xl text-3xl font-black italic uppercase leading-tight sm:text-5xl">
          Bid on the cards & memorabilia you chase.
        </h1>
        <p className="mt-3 max-w-xl text-sm text-white/65 sm:text-base">
          No buyer premium, ever. Pay by bank or USDC with no fees — cards add only the card
          processing cost. Every lot is hosted and shipped by Hermes.
        </p>
      </section>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-full border border-white/10 bg-black/40 p-1">
          {(['live', 'upcoming'] as const).map(b => (
            <button
              key={b}
              type="button"
              onClick={() => setBucket(b)}
              className={`rounded-full px-4 py-1.5 text-sm font-bold capitalize transition ${
                bucket === b ? 'bg-white text-black' : 'text-white/70 hover:text-white'
              }`}
            >
              {b}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={chip(!category)} onClick={() => setCategory(undefined)}>
            All
          </button>
          {CATEGORIES.map(c => (
            <button key={c} type="button" className={chip(category === c)} onClick={() => setCategory(c)}>
              {CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>
      </div>

      {list.isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/6] rounded-2xl bg-white/5" />
          ))}
        </div>
      ) : list.isError ? (
        <p className="py-16 text-center text-white/60">Couldn't load auctions. Refresh to try again.</p>
      ) : (list.data ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 py-16 text-center">
          <img src="/hermes/hermes-mark-64.png" alt="" className="mx-auto h-14 w-14 opacity-80" />
          <p className="mt-3 font-semibold">
            {bucket === 'live' ? 'No live auctions right now.' : 'Nothing scheduled yet.'}
          </p>
          <p className="mt-1 text-sm text-white/55">
            {bucket === 'live' ? (
              <>
                Check{' '}
                <button type="button" className="text-[#C7FA09] underline" onClick={() => setBucket('upcoming')}>
                  upcoming lots
                </button>
                .
              </>
            ) : (
              'New lots drop regularly.'
            )}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {list.data.map(a => (
            <AuctionCard key={a.id} auction={a} />
          ))}
        </div>
      )}
    </HermesShell>
  );
}
