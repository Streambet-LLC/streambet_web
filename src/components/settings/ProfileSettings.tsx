import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProfileSection } from './ProfileSection';
import { PasswordSection } from './PasswordSection';
import { AvatarUploadField } from '@/components/AvatarUploadField';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getImageLink } from '@/utils/helper';

const formSchema = z.object({
  avatar: z.any().optional(),
});

export const ProfileSettings = () => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      avatar: undefined,
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

  const { data: profile } = useQuery({
    queryKey: ['profile', session?.id],
    enabled: !!session?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session?.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (session?.profileImageUrl) {
      form.setValue('avatar', getImageLink(session?.profileImageUrl));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const avatarLink = form.watch('avatar');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile Picture</CardTitle>
          <CardDescription>Update your profile picture</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormProvider {...form}>
            <AvatarUploadField
              form={form}
              name="avatar"
              label=""
              disabled={isUploading}
              size="lg"
            />
          </FormProvider>
        </CardContent>
      </Card>

      <ProfileSection currentUsername={profile?.username} currentAvatar={avatarLink} />
      <PasswordSection />
    </div>
  );
};
