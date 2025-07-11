import { useEffect, useState } from 'react';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAuthContext } from '@/contexts/AuthContext';
import { useMutation } from '@tanstack/react-query';
import api from '@/integrations/api/client';
import { getMessage } from '@/utils/helper';
import { useToast } from '@/hooks/use-toast';

export const NotificationSettings = () => {
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [inAppNotifications, setInAppNotifications] = useState(false);
  const { session, isFetching, refetchSession } = useAuthContext();
  const { toast } = useToast();

  const {isPending: isUpdatingPreference, mutate: updateNotificationPreferences} = useMutation({
    mutationFn: (payload: any) => api.user.updateNotificationPreferences(payload),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Notification preference has updated!' });
      refetchSession();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: getMessage(error) || 'Failed to create stream', variant: 'destructive' });
    },
  });

  useEffect(() => {
    if (session) {
      setEmailNotifications(session.notificationPreferences?.emailNotification);
      setInAppNotifications(session.notificationPreferences?.inAppNotification);
    }
  }, [session, refetchSession]);

  const handleEmailNotificationsChange = (checked: boolean) => {
    setEmailNotifications(checked);
    updateNotificationPreferences({
      emailNotification: checked,
    });
  };

  const handleInAppNotificationsChange = (checked: boolean) => {
    setInAppNotifications(checked);
    updateNotificationPreferences({
      inAppNotification: checked,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-light text-white">Notification settings</h2>
          <p className="text-sm text-[#FFFFFFBF] mt-1">Update your notification preference here.</p>
        </div>
      </div>

      <Separator className="bg-gray-900" />
        <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-notifications">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications via email
                </p>
              </div>
              <Switch
                id="email-notifications"
                disabled={isUpdatingPreference || isFetching}
                checked={emailNotifications}
                onCheckedChange={handleEmailNotificationsChange}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="in-app-notifications">In-App Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications within the app
                </p>
              </div>
              <Switch
                id="in-app-notifications"
                disabled={isUpdatingPreference || isFetching}
                checked={inAppNotifications}
                onCheckedChange={handleInAppNotificationsChange}
              />
            </div>
          </div>
    </div>
  );
}; 
