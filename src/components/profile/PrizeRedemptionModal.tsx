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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Info } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { prizeAPI } from '@/integrations/api/client';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { handleMutationError } from '@/lib/mutationHelpers';
import type { PrizeCategory, SubmitPrizeRedemptionRequest, UserAddress } from '@/types/prize';

interface PrizeRedemptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  prizeConfigId: string;
  prizeName: string;
  prizeAmount: number;
  prizeLevel: number;
}

const PRIZE_CATEGORIES: { value: PrizeCategory; label: string }[] = [
  { value: 'pokemon', label: 'Pokémon' },
  { value: 'one_piece', label: 'One Piece' },
  { value: 'football', label: 'Football' },
  { value: 'basketball', label: 'Basketball' },
  { value: 'baseball', label: 'Baseball' },
];

export default function PrizeRedemptionModal({
  isOpen,
  onClose,
  prizeConfigId,
  prizeName,
  prizeAmount,
  prizeLevel,
}: PrizeRedemptionModalProps) {
  const queryClient = useQueryClient();

  // Fetch user's address
  const { data: userAddress, isLoading: isLoadingAddress } = useQuery<UserAddress>({
    queryKey: ['userAddress'],
    queryFn: async () => {
      const response = await prizeAPI.getMyAddress();
      return response;
    },
    enabled: isOpen,
  });

  // Consolidated form state
  const [formData, setFormData] = useState({
    prizeCategory: '' as PrizeCategory | '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
  });

  // Helper to update form fields
  const updateField = (field: keyof typeof formData, value: string | PrizeCategory) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Pre-fill address when user data loads
  useEffect(() => {
    if (userAddress) {
      setFormData(prev => ({
        ...prev,
        addressLine1: userAddress.address || '',
        addressLine2: userAddress.address2 || '',
        city: userAddress.city || '',
        state: userAddress.state || '',
        zipCode: userAddress.zipCode || '',
        country: userAddress.country || '',
      }));
    }
  }, [userAddress]);

  // Submission mutation
  const submitRedemptionMutation = useMutation({
    mutationFn: (data: SubmitPrizeRedemptionRequest) => prizeAPI.submitRedemption(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userRedemptions'] });
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      queryClient.invalidateQueries({ queryKey: ['userAddress'] });
      toast({
        title: 'Success!',
        description: `Your ${prizeName} prize redemption has been submitted successfully.`,
      });
      handleClose();
    },
    onError: (error) => handleMutationError(error, 'Failed to submit redemption. Please try again.'),
  });

  const resetForm = () => {
    setFormData(prev => ({ ...prev, prizeCategory: '' }));
    // Keep address fields from user data
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.prizeCategory) {
      toast({
        title: 'Error',
        description: 'Please select a prize category',
        variant: 'destructive',
      });
      return;
    }

    submitRedemptionMutation.mutate({
      prizeConfigId,
      prizeLevel,
      prizeCategory: formData.prizeCategory as PrizeCategory,
      shippingAddress: {
        addressLine1: formData.addressLine1,
        addressLine2: formData.addressLine2,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        country: formData.country,
      },
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Redeem {prizeName} Prize</DialogTitle>
          <DialogDescription className="text-base pt-2">
            Congratulations on achieving {prizeAmount.toLocaleString('en-US')} lifetime coins!
          </DialogDescription>
        </DialogHeader>

        <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-sm text-blue-900 dark:text-blue-100">
            Check the <strong>Prizes</strong> page (coming soon) to view all available prize categories and details.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isLoadingAddress ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="ml-2">Loading address...</span>
            </div>
          ) : (
            <>
              {/* Prize Category */}
              <div className="space-y-2">
                <Label htmlFor="category">Prize Category *</Label>
                <Select value={formData.prizeCategory} onValueChange={(value) => updateField('prizeCategory', value as PrizeCategory)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a prize category" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIZE_CATEGORIES.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Shipping Address */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Shipping Address</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="addressLine1">Address Line 1 *</Label>
                  <Input
                    id="addressLine1"
                    value={formData.addressLine1}
                    onChange={(e) => updateField('addressLine1', e.target.value)}
                    placeholder="123 Main Street"
                    required
                  />
                    </div>

                <div className="space-y-2">
                  <Label htmlFor="addressLine2">Address Line 2</Label>
                  <Input
                    id="addressLine2"
                    value={formData.addressLine2}
                    onChange={(e) => updateField('addressLine2', e.target.value)}
                    placeholder="Apt, Suite, Unit, etc. (optional)"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => updateField('city', e.target.value)}
                      placeholder="New York"
                      required
                    />
                  </div>

              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => updateField('state', e.target.value)}
                  placeholder="NY"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="zipCode">Zip Code *</Label>
                <Input
                  id="zipCode"
                  value={formData.zipCode}
                  onChange={(e) => updateField('zipCode', e.target.value)}
                  placeholder="10001"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country *</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => updateField('country', e.target.value)}
                  placeholder="United States"
                  required
                />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={submitRedemptionMutation.isPending}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitRedemptionMutation.isPending || isLoadingAddress}
                  className="flex-1"
                >
                  {submitRedemptionMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Redemption'
                  )}
                </Button>
              </div>
            </>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
