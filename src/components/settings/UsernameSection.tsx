import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface UsernameSectionProps {
  currentUsername: string;
}

export const UsernameSection = ({ currentUsername }: UsernameSectionProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);
  const [newUsername, setNewUsername] = useState('');

  const handleUsernameUpdate = async () => {
    if (!newUsername.trim()) return;

    try {
      setIsUpdating(true);

      // First check if username exists
      const { data: existingUsers, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', newUsername)
        .limit(1);

      if (checkError) throw checkError;

      if (existingUsers && existingUsers.length > 0) {
        toast({
          title: 'Error',
          description: 'Username is already taken',
          variant: 'destructive',
        });
        return;
      }

      // If username is available, proceed with update
      const { error } = await supabase
        .from('profiles')
        .update({ username: newUsername })
        .eq('id', (await supabase.auth.getUser()).data.user?.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast({
        title: 'Success',
        description: 'Username updated successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
      setNewUsername('');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Username</CardTitle>
        <CardDescription>Change your username</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Current username: <span className="font-medium">{currentUsername}</span>
        </div>
        <div className="flex space-x-4">
          <Input
            placeholder="New username"
            value={newUsername}
            onChange={e => setNewUsername(e.target.value)}
          />
          <Button onClick={handleUsernameUpdate} disabled={isUpdating || !newUsername.trim()}>
            {isUpdating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Username'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
