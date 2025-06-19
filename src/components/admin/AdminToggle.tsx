import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AdminToggleProps {
  userId: string;
  role: string;
  onSuccess: () => Promise<void>;
}

export const AdminToggle = ({ userId, role, onSuccess }: AdminToggleProps) => {
  const { toast } = useToast();

  const toggleAdminStatus = async () => {
    try {
      const newRole = role === 'admin' ? 'user' : 'admin';
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
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

  return <Switch checked={role === 'admin'} onCheckedChange={toggleAdminStatus} />;
};
