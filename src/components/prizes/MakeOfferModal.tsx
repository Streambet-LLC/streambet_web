import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { prizeAPI } from '@/integrations/api/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { getThumbnailUrl } from '@/utils/helper';

interface Prize {
  id: string;
  name: string;
  description: string;
  amount: number;
  imageUrl: string;
  category?: string;
  stock?: number;
}

interface ShippingAddress {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

interface MakeOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  prize: Prize;
}

export function MakeOfferModal({ isOpen, onClose, prize }: MakeOfferModalProps) {
  const { toast } = useToast();
  const { session } = useAuthContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerNotes, setOfferNotes] = useState('');
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const amount = parseFloat(offerAmount);
      if (isNaN(amount) || amount <= 0) {
        toast({
          title: 'Invalid Amount',
          description: 'Please enter a valid offer amount',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      if (!session) {
        toast({
          title: 'Authentication Required',
          description: 'Please sign in to make an offer',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      await prizeAPI.makeOffer({
        prizeConfigId: prize.id,
        shippingAddress,
        offerAmount: amount,
        offerNotes: offerNotes || undefined,
      });

      toast({
        title: 'Offer Submitted! 🎉',
        description: "Your offer has been sent. We'll notify you once it's reviewed.",
      });

      onClose();

      setOfferAmount('');
      setOfferNotes('');
      setShippingAddress({
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'United States',
      });
    } catch (error: any) {
      console.error('Failed to submit offer:', error);
      toast({
        title: 'Failed to Submit Offer',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Make an Offer - {prize.name}</DialogTitle>
          <DialogDescription>Submit your offer and shipping details for review</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-muted p-4 rounded-lg">
            <div className="flex items-center gap-4">
              {prize.imageUrl && (
                <img
                  src={getThumbnailUrl(prize.imageUrl)}
                  alt={prize.name}
                  className="w-16 h-16 object-cover rounded-lg"
                />
              )}
              <div className="flex-1">
                <p className="font-semibold">{prize.name}</p>
                <div className="text-sm text-muted-foreground space-y-1 mt-1">
                  <div className="flex justify-between">
                    <span>Price:</span>
                    <span>${prize.amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping:</span>
                    <span>$5.00</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="offerAmount" className="text-base font-semibold">
                Your Offer Amount ($) *
              </Label>
              <Input
                id="offerAmount"
                type="number"
                step="0.01"
                min="0.01"
                value={offerAmount}
                onChange={e => setOfferAmount(e.target.value)}
                onInput={e => {
                  const input = e.currentTarget;
                  if (parseFloat(input.value) < 0) {
                    input.value = '';
                    setOfferAmount('');
                  }
                }}
                placeholder="Enter your offer"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="offerNotes">Notes (Optional)</Label>
              <Textarea
                id="offerNotes"
                value={offerNotes}
                onChange={e => setOfferNotes(e.target.value)}
                placeholder="Add any additional information..."
                maxLength={500}
                className="min-h-[80px]"
              />
              <p className="text-xs text-muted-foreground">{offerNotes.length}/500</p>
            </div>

            <div className="space-y-4">
              <Label className="text-base font-semibold">Shipping Address</Label>

              <div className="space-y-2">
                <Label htmlFor="address1">Street Address *</Label>
                <Input
                  id="address1"
                  value={shippingAddress.addressLine1}
                  onChange={e =>
                    setShippingAddress({ ...shippingAddress, addressLine1: e.target.value })
                  }
                  placeholder="123 Main St"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address2">Apartment, Suite, etc.</Label>
                <Input
                  id="address2"
                  value={shippingAddress.addressLine2}
                  onChange={e =>
                    setShippingAddress({ ...shippingAddress, addressLine2: e.target.value })
                  }
                  placeholder="Apt 4B"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={shippingAddress.city}
                    onChange={e => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                    placeholder="New York"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State/Province *</Label>
                  <Input
                    id="state"
                    value={shippingAddress.state}
                    onChange={e =>
                      setShippingAddress({ ...shippingAddress, state: e.target.value })
                    }
                    placeholder="NY"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="zip">ZIP/Postal Code *</Label>
                <Input
                  id="zip"
                  value={shippingAddress.zipCode}
                  onChange={e =>
                    setShippingAddress({ ...shippingAddress, zipCode: e.target.value })
                  }
                  placeholder="10001"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country *</Label>
                <Input
                  id="country"
                  type="text"
                  value="United States"
                  disabled
                  className="bg-muted cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">
                  We currently ship to the United States only
                </p>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Offer'
              )}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
