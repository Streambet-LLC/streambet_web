import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { getPrizeColor } from '@/utils/prizeColors';

interface ProfilePrizeProgressProps {
  currentCadeCoins: number;
  lifetimeCadeCoins: number;
}

const PROGRESS_START = 0;
const MAX_MILESTONE = 100000;
const MILESTONES = [
  { amount: 25000, label: 'Tier 1' },
  { amount: 50000, label: 'Tier 2' },
  { amount: 75000, label: 'Tier 3' },
  { amount: 100000, label: 'Tier 4' },
];

function getSellerFeeFromLifetime(lifetimeCadeCoins: number): number {
  const level = Math.min(4, Math.floor(Math.max(0, lifetimeCadeCoins) / 25000));
  return Math.max(2, 4 - level * 0.5);
}

export default function ProfilePrizeProgress({ 
  currentCadeCoins,
  lifetimeCadeCoins,
}: ProfilePrizeProgressProps) {
  const milestoneCount = MILESTONES.length;
  const percentPerSegment = 100 / milestoneCount;
  const clampedLifetime = Math.max(0, lifetimeCadeCoins);
  const progressPercent = Math.min(100, (clampedLifetime / MAX_MILESTONE) * 100);
  const nextMilestone = MILESTONES.find((milestone) => clampedLifetime < milestone.amount);
  const currentSellerFee = getSellerFeeFromLifetime(clampedLifetime);

  // Calculate tick mark positions for equal segments across the progress bar
  const getTickPosition = (index: number) => {
    const segmentNumber = index + 1;
    return percentPerSegment * segmentNumber;
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
              src="/icons/cade-coins.png" 
              alt="CadeCoins" 
              className="w-5 h-5"
            />
            <span>Current: <span className="font-bold text-base">{currentCadeCoins.toLocaleString('en-US')}</span></span>
            <span className="text-muted-foreground">|</span>
            <span>Lifetime: <span className="font-bold text-base">{lifetimeCadeCoins.toLocaleString('en-US')}</span></span>
          </div>
          
          {nextMilestone ? (
            <>
              {/* Progress bar with fixed milestone tick marks */}
              <div className="relative mt-3">
                <Progress value={progressPercent} className="h-3" />
                
                {/* Prize tick marks overlay */}
                <div className="absolute -top-1 left-0 w-full h-5 pointer-events-none">
                  {/* Start - 0% */}
                  <div 
                    className="absolute flex flex-col items-start" 
                    style={{ left: '0%' }}
                  >
                    <div className="w-1 h-5 rounded-full bg-muted-foreground/30" />
                  </div>
                  
                  {/* Fixed tier tick marks */}
                  {MILESTONES.map((milestone, index) => {
                    const position = getTickPosition(index);
                    const achieved = clampedLifetime >= milestone.amount;
                    const isLast = index === MILESTONES.length - 1;
                    
                    return (
                      <div 
                        key={milestone.amount}
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
                
                {/* Fixed tier labels */}
                {MILESTONES.map((milestone, index) => {
                  const position = getTickPosition(index);
                  const achieved = clampedLifetime >= milestone.amount;
                  const isLast = index === MILESTONES.length - 1;
                  
                  return (
                    <span 
                      key={milestone.amount}
                      className={cn(
                        'absolute flex flex-col',
                        getPrizeColor(index, 'text'),
                        !achieved && 'opacity-50',
                        isLast ? 'items-end right-0' : 'items-center -translate-x-1/2'
                      )}
                      style={isLast ? {} : { left: `${position}%` }}
                    >
                      <span className="text-xs sm:text-sm">{milestone.amount.toLocaleString('en-US')}</span>
                      <span className="text-[10px] sm:text-xs mt-0.5">{milestone.label}</span>
                    </span>
                  );
                })}
              </div>
              <p className="text-center text-sm mt-14">
                <span className="font-semibold">
                  {Math.max(0, Math.floor(nextMilestone.amount - clampedLifetime)).toLocaleString('en-US')}
                </span>
                {' '}coins until{' '}
                <span className={cn('font-bold', getPrizeColor(MILESTONES.findIndex((m) => m.amount === nextMilestone.amount), 'text'))}>
                  {nextMilestone.label}
                </span>
                {' '}({Math.max(2, currentSellerFee - 0.5).toFixed(1)}% seller fee)
              </p>
            </>
          ) : (
            <div className="text-center py-4">
              <p className={cn('text-lg font-bold', getPrizeColor(MILESTONES.length - 1, 'text'))}>All Milestones Achieved!</p>
              <p className="text-sm text-muted-foreground mt-1">You have reached the minimum seller fee tier: 2.0%</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
