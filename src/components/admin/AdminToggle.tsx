import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AdminToggleProps {
  userId: string;
  isAdmin: boolean;
  onSuccess: () => Promise<void>;
}

export const AdminToggle = ({ userId, isAdmin, onSuccess }: AdminToggleProps) => {
  const { toast } = useToast();

  const toggleAdminStatus = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_admin: !isAdmin })
        .eq('id', userId);

      if (error) throw error;

      await onSuccess();

      toast({
        title: 'Success',
        description: `Admin status updated successfully`,
      });
    } catch (error: any) {
      console.error('Error updating admin status:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return <Switch checked={isAdmin} onCheckedChange={toggleAdminStatus} />;
};
