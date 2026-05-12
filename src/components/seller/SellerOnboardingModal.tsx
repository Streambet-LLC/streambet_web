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
import { getImageLink } from '@/utils/helper';

interface SellerOnboardingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

interface SellerOnboardingFormProps {
  onComplete: () => void;
  /** When true (default), renders inside Dialog chrome (no header/title). */
  embedded?: boolean;
}

export function SellerOnboardingModal({
  open,
  onOpenChange,
  onComplete,
}: SellerOnboardingModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Welcome to Your Shop!</DialogTitle>
          <DialogDescription>
            Let's get your seller profile set up.
          </DialogDescription>
        </DialogHeader>
        <SellerOnboardingForm onComplete={onComplete} embedded />
      </DialogContent>
    </Dialog>
  );
}

export function SellerOnboardingForm({
  onComplete,
  embedded = false,
}: SellerOnboardingFormProps) {
  const { session } = useAuthContext();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const [location, setLocation] = useState(() => session?.country || '');
  const [tradingExperience, setTradingExperience] = useState(
    () => session?.sellerTradingExperience || ''
  );
  const [shopName, setShopName] = useState(() => session?.shopName || '');
  const [socials, setSocials] = useState(() => ({
    instagram: session?.socials?.instagram || '',
    twitter: session?.socials?.twitter || '',
    youtube: session?.socials?.youtube || '',
    tiktok: session?.socials?.tiktok || '',
  }));

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

      // Save all onboarding data. Setting sellerProfileCompleted=true also
      // flips is_seller server-side, so the user is a seller from this
      // point on — even if they bail before finishing Stripe.
      await api.user.updateProfile({
        country: location,
        shopName,
        sellerTradingExperience: tradingExperience,
        socials: {
          instagram: socials.instagram,
          twitter: socials.twitter,
          youtube: socials.youtube,
          tiktok: socials.tiktok,
        },
        sellerProfileCompleted: true,
        ...(profileImageUrl && { profileImageUrl }),
      });

      toast({
        title: 'Welcome aboard!',
        description: "Redirecting you to Stripe to set up payouts…",
      });

      // Kick off Stripe Connect onboarding right away. If the user bails on
      // Stripe, the SellerOnboardingBanner will keep prompting them.
      try {
        const data = await api.creator.generateAccountLink();
        const url =
          typeof data === 'string' ? data : (data?.data ?? data?.url);
        if (url) {
          window.location.replace(url);
          return;
        }
      } catch (stripeErr) {
        console.error('Stripe onboarding redirect failed:', stripeErr);
        toast({
          title: 'Profile saved',
          description:
            "We couldn't open Stripe right now. You can finish payout setup from your shop.",
          variant: 'destructive',
        });
      }

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
    <div className={embedded ? 'flex flex-col flex-1 overflow-hidden' : 'flex flex-col'}>
      {/* Step indicator */}
      <div className={embedded ? 'px-2' : 'mb-2'}>
        <div className="flex items-center gap-2">
          {[1, 2, 3].map(n => (
            <div
              key={n}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                n <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Step {step} of 3
        </p>
      </div>
      <div
        className={
          embedded
            ? 'space-y-6 py-4 overflow-y-auto flex-1 px-2'
            : 'space-y-6 py-6'
        }
      >
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
                        src={getImageLink(session.profileImageUrl)}
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
                  <Label htmlFor="youtube">YouTube</Label>
                  <Input
                    id="youtube"
                    placeholder="https://youtube.com/@username"
                    value={socials.youtube}
                    onChange={e => handleSocialChange('youtube', e.target.value)}
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

        <div
          className={
            embedded
              ? 'flex justify-between gap-3 pt-4 border-t mt-4 flex-shrink-0'
              : 'flex justify-between gap-3 pt-6 mt-2'
          }
        >
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
    </div>
  );
}
