import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getMessage } from '@/utils/helper';
import { useDebounce } from '@/lib/utils';
import api from '@/integrations/api/client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft } from 'lucide-react';

const formSchema = z.object({
  name: z.string().optional(),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .refine(val => !val.includes(' '), 'Username cannot contain spaces'),
  city: z.string().optional(),
  state: z.string().optional(),
});

type ProfileFormData = z.infer<typeof formSchema>;

type changePasswordData = {
  oldPassword: string;
  newPassword: string;
};

interface ProfileSectionProps {
  currentUsername: string;
  currentProfile?: Partial<ProfileFormData>;
  currentAvatar: any;
}

export const ProfileSection = ({
  currentUsername,
  currentProfile,
  currentAvatar,
}: ProfileSectionProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);
  const [userNameCheck, setUserNameCheck] = useState('');
  const [open, setOpen] = useState(false);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: currentProfile?.name ?? '',
      city: currentProfile?.city ?? '',
      state: currentProfile?.state ?? '',
      username: currentUsername,
    },
  });

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return session;
    },
  });

  useEffect(() => {
    if (session) {
      form.reset({
        name: session?.name ?? '',
        city: session?.city ?? '',
        state: session?.state ?? '',
        username: session?.username,
      });
    }
  }, [session, form]);

  const {
    data: userAvailabilityData,
    isFetching: isUserAvailabilityFetching,
    refetch: refetchUserAvailability,
  } = useQuery({
    queryKey: ['user-availability'],
    enabled: false,
    queryFn: async () => {
      const { data, error }: any = await api.auth.getUsernameAvailability(userNameCheck);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    refetchUserAvailability();
  }, [refetchUserAvailability, userNameCheck]);

  const usernameData = form.watch('username');

  const debouncedCheckUsername = useDebounce((username: string) => {
    if (username && username.length >= 3 && !username.includes(' ')) {
      setUserNameCheck(username);
    }
  }, 500);

  useEffect(() => {
    if (usernameData !== currentUsername) {
      debouncedCheckUsername(usernameData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usernameData, currentUsername]);

  const handleProfileUpdate = async (data: ProfileFormData) => {
    try {
      setIsUpdating(true);

      if (!session) throw new Error('User not found');

      let profileImageUrl = '';

      if (currentAvatar && typeof currentAvatar === 'object' && currentAvatar?.name) {
        try {
          const response = await api.auth.uploadProfilePicture(currentAvatar);
          profileImageUrl = response?.data?.Key;
        } catch (error) {
          toast({
            variant: 'destructive',
            title: 'Error uploading profile picture',
            description: getMessage(error) || 'Failed to upload profile picture. Please try again.',
          });
        }
      }
      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          name: data.name,
          city: data.city,
          state: data.state,
          username: data.username,
          profileImageUrl: profileImageUrl || currentAvatar || undefined,
        })
        .eq('id', session?.id)
        .execute();

      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: getMessage(error),
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePasswordUpdate = async (data: changePasswordData) => {
    try {
      setIsUpdating(true);

      if (!session) throw new Error('User not found');

      // Update profile password
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          currentPassword: data?.oldPassword,
          newPassword: data?.newPassword,
        })
        .eq('id', session?.id)
        .execute();

      if (updateError) throw updateError;

      toast({
        title: 'Success',
        description: 'Password updated successfully',
      });
      setOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: getMessage(error),
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Settings</CardTitle>
        <CardDescription>Update your profile information</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleProfileUpdate)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input placeholder="Your name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="relative">
                      <Input placeholder="Username" {...field} />
                      {field?.value?.length >= 3 && !field?.value?.includes(' ') && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {usernameData !== currentUsername &&
                            (isUserAvailabilityFetching ? (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : userAvailabilityData?.is_available ? (
                              <svg
                                className="h-4 w-4 text-green-500"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            ) : userAvailabilityData?.is_available === false ? (
                              <svg
                                className="h-4 w-4 text-destructive"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            ) : null)}
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                  {field?.value?.length >= 3 &&
                    !field?.value?.includes(' ') &&
                    usernameData !== currentUsername && (
                      <div className="flex items-center gap-2 text-sm">
                        {isUserAvailabilityFetching ? (
                          <span className="text-muted-foreground">
                            Checking username availability...
                          </span>
                        ) : userAvailabilityData?.is_available ? (
                          <span className="text-green-500">Username is available</span>
                        ) : userAvailabilityData?.is_available === false ? (
                          <span>
                            <span className="text-destructive">
                              Username is not available. Suggested username:{' '}
                            </span>
                            <span className="text-green-500">
                              {userAvailabilityData?.suggestion}
                            </span>
                          </span>
                        ) : null}
                      </div>
                    )}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input placeholder="City" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="state"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input placeholder="State" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Password Change Trigger Row */}
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm">Need to change your password?</span>
              <PasswordChangeDialog
                isUpdating={isUpdating}
                handleProfileUpdate={handlePasswordUpdate}
                open={open}
                setOpen={setOpen}
              />
            </div>

            <Button type="submit" disabled={isUpdating} className="w-full cursor-pointer">
              {isUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Profile'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

function PasswordChangeDialog({
  isUpdating,
  handleProfileUpdate,
  open,
  setOpen,
}: {
  isUpdating: boolean;
  open: boolean;
  handleProfileUpdate: ({ oldPassword, newPassword }) => void;
  setOpen: (open: boolean) => void;
}) {
  const [step, setStep] = useState<'old' | 'new'>('old');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStep('old');
    setOldPassword('');
    setNewPassword('');
  }, [open]);

  // Dummy handler for continue (replace with real validation if needed)
  const handleContinue = () => {
    setError(null);
    if (step === 'old') {
      if (!oldPassword) {
        setError('Please enter your old password.');
        return;
      }
      setStep('new');
    } else if (step === 'new') {
      if (!newPassword) {
        setError('Please enter your new password.');
        return;
      }
      handleProfileUpdate({ oldPassword, newPassword });
    }
  };

  const handleBack = () => {
    setError(null);
    if (step === 'new') {
      setStep('old');
    } else {
      setOpen(false);
      setStep('old');
      setOldPassword('');
      setNewPassword('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button style={{ background: '#272727', color: '#fff' }} className="ml-2 px-4 py-2 rounded">
          Create new password
        </Button>
      </DialogTrigger>
      <DialogContent
        className="p-6 rounded-lg"
        style={{ background: '#0D0D0D', borderRadius: '16px', minWidth: 340, maxWidth: 360 }}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-2">
            <Button
              onClick={handleBack}
              className="px-3 py-1 text-white flex items-center"
              style={{ background: '#272727', color: '#fff' }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-base font-medium text-white text-left">
                {step === 'old' ? 'Enter your old password' : 'Enter your new password'}
              </span>
              <Button onClick={handleContinue} disabled={isUpdating} className="ml-4">
                {isUpdating ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : 'Continue'}
              </Button>
            </div>
            <label className="block text-sm text-white mb-1" htmlFor="password-input">
              {step === 'old' ? 'Old password' : 'New password'}
            </label>
            <Input
              id="password-input"
              type="password"
              value={step === 'old' ? oldPassword : newPassword}
              onChange={e =>
                step === 'old' ? setOldPassword(e.target.value) : setNewPassword(e.target.value)
              }
              className="w-full border-none text-white placeholder:text-gray-400"
              style={{ background: '#272727' }}
              autoFocus
            />
            {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
