import { useEffect, useState } from 'react';
import { ProfileSection } from './ProfileSection';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getImageLink } from '@/utils/helper';
import { TabSwitch } from '@/components/navigation/TabSwitch';
import { NotificationSettings } from './NotificationSettings';
import { useAuthContext } from '@/contexts/AuthContext';

const formSchema = z.object({
  avatar: z.any().optional(),
});

export const ProfileSettings = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const { session } = useAuthContext();

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      avatar: undefined,
    },
  });

  useEffect(() => {
    if (session?.profileImageUrl) {
      form.setValue('avatar', getImageLink(session?.profileImageUrl));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const avatarLink = form.watch('avatar');

  const tabs = [
    { key: 'profile', label: 'Profile' },
    { key: 'notifications', label: 'Notifications' },
  ];

  return (
    <div className="space-y-6">
      <TabSwitch
        tabs={tabs}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {activeTab === 'profile' && (
        <ProfileSection 
          currentUsername={session?.username} 
          currentAvatar={avatarLink} 
          handleDeleteProfilePic={() => form.setValue('avatar', null)} 
        />
      )}

      {activeTab === 'notifications' && (
        <NotificationSettings />
      )}
    </div>
  );
};
