import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/integrations/api/client';
import { getMessage } from '@/utils/helper';

export interface ShippingAddress {
  firstName: string;
  lastName: string;
  address: string;
  address2: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

const EMPTY: ShippingAddress = {
  firstName: '',
  lastName: '',
  address: '',
  address2: '',
  city: '',
  state: '',
  zipCode: '',
  country: 'United States',
};

export function isAddressComplete(a: Partial<ShippingAddress> | null | undefined): boolean {
  return !!(a?.firstName && a.lastName && a.address && a.city && a.state && a.zipCode);
}

export async function fetchMyAddress(): Promise<ShippingAddress> {
  const r = await apiClient.get('/users/me/address');
  const d = r.data?.data ?? {};
  return {
    ...EMPTY,
    ...Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v ?? ''])),
  } as ShippingAddress;
}

/** Where we ship the item if you win. Saved to your profile. */
export function ShippingAddressForm({
  initial,
  onSaved,
}: {
  initial?: ShippingAddress | null;
  onSaved: (a: ShippingAddress) => void;
}) {
  const [form, setForm] = useState<ShippingAddress>(initial ?? EMPTY);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (initial) setForm(initial);
  }, [initial]);

  const set = (k: keyof ShippingAddress) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAddressComplete(form)) {
      toast.error('Fill in name, street, city, state and ZIP.');
      return;
    }
    setSaving(true);
    try {
      await apiClient.patch('/users/me', form);
      onSaved(form);
    } catch (err) {
      toast.error(getMessage(err) || 'Could not save your address.');
    } finally {
      setSaving(false);
    }
  };

  const field = (k: keyof ShippingAddress, label: string, opts: { autoComplete?: string; span?: boolean } = {}) => (
    <div className={opts.span ? 'col-span-2' : ''}>
      <Label htmlFor={`ship-${k}`} className="text-xs text-white/60">
        {label}
      </Label>
      <Input
        id={`ship-${k}`}
        value={form[k]}
        onChange={set(k)}
        autoComplete={opts.autoComplete}
        className="mt-1 h-10 border-white/10 bg-black/40 text-white"
      />
    </div>
  );

  return (
    <form onSubmit={save} className="space-y-3">
      <p className="text-sm text-white/70">Where should we ship it if you win?</p>
      <div className="grid grid-cols-2 gap-3">
        {field('firstName', 'First name', { autoComplete: 'given-name' })}
        {field('lastName', 'Last name', { autoComplete: 'family-name' })}
        {field('address', 'Street address', { autoComplete: 'address-line1', span: true })}
        {field('address2', 'Apt, suite (optional)', { autoComplete: 'address-line2', span: true })}
        {field('city', 'City', { autoComplete: 'address-level2' })}
        {field('state', 'State', { autoComplete: 'address-level1' })}
        {field('zipCode', 'ZIP', { autoComplete: 'postal-code' })}
        {field('country', 'Country', { autoComplete: 'country-name' })}
      </div>
      <Button
        type="submit"
        disabled={saving}
        className="h-10 w-full bg-[#C7FA09] font-bold text-black hover:bg-[#d6ff3d]"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save address'}
      </Button>
    </form>
  );
}
