import { Card } from '@/components/ui/card';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
interface BettingStatsProps {
  winningOption?: string | null;
  existingBet?: {
    amount: number;
    bet_option: string;
    status?: string;
  } | null;
}
export const BettingStats = ({ winningOption, existingBet }: BettingStatsProps) => {
  const { toast } = useToast();
  const [isWinner, setIsWinner] = useState<boolean | null>(null);
  const [winAmount, setWinAmount] = useState<number>(0);

  // Get current wallet balance
  const { data: profile } = useQuery({
    queryKey: ['profile-for-betting-stats'],
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', session.user.id)
        .single();
      if (error) throw error;
      return data;
    },
  });
  useEffect(() => {
    // Determine if user won when winningOption changes
    if (winningOption && existingBet) {
      const userWon = existingBet.bet_option === winningOption;
      setIsWinner(userWon);

      // Calculate winnings - for winners, they win double their bet
      // For losers, they lose their bet
      if (userWon) {
        setWinAmount(existingBet.amount * 2); // Double the bet for winners

        toast({
          title: 'You Won!',
          description: `Your bet on ${winningOption} was correct!`,
          duration: 10000,
        });
      } else if (isWinner === null) {
        // Only show loss notification once
        setWinAmount(-existingBet.amount); // Negative for losses

        toast({
          title: 'Better Luck Next Time',
          description: `The winning option was ${winningOption}, but you bet on ${existingBet.bet_option}.`,
          variant: 'destructive',
          duration: 10000,
        });
      }
    }
  }, [winningOption, existingBet, toast, isWinner]);
  return (
    <div className="text-center space-y-4">
      <div className="space-y-4">
        <div className="flex items-center justify-center space-x-2">
          {isWinner ? (
            <CheckCircle2 className="h-6 w-6 text-green-500" />
          ) : (
            <XCircle className="h-6 w-6 text-red-500" />
          )}
          <p className="text-lg font-medium">
            {isWinner ? 'Congratulations! You won the bet!' : 'Better luck next time!'}
          </p>
        </div>

        <div className="p-4 bg-muted rounded-lg space-y-2">
          <p className="font-medium">
            The winning option was: <span className="font-bold">{winningOption}</span>
          </p>

          {isWinner ? (
            <p className="text-green-500 font-bold">You won {winAmount.toFixed(0)} Free Coins!</p>
          ) : (
            <p className="text-red-500 font-medium">
              You lost {Math.abs(winAmount).toFixed(0)} Free Coins
            </p>
          )}

          <div className="mt-4 flex justify-center">
            <div className="py-3 px-4 bg-amber-50 rounded-md border border-amber-200 flex items-center justify-center w-full">
              <p className="text-center text-lime-950">
                Next betting round coming soon! The stream continues.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
