import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoginPrompt } from './LoginPrompt';
import { BettingStats } from './BettingStats';
import { TotalPot } from '@/components/TotalPot';
import { BettingForm } from './BettingForm';
import { LoadingBettingInterface } from './LoadingBettingInterface';
import { useEffect, useState, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle, Info, RefreshCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BettingInterfaceViewProps {
  session: any;
  stream: any;
  streamId: string;
  betAmount: number;
  selectedOption: string | null;
  isPlacingBet: boolean;
  existingBet: any;
  profile: any;
  forceRefresh: number;
  betWasCancelled: boolean;
  onBetAmountChange: (value: number) => void;
  onOptionSelect: (value: string) => void;
  onPlaceBet: () => void;
  onBetCancelled: () => void;
}

// Format amount utility function
const formatAmount = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const BettingInterfaceView = ({
  session,
  stream,
  streamId,
  betAmount,
  selectedOption,
  isPlacingBet,
  existingBet,
  profile,
  forceRefresh,
  betWasCancelled,
  onBetAmountChange,
  onOptionSelect,
  onPlaceBet,
  onBetCancelled,
}: BettingInterfaceViewProps) => {
  const [previousOutcome, setPreviousOutcome] = useState<string | null>(null);
  const [stateKey, setStateKey] = useState<string>('initial');
  const [lastBetId, setLastBetId] = useState<string | null>(null);
  const [recoveryAttempts, setRecoveryAttempts] = useState(0);
  const { toast } = useToast();
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedLocalOption, setSelectedLocalOption] = useState<string | null>(null);
  const [showBetPlacedConfirmation, setShowBetPlacedConfirmation] = useState(false);

  // Track stream betting_outcome changes to detect resets and generate new keys
  useEffect(() => {
    if (stream) {
      // If the outcome was previously set but is now null, this is a stream reset
      if (previousOutcome && stream.betting_outcome === null) {
        console.log('Stream betting has been reset from admin panel');
        onBetCancelled(); // Force a bet cancellation to reset the UI
        setStateKey(`reset-${Date.now()}`);
      }

      setPreviousOutcome(stream.betting_outcome);
    }
  }, [stream?.betting_outcome, previousOutcome, onBetCancelled]);

  // Generate a new state key when bet is cancelled or placed
  useEffect(() => {
    if (betWasCancelled) {
      setStateKey(`cancelled-${Date.now()}`);
      setLastBetId(null);
    } else if (existingBet && existingBet.id !== lastBetId) {
      console.log('New bet detected, updating state key');
      setStateKey(`existing-${existingBet.id}-${Date.now()}`);
      setLastBetId(existingBet.id);
      // Reset recovery attempts when we get a valid bet
      setRecoveryAttempts(0);
    }
  }, [betWasCancelled, existingBet, lastBetId]);

  // Add a recovery mechanism for when bets seem to fail
  useEffect(() => {
    if (isPlacingBet && recoveryAttempts < 3) {
      // Set up a recovery timer if we're placing a bet
      const recoveryTimer = setTimeout(() => {
        // If we're still in the placing state after 8 seconds, try recovery
        if (isPlacingBet) {
          console.log('Bet placement taking too long, attempting recovery');
          setRecoveryAttempts(prev => prev + 1);

          // Suggest the user to try again
          toast({
            title: 'Bet taking longer than expected',
            description: 'Please wait a moment or try placing your bet again',
            duration: 5000,
          });

          // Generate a new state key to force re-render
          setStateKey(`recovery-${Date.now()}`);
        }
      }, 8000);

      return () => clearTimeout(recoveryTimer);
    }
  }, [isPlacingBet, recoveryAttempts, toast]);

  // Set initial selected option if user has existing bet
  useEffect(() => {
    if (existingBet?.option) {
      setSelectedLocalOption(existingBet.option);
    } else {
      setSelectedLocalOption(selectedOption);
    }
  }, [existingBet, selectedOption]);

  // Show bet placed confirmation briefly
  useEffect(() => {
    if (existingBet && !showBetPlacedConfirmation) {
      setShowBetPlacedConfirmation(true);
      const timer = setTimeout(() => {
        setShowBetPlacedConfirmation(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [existingBet]);

  // Handle option selection with animation
  const handleOptionSelect = (option: string) => {
    if (existingBet || stream?.is_betting_locked) return;

    setIsAnimating(true);
    setSelectedLocalOption(option);
    setTimeout(() => {
      onOptionSelect(option);
      setIsAnimating(false);
    }, 300);
  };

  // Calculate max amount user can bet
  const maxAmount = profile?.wallet_balance || 1000;

  // Format UI labels
  const getStatusText = () => {
    if (stream?.winning_option) return `Winner: ${stream.betting_variable_a || 'Option A'}`;
    if (stream?.is_betting_locked) return 'Betting locked';
    if (stream?.state === 'live') return 'Betting open';
    return 'Waiting for stream to start';
  };

  // Check if user can place a bet
  const canPlaceBet = !!(
    session?.user?.id &&
    selectedOption &&
    betAmount > 0 &&
    !existingBet &&
    !stream?.is_betting_locked &&
    stream?.state === 'live'
  );

  // Check if stream exists and get bettingLocked status
  const bettingLocked = stream?.is_betting_locked;
  const bettingOutcome = stream?.winning_option;

  // User not logged in or betting is locked with no bet
  if (!session || (bettingLocked && !existingBet && !bettingOutcome)) {
    return (
      <Card className="p-6" data-testid="betting-status-card">
        <TotalPot
          key={`total-pot-${stateKey}-${forceRefresh}`}
          streamId={streamId}
          initialTotalBets={stream?.total_bets}
        />
        {!session ? (
          <LoginPrompt />
        ) : (
          <div className="text-center">
            <p className="text-lg font-medium text-muted-foreground">
              Betting is currently locked. Wait for the next round to place your bet.
            </p>
          </div>
        )}
      </Card>
    );
  }

  // Betting is locked but user has a bet OR outcome has been determined
  if ((bettingLocked && existingBet) || bettingOutcome) {
    return (
      <Card className="p-6" data-testid="betting-outcome-card">
        <TotalPot
          key={`total-pot-${stateKey}-${forceRefresh}`}
          streamId={streamId}
          initialTotalBets={stream?.total_bets}
        />
        <BettingStats winningOption={bettingOutcome} existingBet={existingBet} />
      </Card>
    );
  }

  // Show loading state while profile is loading
  if (!profile) {
    return (
      <Card className="p-6" data-testid="betting-loading-card">
        <TotalPot
          key={`total-pot-${stateKey}-${forceRefresh}`}
          streamId={streamId}
          initialTotalBets={stream?.total_bets}
        />
        <LoadingBettingInterface />
      </Card>
    );
  }

  // CRITICAL CHECK: If bet was cancelled or if we're in a new betting round, show new bet form ALWAYS
  if (betWasCancelled || (existingBet && existingBet.status !== 'pending')) {
    console.log('🚨 CANCELLED STATE OR NON-PENDING BET DETECTED. FORCING NEW BET FORM.');
    return (
      <Card className="p-6" data-testid="betting-new-form-card">
        <TotalPot
          key={`total-pot-${stateKey}-${forceRefresh}`}
          streamId={streamId}
          initialTotalBets={stream?.total_bets}
        />
        <BettingForm
          key={`betting-form-${stateKey}`}
          session={session}
          stream={stream}
          streamId={streamId}
          betAmount={betAmount}
          selectedOption={selectedOption}
          isPlacingBet={isPlacingBet}
          existingBet={null} // Force null to show create form
          profile={profile}
          onBetAmountChange={onBetAmountChange}
          onOptionSelect={onOptionSelect}
          onPlaceBet={onPlaceBet}
          onBetCancelled={onBetCancelled}
        />
      </Card>
    );
  }

  // Normal display based on existing bet state
  return (
    <Card className="relative overflow-hidden bg-card border border-border">
      {/* Pulsing border effect when betting is open */}
      {stream?.state === 'live' && !stream?.is_betting_locked && !existingBet && (
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div className="absolute inset-0 bg-primary/5 z-0"></div>
          <motion.div
            className="absolute -inset-1 bg-primary/20 z-0"
            animate={{
              boxShadow: [
                '0 0 0px rgba(155, 255, 0, 0)',
                '0 0 20px rgba(155, 255, 0, 0.3)',
                '0 0 0px rgba(155, 255, 0, 0)',
              ],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </div>
      )}

      <CardHeader className="relative z-10">
        <div className="flex items-center justify-between mb-1">
          <CardTitle className="text-xl flex items-center">
            Place Your Bet
            <span
              className={cn(
                'ml-3 text-sm font-light px-2 py-0.5 rounded-full',
                bettingOutcome
                  ? 'bg-primary/20 text-primary'
                  : bettingLocked
                    ? 'bg-orange-500/20 text-orange-500'
                    : stream?.state === 'live'
                      ? 'bg-green-500/20 text-green-500'
                      : 'bg-muted text-muted-foreground'
              )}
            >
              {getStatusText()}
            </span>
          </CardTitle>

          {/* Show refreshing indicator when cancellation is in progress */}
          {betWasCancelled && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center text-sm text-muted-foreground"
            >
              <RefreshCcw className="w-4 h-4 mr-1 animate-spin" />
              Refreshing...
            </motion.div>
          )}
        </div>
      </CardHeader>

      <CardContent className="relative z-10 space-y-6">
        {/* Total pot component */}
        <TotalPot streamId={streamId} />

        {/* Show user's existing bet with feedback */}
        <AnimatePresence>
          {existingBet && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-secondary/60 backdrop-blur-sm rounded-lg p-4 border border-border"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium flex items-center">
                    {showBetPlacedConfirmation && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mr-2 text-green-500"
                      >
                        <CheckCircle size={18} />
                      </motion.div>
                    )}
                    Your bet is placed
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatAmount(existingBet.amount)} on {stream?.betting_variable_a || 'Option A'}
                  </p>
                </div>

                {!stream?.is_betting_locked && !bettingOutcome && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={onBetCancelled}
                    disabled={betWasCancelled}
                  >
                    Cancel Bet
                  </Button>
                )}
              </div>

              {bettingOutcome && bettingOutcome === existingBet.option && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-3 p-2 bg-primary/20 text-primary rounded flex items-center"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Your bet won! Winnings will be added to your wallet.
                </motion.div>
              )}

              {bettingOutcome && bettingOutcome !== existingBet.option && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-3 p-2 bg-destructive/20 text-destructive-foreground rounded flex items-center"
                >
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Your bet lost. Better luck next time!
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Betting options */}
        {!bettingOutcome && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {['option_a', 'option_b'].map(option => (
                <motion.button
                  key={option}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    'relative p-6 rounded-lg text-center font-bold transition-all duration-200 border-2',
                    selectedLocalOption === option
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-secondary/30 hover:border-primary/50 hover:bg-primary/5',
                    (existingBet || stream?.is_betting_locked) && 'opacity-80 cursor-not-allowed'
                  )}
                  disabled={!!existingBet || stream?.is_betting_locked}
                  onClick={() => handleOptionSelect(option)}
                >
                  {/* Animated selection effect */}
                  {selectedLocalOption === option && (
                    <motion.div
                      layoutId="selectedOption"
                      className="absolute inset-0 rounded-lg border-2 border-primary"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{stream?.betting_variable_a || 'Option A'}</span>
                </motion.button>
              ))}
            </div>

            {/* Betting amount */}
            {!existingBet && !stream?.is_betting_locked && (
              <motion.div
                className="space-y-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{
                  opacity: selectedLocalOption ? 1 : 0.5,
                  y: 0,
                }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex justify-between items-center">
                  <div className="text-sm font-medium">Bet Amount</div>
                  <div className="text-xl font-bold text-primary">{formatAmount(betAmount)}</div>
                </div>

                <Slider
                  value={[betAmount]}
                  max={maxAmount}
                  step={10}
                  disabled={!selectedLocalOption || !!existingBet || stream?.is_betting_locked}
                  onValueChange={values => onBetAmountChange(values[0])}
                  className={cn(
                    'betting-slider',
                    (!selectedLocalOption || stream?.is_betting_locked) && 'opacity-50'
                  )}
                />

                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0</span>
                  <span>{formatAmount(maxAmount)}</span>
                </div>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center text-xs text-muted-foreground cursor-help">
                        <Info className="h-3 w-3 mr-1" />
                        Balance: {formatAmount(profile?.wallet_balance || 0)}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Your current wallet balance</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <Button
                  className="w-full mt-4"
                  disabled={!canPlaceBet || isPlacingBet}
                  onClick={onPlaceBet}
                  variant={canPlaceBet ? 'default' : 'secondary'}
                >
                  {isPlacingBet ? (
                    <>
                      <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                      Placing Bet...
                    </>
                  ) : (
                    `Place Bet${selectedOption ? ` on ${stream?.betting_variable_a || 'Option A'}` : ''}`
                  )}
                </Button>
              </motion.div>
            )}
          </div>
        )}

        {/* No session message */}
        {!session?.user?.id && (
          <div className="bg-muted/30 border border-border rounded-lg p-4 text-center">
            <p className="text-muted-foreground">Sign in to place bets and join the action!</p>
            <Button
              variant="outline"
              className="mt-2"
              onClick={() => {
                window.location.href = '/login';
              }}
            >
              Sign In
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
