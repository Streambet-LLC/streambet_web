import { useQuery } from '@tanstack/react-query';
import api from '@/integrations/api/client';
import { useEffect, useState } from 'react';
import { getImageLink } from '@/utils/helper';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface LeaderboardEntry {
  username: string;
  cadeCoins: number;
  profileImageUrl: string;
}

// Reusable gradient line component
const GradientLine = ({ direction, width = 'max-w-xs' }: { direction: 'left' | 'right', width?: string }) => (
  <div 
    className={`flex-1 h-px ${width} crt-line-glow`}
    style={{
      background: `linear-gradient(to ${direction}, var(--electric-lime), transparent)`
    }} 
  />
);

// Reusable profile image component
const ProfileImage = ({ 
  imageUrl, 
  username 
}: { 
  imageUrl: string; 
  username: string; 
}) => (
  <div className="flex-shrink-0 crt-profile-glow">
    <Avatar className="w-6 h-6 md:w-8 md:h-8">
      <AvatarImage src={getImageLink(imageUrl)} alt={`${username}'s profile`} />
      <AvatarFallback className="text-xs md:text-sm">{username.charAt(0).toUpperCase()}</AvatarFallback>
    </Avatar>
  </div>
);

// Custom hook for count-up animation
const useCountUp = (target: number, duration = 2000) => {
  const [value, setValue] = useState(0);
  
  useEffect(() => {
    if (target === 0) return;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setValue(target);
        clearInterval(timer);
      } else {
        setValue(Math.floor(current));
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [target, duration]);
  
  return value;
};

export const LeaderboardTable = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const response = await api.user.getLeaderboard();
      return response.data as LeaderboardEntry[];
    },
  });

  const [totalCadeCoins, setTotalCadeCoins] = useState(0);
  const [topLead, setTopLead] = useState(0);
  
  // Use custom hook for animations
  const animatedTotal = useCountUp(totalCadeCoins);
  const animatedLead = useCountUp(topLead);

  // Calculate stats
  useEffect(() => {
    if (data && data.length > 0) {
      const total = data.reduce((sum, entry) => sum + Number(entry.cadeCoins), 0);
      const lead = data.length > 1 ? Number(data[0].cadeCoins) - Number(data[1].cadeCoins) : 0;

      setTotalCadeCoins(Math.floor(total));
      setTopLead(Math.floor(lead));
    }
  }, [data]);

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
    <div>
      {/* Header Card */}
      <div className="relative px-4 md:px-8 py-6 md:py-10 border-b-2" style={{ borderColor: 'var(--card-grid-border)' }}>
        {/* Center Title */}
        <div className="text-center mb-6 md:mb-6">
          <div className="flex items-center justify-center gap-4 md:gap-6">
            {/* Left fading line */}
            <GradientLine direction="left" />
            
            {/* Title */}
            <div className="text-xl md:text-4xl font-black uppercase tracking-tight whitespace-nowrap crt-text-ghost" style={{ fontFamily: '"Press Start 2P", monospace', color: 'var(--electric-lime)' }}>
              LEADERBOARD
            </div>
            
            {/* Right fading line */}
            <GradientLine direction="right" />
          </div>
        </div>

        {/* Stats and Subtitle Row */}
        <div className="flex items-center justify-between gap-4">
          {/* Left Stat */}
          <div className="flex-1 text-left">
            <div className="text-xs uppercase tracking-wider font-bold crt-glow-medium">
              Total <span style={{ color: 'var(--gold-coin)' }}>CadeCoins</span>
            </div>
            <div className="text-base md:text-xl font-mono font-bold crt-glow-medium" style={{ color: 'var(--electric-lime)' }}>
              {Math.floor(animatedTotal).toLocaleString()}
            </div>
          </div>

          {/* Center Subtitle */}
          <div className="text-center">
            <div className="hidden md:inline-flex items-center gap-3 text-sm tracking-widest text-muted-foreground font-bold crt-glow-subtle">
              <span className="h-px w-12 bg-gradient-to-r from-transparent to-[var(--card-grid-border)]"></span>
              TOP 20 PLAYERS
              <span className="h-px w-12 bg-gradient-to-l from-transparent to-[var(--card-grid-border)]"></span>
            </div>
          </div>

          {/* Right Stat */}
          <div className="flex-1 text-right pr-3">
            <div className="text-xs uppercase tracking-wider font-bold text-white crt-glow-medium">
              Top Lead
            </div>
            <div className="text-base md:text-xl font-mono font-bold crt-glow-medium" style={{ color: 'var(--electric-lime)' }}>
              {Math.floor(animatedLead).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Mobile Subtitle - Full width below stats */}
        <div className="md:hidden text-center mt-4">
          <div className="inline-flex items-center gap-2 text-xs tracking-widest text-muted-foreground font-bold">
            <GradientLine direction="left" width="w-8" />
            TOP 20 PLAYERS
            <GradientLine direction="right" width="w-8" />
          </div>
        </div>
      </div>
      
      {/* Leaderboard Entries */}
      <div className="relative max-h-[500px]">
        {data.map((entry, index) => (
          <div
            key={entry.username}
            className="relative flex items-center justify-between gap-4 px-3 md:px-8 py-3 md:py-4 border-b group hover:bg-white/5 transition-all duration-200"
            style={{ borderColor: 'var(--card-grid-border)' }}
          >
            {/* Rank */}
            <div className="flex-1 flex items-center gap-2 md:gap-3">
              <span 
                className={`text-lg md:text-2xl font-black font-mono crt-glow-medium ${index < 3 ? '' : 'text-white/50'}`}
                style={{ color: index < 3 ? 'var(--electric-lime)' : undefined }}
              >
                {index + 1}
              </span>
            </div>

            {/* Username */}
            <div className="flex items-center gap-2 md:gap-3 justify-center">
              <ProfileImage 
                imageUrl={entry.profileImageUrl} 
                username={entry.username} 
              />
              {/* Username Text */}
              <div
                className={`text-sm md:text-lg font-mono whitespace-nowrap ${
                  index === 0
                    ? 'username-rank-1'
                    : index === 1
                      ? 'username-rank-2'
                      : index === 2
                        ? 'username-rank-3'
                        : 'crt-glow-strong text-white username-default'
                }`}
              >
                {entry.username}
              </div>
            </div>

            {/* Gold Amount */}
            <div className="flex-1 text-right">
              <div 
                className={`text-sm md:text-xl font-mono font-bold crt-glow-medium ${index < 3 ? '' : 'text-white/75'}`}
                style={{ color: index < 3 ? 'var(--electric-lime)' : undefined }}
              >
                {Math.floor(Number(entry.cadeCoins)).toLocaleString()}
              </div>
              <div className="text-[10px] md:text-xs uppercase tracking-wide crt-glow-medium" style={{ color: 'var(--gold-coin)' }}>
                CadeCoins
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
