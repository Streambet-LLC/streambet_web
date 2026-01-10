import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PrizeProgress } from '@/types/profile';
import { cn } from '@/lib/utils';
import { usePrizeTiers } from '@/hooks/usePrizeConfig';
import PrizeRedemptionModal from './PrizeRedemptionModal';
import { Trophy, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { getPrizeColor } from '@/utils/prizeColors';
import { useQuery } from '@tanstack/react-query';
import { prizeAPI } from '@/integrations/api/client';
import type { PrizeRedemptionResponse } from '@/types/prize';

interface ProfilePrizeProgressProps {
  currentCadeCoins: number;
  lifetimeCadeCoins: number;
  prizeProgress: PrizeProgress;
  isOwnProfile?: boolean;
}

const PROGRESS_START = 0;

export default function ProfilePrizeProgress({ 
  currentCadeCoins,
  lifetimeCadeCoins, 
  prizeProgress,
  isOwnProfile = false,
}: ProfilePrizeProgressProps) {
  const { data: tiers, isLoading } = usePrizeTiers();
  const [selectedPrize, setSelectedPrize] = useState<{ 
    id: string;
    name: string; 
    amount: number; 
    level: number;
  } | null>(null);

  // Fetch user's redemptions (only if own profile)
  const { data: redemptions } = useQuery<PrizeRedemptionResponse[]>({
    queryKey: ['userRedemptions'],
    queryFn: async () => {
      const response = await prizeAPI.getMyRedemptions();
      return response;
    },
    enabled: isOwnProfile,
  });

  if (isLoading || !tiers) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-xl">Prize Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Loading prizes...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort tiers by tier number
  const prizes = [...tiers].sort((a, b) => a.prizeTier - b.prizeTier);
  const prizeCount = prizes.length;
  const maxPrizeAmount = prizes[prizes.length - 1]?.amount || 0;

  // Calculate percentage of progress bar allocated to each prize tier
  const PERCENT_PER_SEGMENT = 100 / prizeCount;

  // Calculate tick mark positions for equal segments across the progress bar
  const getTickPosition = (tierIndex: number) => {
    const segmentNumber = tierIndex + 1; // 1-indexed segment position
    return PERCENT_PER_SEGMENT * segmentNumber;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">Prize Progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Progress Section */}
        <div>
          <div className="flex items-center gap-2 text-sm font-medium">
            <img 
              src="/icons/gold-coins.png" 
              alt="Cade Coins" 
              className="w-5 h-5"
            />
            <span>Current: <span className="font-bold text-base">{currentCadeCoins.toLocaleString('en-US')}</span></span>
            <span className="text-muted-foreground">|</span>
            <span>Lifetime: <span className="font-bold text-base">{lifetimeCadeCoins.toLocaleString('en-US')}</span></span>
          </div>
          
          {prizeProgress.nextPrize !== null ? (
            <>
              {/* Progress bar with prize tick marks */}
              <div className="relative mt-3">
                <Progress value={prizeProgress.progressPercent} className="h-3" />
                
                {/* Prize tick marks overlay */}
                <div className="absolute -top-1 left-0 w-full h-5 pointer-events-none">
                  {/* Start - 0% */}
                  <div 
                    className="absolute flex flex-col items-start" 
                    style={{ left: '0%' }}
                  >
                    <div className="w-1 h-5 rounded-full bg-muted-foreground/30" />
                  </div>
                  
                  {/* Dynamic prize tick marks */}
                  {prizes.map((prize, index) => {
                    const position = getTickPosition(index);
                    const achieved = lifetimeCadeCoins >= Number(prize.amount);
                    const isLast = index === prizes.length - 1;
                    
                    return (
                      <div 
                        key={prize.id}
                        className={cn(
                          'absolute flex flex-col items-center',
                          isLast ? 'items-end' : '-translate-x-1/2'
                        )}
                        style={{ left: `${position}%` }}
                      >
                        <div className={cn(
                          'w-1 h-5 rounded-full',
                          getPrizeColor(index, 'bg'),
                          !achieved && 'opacity-30'
                        )} />
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="relative hidden sm:flex justify-between text-xs sm:text-sm font-bold mt-3">
                <span className="text-muted-foreground">{PROGRESS_START.toLocaleString('en-US')}</span>
                
                {/* Dynamic prize labels */}
                {prizes.map((prize, index) => {
                  const position = getTickPosition(index);
                  const achieved = lifetimeCadeCoins >= Number(prize.amount);
                  const isLast = index === prizes.length - 1;
                  
                  return (
                    <span 
                      key={prize.id}
                      className={cn(
                        'absolute flex flex-col',
                        getPrizeColor(index, 'text'),
                        !achieved && 'opacity-50',
                        isLast ? 'items-end right-0' : 'items-center -translate-x-1/2'
                      )}
                      style={isLast ? {} : { left: `${position}%` }}
                    >
                      <span className="text-xs sm:text-sm">{Number(prize.amount).toLocaleString('en-US')}</span>
                      <span className="text-[10px] sm:text-xs mt-0.5">{prize.name}</span>
                    </span>
                  );
                })}
              </div>
              <p className="text-center text-sm mt-8">
                <span className="font-semibold">
                  {Math.max(0, prizeProgress.nextPrize - lifetimeCadeCoins).toLocaleString('en-US')}
                </span> coins until <span className={cn(
                  'font-bold', 
                  getPrizeColor(prizes.findIndex(p => Number(p.amount) === prizeProgress.nextPrize), 'text')
                )}>
                  {prizeProgress.nextPrizeName}
                </span>
              </p>
            </>
          ) : (
            <div className="text-center py-4">
              <p className={cn('text-lg font-bold', getPrizeColor(prizes.length - 1, 'text'))}>All Prizes Achieved!</p>
              <p className="text-sm text-muted-foreground mt-1">You've reached {prizes[prizes.length - 1]?.name} status!</p>
            </div>
          )}
        </div>

        {/* Achieved Prizes Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Achieved Prizes</h3>
          {prizes.filter(prize => lifetimeCadeCoins >= Number(prize.amount)).length > 0 ? (
            <div className="grid gap-2">
              {prizes
                .filter(prize => lifetimeCadeCoins >= Number(prize.amount))
                .map((prize) => {
                  const originalIndex = prizes.findIndex(p => p.id === prize.id);
                  // Check if this tier has been redeemed (regardless of fulfillment status)
                  const isRedeemed = redemptions?.some(r => r.prizeTier === prize.prizeTier);
                  
                  return (
                    <div
                      key={prize.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {isRedeemed ? (
                          <CheckCircle className={cn('w-5 h-5', getPrizeColor(originalIndex, 'text'))} />
                        ) : (
                          <Trophy className={cn('w-5 h-5', getPrizeColor(originalIndex, 'text'))} />
                        )}
                        <div>
                          <p className="font-semibold">{prize.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {Number(prize.amount).toLocaleString('en-US')} coins
                          </p>
                        </div>
                      </div>
                      {isOwnProfile && (
                        <Button
                          size="sm"
                          onClick={() => setSelectedPrize({ 
                            id: prize.id,
                            name: prize.name, 
                            amount: Number(prize.amount), 
                            level: prize.prizeTier 
                          })}
                          disabled={isRedeemed}
                        >
                          {isRedeemed ? 'Redeemed' : 'Redeem'}
                        </Button>
                      )}
                    </div>
                  );
                })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No prizes achieved yet. Keep earning coins!
            </p>
          )}
        </div>
      </CardContent>

      {isOwnProfile && selectedPrize && (
        <PrizeRedemptionModal
          isOpen={selectedPrize !== null}
          onClose={() => setSelectedPrize(null)}
          prizeConfigId={selectedPrize.id}
          prizeName={selectedPrize.name}
          prizeAmount={selectedPrize.amount}
          prizeLevel={selectedPrize.level}
        />
      )}
    </Card>
  );
}
