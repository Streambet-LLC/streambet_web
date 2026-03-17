import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/integrations/api/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';

interface InboxSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const InboxSettingsDialog = ({
  open,
  onOpenChange,
}: InboxSettingsDialogProps) => {
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ['inbox-settings'],
    queryFn: () => api.inbox.getSettings(),
    enabled: open,
  });

  const updateMutation = useMutation({
    mutationFn: (readReceiptsEnabled: boolean) =>
      api.inbox.updateSettings({ readReceiptsEnabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox-settings'] });
      toast({ title: 'Settings updated' });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Inbox Settings</DialogTitle>
          <DialogDescription>
            Manage your messaging preferences.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Read Receipts</Label>
              <p className="text-xs text-muted-foreground">
                Let others know when you've read their messages. They will also
                be notified that your messages have read receipts.
              </p>
            </div>
            <Switch
              checked={settings?.readReceiptsEnabled ?? true}
              onCheckedChange={(checked) => updateMutation.mutate(checked)}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
