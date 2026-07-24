import { Card } from '@/components/ui/card';
import { Briefcase, TrendingUp, Bell, Wallet } from 'lucide-react';

/**
 * Portfolio ("my cards") tab — placeholder for now. This is where an admin
 * will track cards they hold and see them valued against live market data.
 * Intentionally simple until the holdings model lands; the preview rows below
 * describe the intended shape so the tab reads as "coming", not "broken".
 */
const PREVIEW: { icon: typeof TrendingUp; title: string; desc: string }[] = [
  {
    icon: Wallet,
    title: 'Track your holdings',
    desc: 'Add the cards you own and collectIQ keeps a running value on them from live market pricing.',
  },
  {
    icon: TrendingUp,
    title: 'Gains & losses',
    desc: 'See cost basis vs. current value per card and across your whole collection, updated as markets move.',
  },
  {
    icon: Bell,
    title: 'Price alerts',
    desc: "Get notified when something you hold makes a big move — before it's old news.",
  },
];

export const AnalyticsPortfolio = () => {
  return (
    <Card className="bg-[rgba(22,22,22,1)] border-white/5 p-6 sm:p-8">
      <div className="mx-auto max-w-xl text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-black/40 text-[#B4FF39]">
          <Briefcase className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-white">Portfolio</h2>
        <span className="mt-2 inline-flex items-center rounded-full border border-[#B4FF39]/25 bg-[#B4FF39]/10 px-2.5 py-0.5 text-[11px] font-medium text-[#B4FF39]">
          Coming soon
        </span>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/60">
          Track the cards you hold and see them valued against live market data.
          We're building it — here's what's on the way.
        </p>
      </div>

      <div className="mx-auto mt-8 grid max-w-3xl gap-4 sm:grid-cols-3">
        {PREVIEW.map(p => (
          <div
            key={p.title}
            className="rounded-xl border border-white/8 bg-black/20 p-4"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-black/40 text-[#B4FF39]">
              <p.icon className="h-4.5 w-4.5" />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-white">{p.title}</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-white/55">
              {p.desc}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
};
