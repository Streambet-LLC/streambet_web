import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/integrations/api/client';
import { getImageLink } from '@/utils/helper';
import { roundDownCoinAmount } from '@/utils/format';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface LeaderboardEntry {
  username: string;
  cadeCoins: number;
  profileImageUrl: string;
  monthToDateCoins: number;
  lifetimeCadeCoins: number;
}

// Reusable gradient line component
const GradientLine = ({
  direction,
  width = 'max-w-xs',
}: {
  direction: 'left' | 'right';
  width?: string;
}) => (
  <div
    className={`flex-1 h-px ${width} crt-line-glow`}
    style={{
      background: `linear-gradient(to ${direction}, var(--electric-lime), transparent)`,
    }}
  />
);

// Reusable profile image component
const ProfileImage = ({ imageUrl, username }: { imageUrl: string; username: string }) => (
  <div className="flex-shrink-0 crt-profile-glow">
    <Avatar className="w-6 h-6 md:w-8 md:h-8">
      <AvatarImage src={getImageLink(imageUrl)} alt={`${username}'s profile`} />
      <AvatarFallback className="text-xs md:text-sm">
        {username.charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  </div>
);

export const LeaderboardTable = () => {
  const [sortBy, setSortBy] = useState<'balance' | 'monthly' | 'lifetime'>('balance');

  const { data, isLoading, error } = useQuery({
    queryKey: ['leaderboard', sortBy],
    queryFn: async () => {
      const response = await api.user.getLeaderboard(sortBy);
      return response.data as LeaderboardEntry[];
    },
    placeholderData: (previousData) => previousData,
  });

  if (isLoading) {
    return (
      <div className="rounded-md border p-8 text-center">
        <p className="text-muted-foreground">Loading leaderboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border p-8 text-center">
        <p className="text-destructive">Failed to load leaderboard. Please try again later.</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center">
        <p className="text-muted-foreground">No leaderboard data available.</p>
      </div>
    );
  }

  return (
    <div className="w-full md:w-fit max-w-6xl mx-auto">
      {/* Header Card */}
      <div
        className="relative px-4 md:px-8 py-6 md:py-10 border-b-2"
        style={{ borderColor: 'var(--card-grid-border)' }}
      >
        {/* Center Title */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-4 md:gap-6">
            {/* Left fading line */}
            <GradientLine direction="left" />

            {/* Title */}
            <div
              className="text-xl md:text-4xl font-black uppercase tracking-tight whitespace-nowrap"
              style={{ fontFamily: '"Press Start 2P", monospace', color: 'var(--electric-lime)' }}
            >
              LEADERBOARD
            </div>

            {/* Right fading line */}
            <GradientLine direction="right" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div
        className="px-4 md:px-8 py-4 md:py-6 border-b-2 flex justify-center gap-2 md:gap-4"
        style={{ borderColor: 'var(--card-grid-border)' }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            setSortBy('monthly');
          }}
          className={`px-4 md:px-6 py-2 md:py-3 font-bold uppercase text-xs md:text-sm tracking-wider transition-all duration-200 border-2 ${
            sortBy === 'monthly'
              ? 'border-[var(--electric-lime)] bg-[var(--electric-lime)]/10 text-[var(--electric-lime)] shadow-[0_0_10px_rgba(189,255,0,0.3)]'
              : 'border-white/20 text-white/50 hover:border-white/40 hover:text-white/70'
          }`}
        >
          THIS MONTH
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            setSortBy('balance');
          }}
          className={`px-4 md:px-6 py-2 md:py-3 font-bold uppercase text-xs md:text-sm tracking-wider transition-all duration-200 border-2 ${
            sortBy === 'balance'
              ? 'border-[var(--electric-lime)] bg-[var(--electric-lime)]/10 text-[var(--electric-lime)] shadow-[0_0_10px_rgba(189,255,0,0.3)]'
              : 'border-white/20 text-white/50 hover:border-white/40 hover:text-white/70'
          }`}
        >
          BALANCE
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            setSortBy('lifetime');
          }}
          className={`px-4 md:px-6 py-2 md:py-3 font-bold uppercase text-xs md:text-sm tracking-wider transition-all duration-200 border-2 ${
            sortBy === 'lifetime'
              ? 'border-[var(--electric-lime)] bg-[var(--electric-lime)]/10 text-[var(--electric-lime)] shadow-[0_0_10px_rgba(189,255,0,0.3)]'
              : 'border-white/20 text-white/50 hover:border-white/40 hover:text-white/70'
          }`}
        >
          ALL-TIME
        </button>
      </div>

      {/* Leaderboard Table - Scrollable on Mobile */}
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Column Headers */}
          <div
            className="grid grid-cols-[50px_minmax(150px,200px)_90px_90px_90px] md:grid-cols-[60px_minmax(200px,280px)_120px_120px_120px] gap-1 md:gap-4 px-2 md:px-8 py-3 border-b-2"
            style={{ borderColor: 'var(--card-grid-border)' }}
          >
            <div
              className="flex items-center justify-center text-xs md:text-sm font-bold uppercase tracking-wider"
              style={{ color: 'var(--electric-lime)' }}
            >
              RANK
            </div>
            <div
              className="flex items-center justify-center text-xs md:text-sm font-bold uppercase tracking-wider"
              style={{ color: 'var(--electric-lime)' }}
            >
              PLAYER
            </div>
            <div
              className="flex flex-col items-center justify-center gap-1 text-xs md:text-sm font-bold uppercase tracking-wider transition-all duration-200"
              style={{
                color: sortBy === 'monthly' ? 'var(--electric-lime)' : 'rgba(189, 255, 0, 0.5)',
                textShadow:
                  sortBy === 'monthly' ? '0 0 10px rgba(189, 255, 0, 0.5)' : undefined,
              }}
            >
              <img src="/icons/cade-coins.png" alt="CadeCoin" className="w-3 h-3 md:w-4 md:h-4" />
              <span className="text-center leading-tight">
                THIS
                <br />
                MONTH
              </span>
            </div>
            <div
              className="flex flex-col items-center justify-center gap-1 text-xs md:text-sm font-bold uppercase tracking-wider transition-all duration-200"
              style={{
                color: sortBy === 'balance' ? 'var(--electric-lime)' : 'rgba(189, 255, 0, 0.5)',
                textShadow: sortBy === 'balance' ? '0 0 10px rgba(189, 255, 0, 0.5)' : undefined,
              }}
            >
              <img src="/icons/cade-coins.png" alt="CadeCoin" className="w-3 h-3 md:w-4 md:h-4" />
              <span className="text-center leading-tight">
                CURRENT
                <br />
                BALANCE
              </span>
            </div>
            <div
              className="flex flex-col items-center justify-center gap-1 text-xs md:text-sm font-bold uppercase tracking-wider transition-all duration-200"
              style={{
                color: sortBy === 'lifetime' ? 'var(--electric-lime)' : 'rgba(189, 255, 0, 0.5)',
                textShadow:
                  sortBy === 'lifetime' ? '0 0 10px rgba(189, 255, 0, 0.5)' : undefined,
              }}
            >
              <img src="/icons/cade-coins.png" alt="CadeCoin" className="w-3 h-3 md:w-4 md:h-4" />
              <span className="text-center leading-tight">
                ALL-TIME
                <br />
                EARNINGS
              </span>
            </div>
          </div>

          {/* Leaderboard Entries */}
          <div>
            {data.map((entry, index) => (
              <div
                key={entry.username}
                className="grid grid-cols-[50px_minmax(150px,200px)_90px_90px_90px] md:grid-cols-[60px_minmax(200px,280px)_120px_120px_120px] items-center gap-1 md:gap-4 px-2 md:px-8 py-3 md:py-4 border-b group hover:bg-white/5 transition-all duration-200"
                style={{ borderColor: 'var(--card-grid-border)' }}
              >
                {/* Rank */}
                <div className="flex items-center justify-center">
                  <span
                    className={`text-sm md:text-base font-black font-mono ${index < 3 ? '' : 'text-white/50'}`}
                    style={{ color: index < 3 ? 'var(--electric-lime)' : undefined }}
                  >
                    {index + 1}
                  </span>
                </div>

                {/* Player */}
                <div className="flex items-center justify-center gap-2 md:gap-3">
                  <ProfileImage imageUrl={entry.profileImageUrl} username={entry.username} />
                  <div
                    className={`text-sm md:text-base font-mono whitespace-nowrap ${
                      index < 3
                        ? 'username-default'
                        : 'text-white username-default'
                    }`}
                    style={{ color: index < 3 ? 'var(--electric-lime)' : undefined }}
                  >
                    {entry.username}
                  </div>
                </div>

                {/* Monthly */}
                <div className="flex items-center justify-center">
                  <div
                    className={`text-sm md:text-base font-mono font-bold ${index < 3 ? '' : 'text-white/75'}`}
                    style={{ color: index < 3 ? 'var(--electric-lime)' : undefined }}
                  >
                    {roundDownCoinAmount(entry.monthToDateCoins).toLocaleString()}
                  </div>
                </div>

                {/* Balance */}
                <div className="flex items-center justify-center">
                  <div
                    className={`text-sm md:text-base font-mono font-bold ${index < 3 ? '' : 'text-white/75'}`}
                    style={{ color: index < 3 ? 'var(--electric-lime)' : undefined }}
                  >
                    {roundDownCoinAmount(entry.cadeCoins).toLocaleString()}
                  </div>
                </div>

                {/* All-Time */}
                <div className="flex items-center justify-center">
                  <div
                    className={`text-sm md:text-base font-mono font-bold ${index < 3 ? '' : 'text-white/75'}`}
                    style={{ color: index < 3 ? 'var(--electric-lime)' : undefined }}
                  >
                    {roundDownCoinAmount(entry.lifetimeCadeCoins).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
