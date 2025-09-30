import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const useWithdraw = (onSuccess: () => void) => {
  const [amount, setAmount] = useState('');
  const [paypalEmail, setPaypalEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleWithdraw = async (currentBalance: number) => {
    const withdrawAmount = Number(amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid amount to withdraw',
        variant: 'destructive',
      });
      return;
    }

    if (withdrawAmount > currentBalance) {
      toast({
        title: 'Insufficient funds',
        description: 'You cannot withdraw more than your current balance',
        variant: 'destructive',
      });
      return;
    }

    if (!paypalEmail) {
      toast({
        title: 'PayPal email required',
        description: 'Please enter your PayPal email address',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      await supabase.from('profiles').update({ paypal_email: paypalEmail }).eq('id', user.id);

      // Use sandbox function for development
      const { data: payoutData, error: payoutError } = await supabase.functions.invoke(
        'paypal-sandbox',
        {
          body: { amount: withdrawAmount, email: paypalEmail },
        }
      );

      if (payoutError) throw payoutError;

      const { error: transactionError } = await supabase.from('wallet_transactions').insert({
        user_id: user.id,
        amount: -withdrawAmount,
        type: 'withdrawal',
        description: 'PayPal withdrawal',
        status: 'completed',
        payout_id: payoutData.batch_header.payout_batch_id,
      });

      if (transactionError) throw transactionError;

      const { error: balanceError } = await supabase.rpc('increment', {
        p_user_id: user.id,
        p_amount: -withdrawAmount,
      });

      if (balanceError) throw balanceError;

      toast({
        title: 'Withdrawal successful',
        description: 'Your funds are being sent to your PayPal account',
      });

      setAmount('');
      setPaypalEmail('');
      onSuccess();
    } catch (error) {
      console.error('Withdrawal error:', error);
      toast({
        title: 'Error',
        description: 'Failed to process withdrawal. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    amount,
    setAmount,
    paypalEmail,
    setPaypalEmail,
    isProcessing,
    handleWithdraw,
  };
};
