import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface WithdrawAmountInputProps {
  amount: string;
  onChange: (amount: string) => void;
  currentBalance: number;
  disabled?: boolean;
}

export const WithdrawAmountInput = ({
  amount,
  onChange,
  currentBalance,
  disabled,
}: WithdrawAmountInputProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="amount">Amount to Withdraw (USD)</Label>
      <Input
        id="amount"
        type="number"
        min="1"
        step="1"
        value={amount}
        onChange={e => onChange(e.target.value.split('.')[0])}
        placeholder="Enter amount"
        disabled={disabled}
      />
      <p className="text-sm text-muted-foreground">
        Available balance: ${currentBalance.toFixed(2)}
      </p>
    </div>
  );
};
