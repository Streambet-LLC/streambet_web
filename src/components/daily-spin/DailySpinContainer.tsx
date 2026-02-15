import { useState, useEffect } from 'react';
import { SpinWheel } from './SpinWheel';
import { useDailySpinStatus, useExecuteDailySpin } from '@/hooks/useDailySpin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { TimeRemaining } from '@/types/daily-spin';
import { REWARD_RESET_DURATION } from './daily-spin-constants';
import { formatCountdownTime, formatResetTime } from './daily-spin-utils';

// Reusable card layout wrapper
interface DailySpinCardProps {
  children: React.ReactNode;
  description?: string;
  variant?: 'default' | 'transparent';
}

const DailySpinCard = ({ children, description, variant = 'default' }: DailySpinCardProps) => (
  <Card className={variant === 'transparent' 
    ? 'w-full max-w-2xl mx-auto bg-transparent border-0 shadow-none' 
    : 'w-full max-w-2xl mx-auto'}>
    <CardHeader>
      <DailySpinTitle />
      {description && <CardDescription className="text-center">{description}</CardDescription>}
    </CardHeader>
    <CardContent className={variant === 'transparent' ? 'space-y-6 pb-8' : undefined}>
      {children}
    </CardContent>
  </Card>
);

// Reusable title component
const DailySpinTitle = () => (
  <CardTitle className="text-4xl font-black text-center text-primary">
    Daily Spin
  </CardTitle>
);

/**
 * DailySpinContainer Component
 * Main container that orchestrates the daily spin feature
 */
export function DailySpinContainer() {
  const { data: status, isLoading, error, refetch } = useDailySpinStatus();
  const { mutate: executeSpin, isPending: isSpinning, data: spinResult, reset } = useExecuteDailySpin();

  const [currentReward, setCurrentReward] = useState<number | undefined>(undefined);
  const [countdown, setCountdown] = useState<TimeRemaining | null>(null);

  // Real-time countdown updates
  useEffect(() => {
    if (!status?.canSpin && status?.nextSpinAt) {
      const interval = setInterval(() => {
        const now = new Date();
        const target = new Date(status.nextSpinAt);
        const diffMs = target.getTime() - now.getTime();

        if (diffMs <= 0) {
          setCountdown(null);
          clearInterval(interval);
          refetch();
          return;
        }

        const diffSeconds = Math.floor(diffMs / 1000);
        const hours = Math.floor(diffSeconds / 3600);
        const minutes = Math.floor((diffSeconds % 3600) / 60);
        const seconds = diffSeconds % 60;

        setCountdown({ hours, minutes, seconds });
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setCountdown(null);
    }
  }, [status?.canSpin, status?.nextSpinAt, refetch]);

  // Update current reward when spin completes
  useEffect(() => {
    if (spinResult?.reward) {
      setCurrentReward(spinResult.reward);

      // Reset reward display
      const resetTimer = setTimeout(() => {
        setCurrentReward(undefined);
        reset();
      }, REWARD_RESET_DURATION);

      return () => {
        clearTimeout(resetTimer);
      };
    }
  }, [spinResult, reset]);

  const handleSpin = () => {
    setCurrentReward(undefined);
    executeSpin();
  };

  // Loading state
  if (isLoading) {
    return (
      <DailySpinCard description="Loading your daily spin status...">
        <div className="space-y-6">
          <div className="flex flex-col items-center gap-6">
            <Skeleton className="w-[320px] h-[320px] rounded-full" />
            <Skeleton className="w-[320px] h-14 rounded-md" />
            <Skeleton className="w-[320px] h-20 rounded-md" />
          </div>
        </div>
      </DailySpinCard>
    );
  }

  // Error state
  if (error) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Failed to load daily spin status. Please try again later.';
    
    return (
      <DailySpinCard>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {errorMessage}
          </AlertDescription>
        </Alert>
      </DailySpinCard>
    );
  }

  // Status should exist at this point (after loading and error checks), but just in case
  if (!status) {
    return null;
  }

  return (
    <DailySpinCard variant="transparent">
      {/* Spin Wheel */}
      <SpinWheel
        onSpin={handleSpin}
        isSpinning={isSpinning}
        canSpin={status.canSpin}
        reward={currentReward}
        disabledButtonText={countdown ? `Next spin: ${formatCountdownTime(countdown)}` : undefined}
        resetTimeText={!status.canSpin && status.nextSpinAt ? `Resets at: ${formatResetTime(status.nextSpinAt)}` : undefined}
      />
    </DailySpinCard>
  );
}
