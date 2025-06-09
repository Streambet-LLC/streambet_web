import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface UserBalanceAdjusterProps {
  userId: string;
  onSuccess: () => Promise<void>;
}

export const UserBalanceAdjuster = ({ userId, onSuccess }: UserBalanceAdjusterProps) => {
  const { toast } = useToast();
  const [amount, setAmount] = useState<string>('');

  const adjustBalance = async () => {
    const numAmount = Number(amount);
    if (!numAmount || isNaN(numAmount)) {
      toast({
        title: 'Error',
        description: 'Please enter a valid amount',
        variant: 'destructive',
      });
      return;
    }

    try {
      console.log('Adjusting balance for user:', userId, 'amount:', numAmount);

      const { error } = await supabase.functions.invoke('admin-adjust-balance', {
        body: {
          userId,
          amount: numAmount,
          description: `Manual balance adjustment of $${numAmount}`,
        },
      });

      if (error) throw error;

      await onSuccess();
      setAmount('');

      toast({
        title: 'Success',
        description: `Balance adjusted successfully`,
      });
    } catch (error: any) {
      console.error('Error adjusting balance:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        placeholder="Amount"
        value={amount}
        onChange={e => setAmount(e.target.value)}
        className="w-24"
      />
      <Button variant="outline" onClick={adjustBalance} disabled={!amount || isNaN(Number(amount))}>
        Adjust Balance
      </Button>
    </div>
  );
};
