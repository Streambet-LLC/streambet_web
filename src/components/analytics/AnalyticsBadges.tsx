import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Persona, AssetCategory, SocialPlatform } from '@/mocks/analytics';
import { Globe, Instagram, Twitter, Facebook, MessageCircle, ShoppingBag } from 'lucide-react';

const PERSONA_COLORS: Record<Persona, string> = {
  'Whale Collector': 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
  'Set Builder': 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  'Vintage Hunter': 'bg-amber-700/20 text-amber-300 border-amber-700/40',
  'Speculator': 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30',
  'Casual Flipper': 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  'Bargain Hunter': 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  'Loyal Fan': 'bg-[#B4FF39]/15 text-[#B4FF39] border-[#B4FF39]/30',
  'New Account': 'bg-slate-500/20 text-slate-300 border-slate-500/40',
};

const CATEGORY_COLORS: Record<AssetCategory, string> = {
  pokemon: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30',
  one_piece: 'bg-red-500/10 text-red-300 border-red-500/30',
  sports: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
  other: 'bg-slate-500/15 text-slate-300 border-slate-500/40',
};

const CATEGORY_LABELS: Record<AssetCategory, string> = {
  pokemon: 'Pokémon',
  one_piece: 'One Piece',
  sports: 'Sports',
  other: 'Other',
};

export const PersonaBadge = ({ persona, className }: { persona: Persona; className?: string }) => (
  <Badge variant="outline" className={cn('font-medium', PERSONA_COLORS[persona], className)}>
    {persona}
  </Badge>
);

export const CategoryBadge = ({
  category,
  className,
}: {
  category: AssetCategory;
  className?: string;
}) => (
  <Badge variant="outline" className={cn('font-medium', CATEGORY_COLORS[category], className)}>
    {CATEGORY_LABELS[category]}
  </Badge>
);

const PLATFORM_ICON: Record<SocialPlatform, React.ComponentType<{ className?: string }>> = {
  ebay: ShoppingBag,
  instagram: Instagram,
  twitter: Twitter,
  tiktok: MessageCircle,
  facebook: Facebook,
  reddit: Globe,
  discord: MessageCircle,
};

export const PlatformIcon = ({
  platform,
  className,
}: {
  platform: SocialPlatform;
  className?: string;
}) => {
  const Icon = PLATFORM_ICON[platform];
  return <Icon className={cn('h-4 w-4', className)} />;
};

/**
 * Small horizontal meter for likelihood / confidence percentages.
 * Color shifts from amber → primary green as value rises.
 */
export const ScoreMeter = ({
  value,
  label,
  className,
}: {
  value: number; // 0..100
  label?: string;
  className?: string;
}) => {
  const color =
    value >= 75 ? 'bg-[#B4FF39]' : value >= 50 ? 'bg-yellow-400' : value >= 25 ? 'bg-orange-400' : 'bg-red-400';
  return (
    <div className={cn('w-full', className)}>
      {label && (
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>{label}</span>
          <span className="font-medium text-foreground">{value}%</span>
        </div>
      )}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div className={cn('h-full transition-all', color)} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
};
