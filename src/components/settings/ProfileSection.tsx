import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { getImageLink, getMessage } from '@/utils/helper';
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
import { ArrowLeft, X } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useNavigate } from 'react-router-dom';
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

const formSchema = z.object({
  name: z.string().optional(),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string().email().optional(),
  city: z.string().optional(),
  state: z
    .string()
    .optional()
    .transform(val => val?.replace(/^\s+/, '')) // Only trim leading spaces
    .refine(val => !val?.startsWith(' '), 'State cannot start with a space'),
  avatar: z.any().optional(),
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
  const navigate = useNavigate();
  const [isUpdating, setIsUpdating] = useState(false);
  const [userNameCheck, setUserNameCheck] = useState('');
  const [open, setOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | undefined>(undefined);
  const [avatarDeleted, setAvatarDeleted] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: currentProfile?.name ?? '',
      city: currentProfile?.city ?? '',
      state: currentProfile?.state ?? '',
      username: currentUsername,
      email: currentProfile?.email ?? '',
      avatar: currentAvatar,
    },
    mode: 'onChange',
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
        email: session?.email ?? '',
        avatar: currentAvatar,
      });
    }
  }, [session, form, currentAvatar]);

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

  // Update preview when selected file changes
  useEffect(() => {
    if (selectedAvatarFile)
    {
      setAvatarPreviewUrl(URL.createObjectURL(selectedAvatarFile));
      return () => URL.revokeObjectURL(avatarPreviewUrl!);
    } else if (currentAvatar)
    {
      setAvatarPreviewUrl(currentAvatar);
    } else
    {
      setAvatarPreviewUrl(undefined);
    }
    // eslint-disable-next-line
  }, [selectedAvatarFile, currentAvatar]);

  const handleProfileUpdate = async (data: ProfileFormData) => {
    // Prevent submission if avatarError exists
    if (avatarError) {
      toast({
        title: 'Error',
        description: avatarError,
        variant: 'destructive',
      });
      return;
    }
    try {
      setIsUpdating(true);

      if (!session) throw new Error('User not found');

      let profileImageUrl = '';

      // Only upload if a new file is selected
      if (selectedAvatarFile) {
        try {
          setIsUploading(true);
          const response = await api.auth.uploadImage(selectedAvatarFile);
          profileImageUrl = response?.data?.Key;
        } catch (error) {
          toast({
            variant: 'destructive',
            title: 'Error uploading profile picture',
            description: getMessage(error) || 'Failed to upload profile picture. Please try again.',
          });
          setIsUploading(false);
          setIsUpdating(false);
          return;
        }
        setIsUploading(false);
      }

      // Determine what to save for profileImageUrl
      let profileImageUrlToSave: string | null = null;
      if (avatarDeleted) {
        profileImageUrlToSave = null;
      } else if (selectedAvatarFile) {
        profileImageUrlToSave = profileImageUrl;
      } else if (!currentAvatar) {
        profileImageUrlToSave = null;
      } else {
        profileImageUrlToSave = currentAvatar;
      }

      // Update profile with only the fields we want to keep
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          username: data.username,
          state: data.state?.trim(),
          profileImageUrl: profileImageUrlToSave,
          // Set hidden fields to undefined
          name: undefined,
          city: undefined,
        })
        .eq('id', session?.id)
        .execute();

      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
      // Reset selected file after successful update
      // setSelectedAvatarFile(null);
      setAvatarDeleted(false);
      // Update preview to new avatar or fallback after save
      if (profileImageUrlToSave) {
        setAvatarPreviewUrl(profileImageUrlToSave);
      } else {
        setAvatarPreviewUrl(undefined);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: getMessage(error),
        variant: 'destructive',
      });
    }
    setIsUpdating(false);
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

  const handleCancel = () => {
    navigate('/');
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0)
    {
      setAvatarDeleted(false);
      handleFileChange(e.target.files[0]);
    }
  };

  const handleFileChange = (file: File) => {
    setAvatarError(null);
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('Please upload a file smaller than 2MB.');
      return;
    }
    setSelectedAvatarFile(file);
  };

  const handleDeleteAvatar = () => {
    setSelectedAvatarFile(null);
    setAvatarPreviewUrl(undefined);
    setAvatarError(null);
    form.reset({ ...form.getValues(), avatar: undefined });
    setAvatarDeleted(true);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-light text-white">Settings</h2>
          <p className="text-sm text-[#FFFFFFBF] mt-1">Update your photo and personal details here.</p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={handleCancel}
            variant="outline" 
            className="bg-[#272727] text-white border-[#272727] hover:bg-[#3a3a3a]"
          >
            Cancel
          </Button>
          <Button 
            onClick={form.handleSubmit(handleProfileUpdate)}
            disabled={isUpdating || !!avatarError || !form.formState.isValid}
            className="w-full"
          >
            {isUpdating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </Button>
        </div>
      </div>

      <Separator className="bg-gray-900" />

      {/* Form Section */}
      <Form {...form}>
        <form className="space-y-4">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white font-light">Username</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input 
                      placeholder="Username" 
                      {...field} 
                      className="bg-[#272727] border-[#272727] text-white placeholder:text-gray-400"
                    />
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
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white font-light">Email</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Email" 
                    {...field} 
                    disabled
                    className="bg-[#272727] border-[#272727] text-white placeholder:text-gray-400 opacity-50"
                  />
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
                <FormLabel className="text-white font-light">State</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="State" 
                    {...field} 
                    value={field.value || ''}
                    onChange={(e) => {
                      const value = e.target.value.replace(/^\s+/, ''); // Only trim leading spaces
                      field.onChange(value);
                    }}
                    className="bg-[#272727] border-[#272727] text-white placeholder:text-gray-400"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Password Change Section - moved below state field */}
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm">Need to change your password?</span>
            <PasswordChangeDialog
              isUpdating={isUpdating}
              handleProfileUpdate={handlePasswordUpdate}
              open={open}
              setOpen={setOpen}
            />
          </div>
          <Separator className="bg-gray-900" />
          {/* Profile Picture Section */}
          <div className="space-y-4">
            <div>
              <h2 className="text-md font-light text-white">Your photo</h2>
              <p className="text-sm text-[#FFFFFF] mt-1">This will be displayed on your profile.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              {/* Left: Preview */}
              <Avatar className="h-20 w-20 relative">
                <AvatarImage 
                  src={avatarPreviewUrl ? (avatarPreviewUrl.includes('blob') ?  avatarPreviewUrl : getImageLink(avatarPreviewUrl)) : undefined}
                  onLoadingStatusChange={(status) => setIsImageLoading(status === 'loading')}
                />
                <AvatarFallback>
                  {(session?.username?.[0] || session?.email?.[0] || 'U').toUpperCase()}
                </AvatarFallback>
                {isImageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-full z-10">
                    <Loader2 className="animate-spin h-8 w-8 text-[#0000ff]" />
                  </div>
                )}
              </Avatar>
              {/* <div className="w-[120px] h-[120px] bg-[#808080] flex items-center justify-center rounded-full overflow-hidden border border-[#272727]">
                {avatarPreviewUrl ? (
                  <img src={avatarPreviewUrl} alt="Avatar preview" className="object-cover w-full h-full" />
                ) : (
                  <span className="text-white text-xs">No image</span>
                )}
              </div> */}
              {/* Right: Upload */}
              <div
                className={`flex-1 w-full flex flex-col items-center justify-center bg-[#272727] rounded-xl py-4 px-2 cursor-pointer border border-[#121212] ${isDragging ? 'ring-2 ring-primary' : ''}`}
                style={{ minHeight: 120 }}
                onClick={isUploading ? undefined : handleUploadClick}
                onDrop={isUploading ? undefined : handleDrop}
                onDragOver={isUploading ? undefined : handleDragOver}
                onDragLeave={isUploading ? undefined : handleDragLeave}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileInputChange}
                  disabled={isUploading}
                />
                <div className="flex flex-col items-center mt-2">
                  <div className="flex items-center justify-center mb-1 relative">
                    <div className="rounded-full bg-[#171717] border-4 border-[#121212] flex items-center justify-center" style={{ width: 44, height: 44 }}>
                      {isUploading ? (
                        <Loader2 className="h-6 w-6 animate-spin text-white" />
                      ) : (
                        <img src="/icons/cloud_upload.png" alt="Upload" style={{ width: 28, height: 19, objectFit: 'contain', display: 'block' }} />
                      )}
                    </div>
                    {avatarPreviewUrl && !isUploading && (
                      <button
                        type="button"
                        className="absolute -top-2 -right-2 bg-[#232323] rounded-full p-1 hover:bg-destructive"
                        onClick={e => { e.stopPropagation(); handleDeleteAvatar(); }}
                      >
                        <X className="h-4 w-4 text-white" />
                      </button>
                    )}
                  </div>
                  <span className="text-sm text-center text-[#667085]" style={{ lineHeight: '1.7' }}>
                    <span className="text-primary font-medium">Click to upload</span> or drag and drop<br />
                    <span className="text-[#667085]">SVG, PNG, JPG or GIF (max. 2MB)</span>
                  </span>
                  {avatarError && <div className="text-destructive text-xs mt-1">{avatarError}</div>}
                </div>
              </div>
            </div>
          </div>
        </form>
      </Form>
    </div>
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
  const { toast } = useToast();

  useEffect(() => {
    setStep('old');
    setOldPassword('');
    setNewPassword('');
  }, [open]);

  // Password validation function
  const validatePassword = (password: string) => {
    // At least 1 uppercase, 1 lowercase, 1 number, 1 special char, min 8 chars
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    return regex.test(password);
  };

  const handleContinue = () => {
    setError(null);
    if (step === 'old') {
      if (!oldPassword) {
        toast({
          title: 'Error',
          description: 'Please enter your old password.',
          variant: 'destructive',
        });
        return;
      }
      if (!validatePassword(oldPassword)) {
        toast({
          title: 'Error',
          description:
            'Old password must be at least 8 characters long and contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character.',
          variant: 'destructive',
          duration: 8000,
        });
        return;
      }
      setStep('new');
    } else if (step === 'new') {
      if (!newPassword) {
        toast({
          title: 'Error',
          description: 'Please enter your new password.',
          variant: 'destructive',
        });
        return;
      }
      if (!validatePassword(newPassword)) {
        toast({
          title: 'Error',
          description:
            'New password must be at least 8 characters long and contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character.',
          variant: 'destructive',
          duration: 8000,
        });
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
        className="p-6 rounded-lg border-2 border-[#7AFF14]"
        style={{ background: '#0D0D0D', borderRadius: '16px', minWidth: 340, maxWidth: 480 }}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-2">
            <Button
              onClick={handleBack}
              className="px-3 py-1 text-white flex items-center"
              style={{ background: '#272727', color: '#fff', width: 94 }}
            >
              <ArrowLeft className="w-4 h-4 mr-0" />
              Back
            </Button>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-base font-light text-white text-left">
                {step === 'old' ? 'Enter your old password' : 'Enter your new password'}
              </span>
              <Button onClick={handleContinue} disabled={isUpdating} className="ml-4 font-bold">
                {isUpdating ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : 'Continue'}
              </Button>
            </div>
            <Separator className="mt-4 mb-6 bg-[#232323]" />
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
              placeholder={step === 'old' ? 'Old password' : 'New password'}
              className="w-full border-none text-white placeholder:text-[#D7DFEF60]"
              style={{ background: '#272727', height: 44 }}
              autoFocus
            />
            {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
