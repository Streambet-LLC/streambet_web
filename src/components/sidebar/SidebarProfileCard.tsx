import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getImageLink } from '@/utils/helper';
import { useAuthContext } from '@/contexts/AuthContext';

interface SidebarProfileCardProps {
  compact?: boolean;
}

export function SidebarProfileCard({ compact = false }: SidebarProfileCardProps) {
  const navigate = useNavigate();
  const { session } = useAuthContext();
  
  const username = session?.username;
  const email = session?.email;
  const profileImageUrl = (session as any)?.profileImageUrl;
  const streamCoins = session?.walletBalanceSweepCoin || 0;
  const goldCoins = session?.walletBalanceGoldCoin || 0;

  const handleClick = () => {
    navigate('/betting-history');
  };

  const handleCoinsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate('/deposit');
  };

  if (compact) {
    // Collapsed sidebar: show only avatar
    return (
      <motion.div
        className="flex justify-center p-2 cursor-pointer"
        onClick={handleClick}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="relative">
          <motion.div
            className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-primary/50 blur-md opacity-50"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <Avatar className="relative h-10 w-10 border-2 border-primary">
            <AvatarImage
              src={profileImageUrl ? getImageLink(profileImageUrl) : undefined}
              alt={username}
            />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {username?.[0]?.toUpperCase() || email?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          {/* Online status indicator */}
          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-primary rounded-full border-2 border-background" />
        </div>
      </motion.div>
    );
  }

  // Expanded sidebar: show full card
  return (
    <div className="p-4 border-t border-border shrink-0 bg-background/50">
      <motion.div
        className="relative p-3 rounded-xl bg-gradient-to-br from-zinc-900/80 to-black/80 border border-primary/20 overflow-hidden group cursor-pointer"
        onClick={handleClick}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Animated background glow on hover */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100"
          transition={{ duration: 0.3 }}
        />
        
        <div className="relative z-10 flex items-center gap-3">
          {/* Avatar with glow ring */}
          <div className="relative">
            <motion.div
              className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-primary/50 blur-md opacity-50"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <Avatar className="relative h-11 w-11 border-2 border-primary">
              <AvatarImage
                src={profileImageUrl ? getImageLink(profileImageUrl) : undefined}
                alt={username}
              />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {username?.[0]?.toUpperCase() || email?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            {/* Online status indicator */}
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-primary rounded-full border-2 border-background" />
          </div>

          {/* User Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white group-hover:text-primary transition-colors mb-2">
              {username || 'User'}
            </p>
            
            {/* Separator line */}
            <div className="border-t border-border my-2" />
            
            {/* Coins Display - Single Row */}
            <div 
              className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={handleCoinsClick}
            >
              {/* Stream Coins */}
              <div className="flex items-center gap-1.5">
                <img
                  src="/icons/sweep-coins.png"
                  alt="Stream Coins"
                  className="h-4 w-4"
                />
                <span className="text-xs font-medium text-green-500">
                  {Number(streamCoins).toLocaleString('en-US')}
                </span>
              </div>
              
              {/* Gold Coins */}
              <div className="flex items-center gap-1.5">
                <img
                  src="/icons/gold-coins.png"
                  alt="Gold Coins"
                  className="h-4 w-4"
                />
                <span className="text-xs font-medium text-[#B4FF39]">
                  {Number(goldCoins).toLocaleString('en-US')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
