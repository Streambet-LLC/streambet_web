import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PayPalEmailInputProps {
  email: string;
  onChange: (email: string) => void;
  disabled?: boolean;
}

export const PayPalEmailInput = ({ email, onChange, disabled }: PayPalEmailInputProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="paypalEmail">PayPal Email</Label>
      <Input
        id="paypalEmail"
        type="email"
        value={email}
        onChange={e => onChange(e.target.value)}
        placeholder="Enter your PayPal email"
        disabled={disabled}
        required
      />
    </div>
  );
};
