import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/integrations/api/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, Search, MessageSquare, Shield } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { handleMutationError } from '@/lib/mutationHelpers';
import { useQuery } from '@tanstack/react-query';

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConversationCreated: (conversationId: string) => void;
  preselectedSellerId?: string;
}

export const NewConversationDialog = ({
  open,
  onOpenChange,
  onConversationCreated,
  preselectedSellerId,
}: NewConversationDialogProps) => {
  const queryClient = useQueryClient();
  const [type, setType] = useState<'direct' | 'support'>(
    preselectedSellerId ? 'direct' : 'direct'
  );
  const [sellerSearch, setSellerSearch] = useState('');
  const [selectedSellerId, setSelectedSellerId] = useState(
    preselectedSellerId || ''
  );
  const [selectedSellerName, setSelectedSellerName] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  // Search for sellers
  const { data: sellers, isLoading: searchingSellers } = useQuery({
    queryKey: ['seller-search', sellerSearch],
    queryFn: async () => {
      if (!sellerSearch || sellerSearch.length < 2) return [];
      const response = await api.user.getCreators();
      return response.filter((c: any) =>
        c.username?.toLowerCase().includes(sellerSearch.toLowerCase()) &&
        c.isSeller
      );
    },
    enabled: sellerSearch.length >= 2 && type === 'direct',
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api.inbox.createConversation({
        type,
        recipientId: type === 'direct' ? selectedSellerId : undefined,
        subject: subject || undefined,
        initialMessage: message,
      }),
    onSuccess: (data) => {
      toast({ title: 'Conversation started!' });
      queryClient.invalidateQueries({ queryKey: ['inbox-conversations'] });
      onConversationCreated(data.id);
      onOpenChange(false);
      resetForm();
    },
    onError: (err) => handleMutationError(err, 'Failed to start conversation'),
  });

  const resetForm = () => {
    setSellerSearch('');
    setSelectedSellerId('');
    setSelectedSellerName('');
    setSubject('');
    setMessage('');
  };

  const canSubmit =
    message.trim() &&
    (type === 'support' || (type === 'direct' && selectedSellerId));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
          <DialogDescription>
            Start a conversation with a seller or contact support.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={type}
          onValueChange={(v) => setType(v as 'direct' | 'support')}
        >
          <TabsList className="w-full">
            <TabsTrigger value="direct" className="flex-1 gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              Message Seller
            </TabsTrigger>
            <TabsTrigger value="support" className="flex-1 gap-1.5">
              <Shield className="h-3.5 w-3.5" />
              Contact Support
            </TabsTrigger>
          </TabsList>

          <TabsContent value="direct" className="space-y-4 mt-4">
            {/* Seller search */}
            <div className="space-y-2">
              <Label>Seller</Label>
              {selectedSellerId ? (
                <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-lg px-3 py-2">
                  <span className="text-sm text-white">
                    {selectedSellerName}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedSellerId('');
                      setSelectedSellerName('');
                    }}
                    className="h-6 text-xs"
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={sellerSearch}
                      onChange={(e) => setSellerSearch(e.target.value)}
                      placeholder="Search for a seller..."
                      className="pl-9"
                    />
                  </div>
                  {sellers && sellers.length > 0 && (
                    <div className="border border-border/40 rounded-lg max-h-[150px] overflow-y-auto">
                      {sellers.map((seller: any) => (
                        <button
                          key={seller.id}
                          onClick={() => {
                            setSelectedSellerId(seller.id);
                            setSelectedSellerName(seller.username);
                            setSellerSearch('');
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 text-left text-sm"
                        >
                          <span className="text-white">{seller.username}</span>
                          {seller.shopName && (
                            <span className="text-muted-foreground text-xs">
                              ({seller.shopName})
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  {searchingSellers && (
                    <div className="flex items-center justify-center py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="support" className="mt-4" />
        </Tabs>

        {/* Common fields */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Subject (optional)</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What's this about?"
              maxLength={255}
            />
          </div>

          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              rows={4}
              maxLength={5000}
            />
          </div>
        </div>

        <Button
          onClick={() => createMutation.mutate()}
          disabled={!canSubmit || createMutation.isPending}
          className="w-full"
        >
          {createMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          Send Message
        </Button>
      </DialogContent>
    </Dialog>
  );
};
