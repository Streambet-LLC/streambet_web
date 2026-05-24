import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CreditCard, Landmark } from 'lucide-react';

export type StripePaymentMethod = 'card' | 'us_bank_account';

export const BUYER_CARD_FEE_PERCENT = 3;
export const BUYER_ACH_FEE_PERCENT = 0.8;

export function getBuyerFeePercent(method: StripePaymentMethod): number {
  return method === 'us_bank_account' ? BUYER_ACH_FEE_PERCENT : BUYER_CARD_FEE_PERCENT;
}

interface StripePaymentMethodPickerProps {
  value: StripePaymentMethod;
  onChange: (method: StripePaymentMethod) => void;
  /** Optional subtitle shown above the options. */
  title?: string;
  /** Show "Settles in 3-5 business days" hint on ACH. Defaults to true. */
  showAchSettlementHint?: boolean;
  disabled?: boolean;
}

/**
 * Lets the buyer pick between paying with a card (3% fee) or a US bank
 * account / ACH (0.8% fee). The chosen value is sent to the backend
 * which (a) uses it to compute the buyer fee at the correct tier and
 * (b) restricts the Stripe Checkout `payment_method_types` to that
 * single value so the buyer can't bypass the fee tier client-side.
 */
export default function StripePaymentMethodPicker({
  value,
  onChange,
  title = 'Payment Method',
  showAchSettlementHint = true,
  disabled = false,
}: StripePaymentMethodPickerProps) {
  return (
    <div className="space-y-2">
      {title && <Label className="text-sm font-medium">{title}</Label>}
      <RadioGroup
        value={value}
        onValueChange={v => onChange(v as StripePaymentMethod)}
        className="grid grid-cols-1 sm:grid-cols-2 gap-2"
        disabled={disabled}
      >
        <label
          htmlFor="stripe-method-card"
          className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
            value === 'card'
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <RadioGroupItem id="stripe-method-card" value="card" className="mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CreditCard className="h-4 w-4" />
              Card
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {BUYER_CARD_FEE_PERCENT}% processing fee · Instant
            </p>
          </div>
        </label>
        <label
          htmlFor="stripe-method-ach"
          className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
            value === 'us_bank_account'
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <RadioGroupItem
            id="stripe-method-ach"
            value="us_bank_account"
            className="mt-0.5"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Landmark className="h-4 w-4" />
              Bank (ACH)
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {BUYER_ACH_FEE_PERCENT}% processing fee
              {showAchSettlementHint ? ' · Settles in 3–5 business days' : ''}
            </p>
          </div>
        </label>
      </RadioGroup>
    </div>
  );
}
