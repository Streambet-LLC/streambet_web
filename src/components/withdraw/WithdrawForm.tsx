import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PayPalEmailInput } from './PayPalEmailInput';
import { WithdrawAmountInput } from './WithdrawAmountInput';
import { useWithdraw } from '@/hooks/useWithdraw';

interface WithdrawFormProps {
  currentBalance: number;
  onSuccess: () => void;
}

export const WithdrawForm = ({ currentBalance, onSuccess }: WithdrawFormProps) => {
  const { amount, setAmount, paypalEmail, setPaypalEmail, isProcessing, handleWithdraw } =
    useWithdraw(onSuccess);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleWithdraw(currentBalance);
  };

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <PayPalEmailInput email={paypalEmail} onChange={setPaypalEmail} disabled={isProcessing} />

        <WithdrawAmountInput
          amount={amount}
          onChange={setAmount}
          currentBalance={currentBalance}
          disabled={isProcessing}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={
            isProcessing ||
            !amount ||
            !paypalEmail ||
            Number(amount) <= 0 ||
            Number(amount) > currentBalance
          }
        >
          {isProcessing ? 'Processing...' : 'Request Withdrawal'}
        </Button>
      </form>
    </Card>
  );
};
