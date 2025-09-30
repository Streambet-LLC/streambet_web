import { Input } from '@/components/ui/input';

interface AmountInputProps {
  amount: string;
  onChange: (value: string) => void;
  disabled: boolean;
}

export const AmountInput = ({ amount, onChange, disabled }: AmountInputProps) => {
  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-foreground">Amount to Deposit (USD)</label>
      <Input
        type="number"
        min="2"
        step="1"
        value={amount}
        onChange={e => {
          const value = e.target.value.split('.')[0];
          onChange(value);
        }}
        placeholder="Enter amount (minimum $2)"
        disabled={disabled}
      />
    </div>
  );
};
