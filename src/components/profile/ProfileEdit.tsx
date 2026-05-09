import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { userAPI } from '@/integrations/api/client';
import { PublicUserProfile } from '@/types/profile';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { COLLECTION_CATEGORIES } from '@/constants/collectionCategories';
import { Loader2 } from 'lucide-react';

interface ProfileEditProps {
  profile: PublicUserProfile;
  onCancel: () => void;
  onSaveSuccess: () => void;
}

export default function ProfileEdit({ profile, onCancel, onSaveSuccess }: ProfileEditProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: profile.name || '',
    city: profile.city || '',
    state: profile.state || '',
    country: profile.country || '',
    collectionPreferences: profile.collectionPreferences || [],
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await userAPI.updateProfile(data);
      return response?.data;
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Profile updated successfully',
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      onSaveSuccess();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.response?.data?.message || 'Failed to update profile',
        variant: 'destructive',
      });
    },
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCollectionPreferenceChange = (categoryValue: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      collectionPreferences: checked
        ? [...prev.collectionPreferences, categoryValue]
        : prev.collectionPreferences.filter(c => c !== categoryValue),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-border">
          <div className="h-6 w-1 bg-primary rounded-full" />
          <h3 className="text-lg font-bold text-foreground">Edit Profile</h3>
        </div>

        {/* Profile Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label
              htmlFor="name"
              className="text-sm font-semibold text-foreground uppercase tracking-wide"
            >
              Name
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={e => handleInputChange('name', e.target.value)}
              placeholder="Your name"
              className="mt-2 focus-visible:ring-primary"
            />
          </div>

          <div>
            <Label
              htmlFor="city"
              className="text-sm font-semibold text-foreground uppercase tracking-wide"
            >
              City
            </Label>
            <Input
              id="city"
              value={formData.city}
              onChange={e => handleInputChange('city', e.target.value)}
              placeholder="City"
              className="mt-2 focus-visible:ring-primary"
            />
          </div>

          <div>
            <Label
              htmlFor="state"
              className="text-sm font-semibold text-foreground uppercase tracking-wide"
            >
              State
            </Label>
            <Input
              id="state"
              value={formData.state}
              onChange={e => handleInputChange('state', e.target.value)}
              placeholder="State"
              className="mt-2 focus-visible:ring-primary"
            />
          </div>

          <div>
            <Label
              htmlFor="country"
              className="text-sm font-semibold text-foreground uppercase tracking-wide"
            >
              Country
            </Label>
            <Input
              id="country"
              value={formData.country}
              onChange={e => handleInputChange('country', e.target.value)}
              placeholder="Country"
              className="mt-2 focus-visible:ring-primary"
            />
          </div>
        </div>

        {/* Collection Preferences */}
        <div>
          <Label className="text-sm font-semibold text-foreground block mb-3 uppercase tracking-wide">
            Items You Like to Collect
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {COLLECTION_CATEGORIES.map(category => {
              const isChecked = formData.collectionPreferences.includes(category.value);
              return (
                <label
                  key={category.value}
                  htmlFor={category.value}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer transition-colors ${
                    isChecked
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-background hover:border-primary/50 text-muted-foreground'
                  }`}
                >
                  <Checkbox
                    id={category.value}
                    checked={isChecked}
                    onCheckedChange={checked =>
                      handleCollectionPreferenceChange(category.value, checked as boolean)
                    }
                    className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:border-primary"
                  />
                  <span className="text-sm font-medium">{category.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            type="submit"
            disabled={updateMutation.isPending}
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
          <Button
            type="button"
            onClick={onCancel}
            disabled={updateMutation.isPending}
            variant="outline"
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
