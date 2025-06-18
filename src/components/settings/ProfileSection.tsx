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

interface ProfileData {
  name: string;
  city: string;
  state: string;
  username: string;
}

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
  const [isUploading, setIsUploading] = useState(false);
  const [userNameCheck, setUserNameCheck] = useState('');

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
    console.log('usernameData', usernameData);
    debouncedCheckUsername(usernameData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usernameData]);

  const handleProfileUpdate = async (data: ProfileFormData) => {
    try {
      setIsUpdating(true);

      if (!session) throw new Error('User not found');

      let profileImageUrl = '';

      if (currentAvatar && typeof currentAvatar === 'object' && currentAvatar?.name) {
        try {
          setIsUploading(true);
          const response = await api.auth.uploadProfilePicture(currentAvatar);
          profileImageUrl = response?.data?.Key;
          setIsUploading(false);
        } catch (error) {
          toast({
            variant: 'destructive',
            title: 'Error uploading profile picture',
            description: getMessage(error) || 'Failed to upload profile picture. Please try again.',
          });
          setIsUploading(false);
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
                          {isUserAvailabilityFetching ? (
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
                          ) : null}
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                  {field?.value?.length >= 3 && !field?.value?.includes(' ') && (
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
                          <span className="text-green-500">{userAvailabilityData?.suggestion}</span>
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
