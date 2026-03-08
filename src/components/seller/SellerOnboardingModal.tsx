import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { api } from '@/integrations/api/client';
import { useToast } from '@/hooks/use-toast';
import { useImageCropper } from '@/hooks/useImageCropper';
import PhotoCropper from '@/components/PhotoCropper';
import { useAuthContext } from '@/contexts/AuthContext';

interface SellerOnboardingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function SellerOnboardingModal({
  open,
  onOpenChange,
  onComplete,
}: SellerOnboardingModalProps) {
  const { session } = useAuthContext();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const [location, setLocation] = useState('');
  const [tradingExperience, setTradingExperience] = useState('');
  const [shopName, setShopName] = useState('');
  const [socials, setSocials] = useState({
    instagram: '',
    twitter: '',
    tiktok: '',
  });

  const imageUpload = useImageCropper({
    checkNSFW: false,
  });

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocation(e.target.value);
  };

  const handleSocialChange = (social: keyof typeof socials, value: string) => {
    setSocials(prev => ({ ...prev, [social]: value }));
  };

  const handleComplete = async () => {
    if (!location.trim()) {
      toast({
        title: 'Error',
        description: 'Location is required',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      let profileImageUrl = session?.profileImageUrl;

      // Upload image if selected
      if (imageUpload.selectedFile) {
        const response = await api.auth.uploadImage(imageUpload.selectedFile, 'thumbnail');
        const url = response?.data?.Key;
        if (url && typeof url === 'string') {
          profileImageUrl = url;
        }
      }

      // Save all onboarding data
      await api.user.updateProfile({
        country: location,
        shopName,
        sellerTradingExperience: tradingExperience,
        socials: {
          instagram: socials.instagram,
          twitter: socials.twitter,
          tiktok: socials.tiktok,
        },
        sellerOnboardingCompleted: true,
        ...(profileImageUrl && { profileImageUrl }),
      });

      toast({
        title: 'Success',
        description: 'Onboarding completed!',
      });

      onComplete();
    } catch (error) {
      console.error('Onboarding error:', error);
      toast({
        title: 'Error',
        description: 'Failed to complete onboarding',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Welcome to Your Shop!</DialogTitle>
          <DialogDescription>
            Let's get your seller profile set up. Step {step} of 3
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 overflow-y-auto flex-1 px-2">
          {/* Step 1: Location */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="location" className="text-base font-semibold">
                  Where are you from? <span className="text-red-500">*</span>
                </Label>
                <p className="text-sm text-muted-foreground mb-2">
                  This helps buyers know where items are coming from
                </p>
                <Input
                  id="location"
                  placeholder="e.g., United States, New York"
                  value={location}
                  onChange={handleLocationChange}
                  className="mt-2"
                />
              </div>
            </div>
          )}

          {/* Step 2: Trading Experience & Shop Info */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="experience" className="text-base font-semibold">
                  How long have you been trading/selling cards?
                </Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Optional - helps build trust with buyers
                </p>
                <Textarea
                  id="experience"
                  placeholder="e.g., 5 years, selling locally and online, focus on vintage cards..."
                  value={tradingExperience}
                  onChange={e => setTradingExperience(e.target.value)}
                  className="mt-2"
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="shopName" className="text-base font-semibold">
                  Shop Name
                </Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Optional - leave blank to use your username
                </p>
                <Input
                  id="shopName"
                  placeholder="e.g., John's Card Collection"
                  value={shopName}
                  onChange={e => setShopName(e.target.value)}
                  className="mt-2"
                />
              </div>
            </div>
          )}

          {/* Step 3: Profile & Socials */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">
                  {session?.profileImageUrl ? 'Update Profile Picture' : 'Profile Picture'}
                </Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Optional - helps buyers recognize you
                </p>

                {session?.profileImageUrl &&
                  !imageUpload.previewUrl &&
                  !imageUpload.imageToCrop && (
                    <div className="space-y-3 mb-4">
                      <p className="text-sm text-muted-foreground">Current picture:</p>
                      <img
                        src={session.profileImageUrl}
                        alt="Current Profile"
                        className="w-32 h-32 rounded-lg object-cover"
                      />
                    </div>
                  )}

                {imageUpload.imageToCrop ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">Crop your image:</p>
                    <PhotoCropper
                      file={imageUpload.fileToCrop!}
                      onCrop={imageUpload.handleCropComplete}
                      onClose={imageUpload.cancelCrop}
                    />
                  </div>
                ) : imageUpload.previewUrl ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">Cropped preview:</p>
                    <div className="flex justify-center">
                      <img
                        src={imageUpload.previewUrl}
                        alt="Preview"
                        className="w-32 h-32 rounded-lg object-cover"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        imageUpload.clearImage();
                      }}
                    >
                      Remove Image
                    </Button>
                  </div>
                ) : (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        await imageUpload.handleFileSelect(file);
                      }
                    }}
                    className="border border-dashed rounded-lg p-4 w-full text-center cursor-pointer"
                  />
                )}
              </div>

              <div className="space-y-3">
                <Label className="text-base font-semibold">Social Media</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Optional - help buyers follow you
                </p>

                <div>
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input
                    id="instagram"
                    placeholder="https://instagram.com/username"
                    value={socials.instagram}
                    onChange={e => handleSocialChange('instagram', e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="twitter">Twitter/X</Label>
                  <Input
                    id="twitter"
                    placeholder="https://twitter.com/username"
                    value={socials.twitter}
                    onChange={e => handleSocialChange('twitter', e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="tiktok">TikTok</Label>
                  <Input
                    id="tiktok"
                    placeholder="https://tiktok.com/@username"
                    value={socials.tiktok}
                    onChange={e => handleSocialChange('tiktok', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between gap-3 pt-4 border-t mt-4 flex-shrink-0">
          <Button
            variant="outline"
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1 || isLoading}
          >
            Back
          </Button>

          {step < 3 ? (
            <Button
              onClick={() => {
                if (step === 1 && !location.trim()) {
                  toast({
                    title: 'Error',
                    description: 'Location is required',
                    variant: 'destructive',
                  });
                  return;
                }
                setStep(step + 1);
              }}
              disabled={isLoading}
            >
              Next
            </Button>
          ) : (
            <Button onClick={handleComplete} disabled={isLoading || !location.trim()}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Complete Onboarding
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
