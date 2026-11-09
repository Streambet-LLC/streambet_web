import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { hermesAPI } from '@/integrations/api/hermes';
import { AuctionCard } from './AuctionCard';
import { HERMES_HOME } from './site';

/**
 * Landing-page rail: featured, then live (soonest ending), then upcoming
 * Hermes lots. Renders nothing when there's nothing to show.
 */
export function FeaturedAuctions() {
  const featured = useQuery({
    queryKey: ['hermes-list', 'featured'],
    queryFn: () => hermesAPI.featured(4),
    refetchInterval: 60_000,
  });
  const items = featured.data ?? [];
  if (items.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="mt-20 overflow-hidden rounded-3xl border border-[#C7FA09]/20 bg-gradient-to-b from-[#C7FA09]/[0.07] to-transparent p-5 sm:p-8"
    >
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-end sm:justify-between sm:text-left">
        <div>
          <img
            src="/hermes/hermes-auctions-logo.png"
            alt="Hermes Auctions"
            className="mx-auto h-12 w-auto sm:mx-0"
          />
          <p className="mt-3 text-sm text-white/65">
            Zero-seller-fee collectibles auctions for sports cards, TCG and memorabilia.
          </p>
        </div>
        <Link
          to={HERMES_HOME}
          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#C7FA09] px-4 py-2 text-sm font-bold text-black hover:bg-[#d6ff3d]"
        >
          See all auctions <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {items.map(a => (
          <AuctionCard key={a.id} auction={a} />
        ))}
      </div>
    </motion.section>
  );
}
