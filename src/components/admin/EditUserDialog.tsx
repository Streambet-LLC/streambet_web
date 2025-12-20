import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Pencil } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { getImageLink, getMessage, isImageSFW } from '@/utils/helper';
import { cn, useDebounce } from '@/lib/utils';
import api, { adminAPI } from '@/integrations/api/client';
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
import { X } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import Select from 'react-select';
import Bugsnag from '@bugsnag/js';
import { US_STATES } from '@/utils/constants';
import { FaInstagram, FaTiktok, FaTwitch, FaYoutube } from 'react-icons/fa';
import PhotoCropper from '../PhotoCropper';

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
  instagram: z.string().optional(),
  twitch: z.string().trim().optional(),
  kick: z.string().trim().optional(),
  youtube: z.string().trim().optional(),
  tiktok: z.string().trim().optional(),
  avatar: z.any().optional(),
});

type ProfileFormData = z.infer<typeof formSchema>;

export function EditUserDialog({ profile, onUpdate }: { profile: any; onUpdate: () => void }) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);
  const [userNameCheck, setUserNameCheck] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | undefined>(undefined);
  const [avatarDeleted, setAvatarDeleted] = useState(false);
  const [avatarToCrop, setAvatarToCrop] = useState<File | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(false);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {},
    mode: 'onChange',
  });

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
    if (profile) {
      form.reset({
        name: profile?.name ?? '',
        state: profile?.state ?? '',
        username: profile?.username,
        email: profile?.email ?? '',
        avatar: profile?.profileImageUrl ?? '',
        instagram: profile?.socials?.instagram ?? '',
        twitch: profile?.socials?.twitch ?? '',
        kick: profile?.socials?.kick ?? '',
        youtube: profile?.socials?.youtube ?? '',
        tiktok: profile?.socials?.tiktok ?? '',
      });
    }
  }, [profile]);

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
    if (usernameData !== profile?.username) {
      debouncedCheckUsername(usernameData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usernameData, profile]);

  // // Update preview when selected file changes
  useEffect(() => {
    if (profile?.profileImageUrl) {
      setAvatarPreviewUrl(profile?.profileImageUrl);
    } else {
      setAvatarPreviewUrl(undefined);
    }
    // eslint-disable-next-line
  }, [profile]);

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

      if (!profile) throw new Error('User not found');

      let profileImageUrl = profile?.profileImageUrl || null;

      // Only upload if a new file is selected
      if (selectedAvatarFile) {
        try {
          setIsUploading(true);
          const response = await api.auth.uploadImage(selectedAvatarFile);
          profileImageUrl = response?.data?.Key;
        } catch (error) {
          Bugsnag.notify(error); 
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
      } else if (!profile.profileImageUrl) {
        profileImageUrlToSave = null;
      } else {
        profileImageUrlToSave = profileImageUrl;
      }

      // Update profile with only the fields we want to keep
      const { error: updateError } = await api.admin.updateUserProfile({
        userId: profile.id,
        userData: {
          name: data.name,
          username: data.username,
          state: data.state?.trim(),
          profileImageUrl: profileImageUrlToSave,
          socials: {
            instagram: data.instagram,
            twitch: data.twitch,
            kick: data.kick,
            youtube: data.youtube,
            tiktok: data.tiktok,  
          },
          // Set hidden fields to undefined
          city: undefined,
        }
      });

      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ['session'] });
      queryClient.invalidateQueries({ queryKey: ['profile', { username: usernameData }] });
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

      onUpdate();
    } catch (error: any) {
      Bugsnag.notify(error); 
      toast({
        title: 'Error',
        description: getMessage(error),
        variant: 'destructive',
      });
    }
    setIsUpdating(false);
  };

  const handleUploadClick = () => {
    if (fileInputRef.current && !avatarToCrop) {
      fileInputRef.current.value = null;
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
    if (e.target.files && e.target.files.length > 0) {
      setAvatarDeleted(false);
      handleFileChange(e.target.files[0]);
    }
  };

  const handleFileChange = async (file: File) => {
    setAvatarError(null);
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('Please upload a file smaller than 2MB.');
      return;
    }

    const url = URL.createObjectURL(file);

    try {
      setIsImageLoading(true);
      const isSfw = await isImageSFW(url);
      
      if (isSfw) {
        setAvatarToCrop(file);
      } else {
        setAvatarError("Sorry, but the chosen image might be inappropriate. Please choose a different one.")
      }
      setIsImageLoading(false);
    } catch (error) {
      setAvatarError(error);
    }
  };

  const handleDeleteAvatar = () => {
    // handleDeleteProfilePic();
    setSelectedAvatarFile(null);
    setAvatarPreviewUrl(undefined);
    setAvatarError(null);
    form.reset({ ...form.getValues(), avatar: undefined });
    setAvatarDeleted(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const stateOptions = US_STATES.map(s => ({
  value: s.abbreviation,
  label: s.name
}));

// const selectedOption = stateOptions.find(
//   (option) => option.value === field.value
// );

  return (
    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
      <DialogTrigger asChild>
        <Button variant='ghost' className='p-1 hover:bg-transparent hover:text-default'>
          <Pencil className='w-4 h-4' />
        </Button>
      </DialogTrigger>
      <DialogContent className='border-2 border-[#7AFF14]' style={{ background: '#0D0D0D',}}>
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 p-1 max-h-[80dvh] overflow-auto">
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
                            {usernameData !== profile.username &&
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
                      usernameData !== profile.username && (
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
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white font-light">Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Name"
                        {...field}
                        className="bg-[#272727] border-[#272727] text-white placeholder:text-gray-400"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => {
                  const selectedOption = stateOptions.find(
                    (option) => option.value === field.value
                  );

                  return (
                    <FormItem>
                      <FormLabel className="text-white font-light block mb-1">
                        State
                      </FormLabel>
                      <FormControl>
                        <Select
                          options={stateOptions}
                          value={selectedOption} // 👈 convert string to full object
                          onChange={(selected) => field.onChange(selected?.value || '')}
                          placeholder="State"
                          styles={{
                            control: (base) => ({
                              ...base,
                              backgroundColor: '#272727',
                              color: 'white',
                              borderColor: '#272727',
                            }),
                            menu: (base) => ({
                              ...base,
                              backgroundColor: '#272727',
                              color: 'white',
                              zIndex: 30, // Ensure dropdown is above the close (X) button
                            }),
                            option: (base, state) => ({
                              ...base,
                              backgroundColor: state.isFocused ? '#333' : '#272727',
                              color: 'white',
                            }),
                            singleValue: (base) => ({
                              ...base,
                              color: 'white',
                            }),
                            input: (base) => ({
                              ...base,
                              color: 'white',
                            }),
                            placeholder: (base) => ({
                              ...base,
                              color: '#aaa',
                            }),
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  );
                }}
              />
              <div className={cn("space-y-4", profile?.role !== 'creator' && "hidden")}>
                <Separator className="bg-gray-900" />
                <div>
                  <h2 className="text-md font-light text-white">Socials</h2>
                  <p className="text-sm text-[#FFFFFFBF] mt-1">Social links where your viewers can reach you.</p>
                </div>
                <FormField
                  control={form.control}
                  name="instagram"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white font-light flex gap-1 mb-1 items-center"><FaInstagram />Instagram</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://instagram.com"
                          {...field}
                          className="bg-[#272727] border-[#272727] text-white placeholder:text-gray-400"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="twitch"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white font-light flex gap-1 mb-1 items-center"><FaTwitch />Twitch</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://twitch.tv"
                          {...field}
                          className="bg-[#272727] border-[#272727] text-white placeholder:text-gray-400"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="kick"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white font-light flex gap-1 mb-1 items-center">
                        <img src="/icons/kick-icon.png" alt="kick" className="w-3 h-3 mr-[2px]" />
                        Kick
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://kick.com"
                          {...field}
                          className="bg-[#272727] border-[#272727] text-white placeholder:text-gray-400"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="youtube"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white font-light flex gap-1 mb-1 items-center">
                        <FaYoutube />
                        Youtube
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://youtube.com"
                          {...field}
                          className="bg-[#272727] border-[#272727] text-white placeholder:text-gray-400"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tiktok"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white font-light flex gap-1 mb-1 items-center">
                        <FaTiktok />
                        TikTok
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://tiktok.com"
                          {...field}
                          className="bg-[#272727] border-[#272727] text-white placeholder:text-gray-400"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Separator className="bg-gray-900" />
              {/* Profile Picture Section */}
              <div className="space-y-4">
                <div>
                  <h2 className="text-md font-light text-white">Your photo</h2>
                  <p className="text-sm text-[#FFFFFFBF] mt-1">This will be displayed on your profile.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 items-center relative">
                  {/* Left: Preview */}
                  <div className="relative inline-block" style={{ width: 80, height: 80 }}>
                    <Avatar className="h-20 w-20">
                      <AvatarImage
                        src={avatarPreviewUrl ? (avatarPreviewUrl.includes('blob') ? avatarPreviewUrl : getImageLink(avatarPreviewUrl)) : undefined}
                        onLoadingStatusChange={(status) => setIsImageLoading(status === 'loading')}
                      />
                      <AvatarFallback>
                        {(profile?.username?.[0] || profile?.email?.[0] || 'U').toUpperCase()}
                      </AvatarFallback>
                      {isImageLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-full z-10">
                          <Loader2 className="animate-spin h-8 w-8 text-[#0000ff]" />
                        </div>
                      )}
                    </Avatar>
                    {avatarPreviewUrl && !isUploading && (
                      <button
                        type="button"
                        className="absolute top-2 right-4 -translate-y-1/2 translate-x-1/2 bg-red-900 border border-gray-600 rounded-full h-5 w-5 flex items-center justify-center hover:bg-red-500 z-20"
                        onClick={e => { e.stopPropagation(); handleDeleteAvatar(); }}
                      >
                        <X className="h-4 w-4 text-white" />
                      </button>
                    )}
                  </div>
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
                        {/* Close button moved to Avatar preview */}
                      </div>
                      <span className="text-sm text-center text-[#667085]" style={{ lineHeight: '1.7' }}>
                        <span className="text-primary font-medium">Click to upload</span> or drag and drop<br />
                        <span className="text-[#667085]">SVG, PNG, JPG or GIF (max. 2MB)</span>
                      </span>
                      {!!avatarToCrop && 
                        <PhotoCropper 
                          file={avatarToCrop} 
                          onClose={() => setAvatarToCrop(null)} 
                          onCrop={(file) => {
                            setSelectedAvatarFile(file);
                            setAvatarToCrop(null);

                            setAvatarPreviewUrl(URL.createObjectURL(file));
                          }} 
                          cropperProps={{
                            circularCrop: true,
                          }}
                        />
                      }
                      {avatarError && <div className="text-destructive text-xs mt-1">{avatarError}</div>}
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </Form>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            onClick={form.handleSubmit(handleProfileUpdate)}
            disabled={isUpdating || !!avatarError || !form.formState.isValid}
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
