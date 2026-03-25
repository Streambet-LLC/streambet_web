import { useState, useMemo } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, MessageSquare, Shield, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { handleMutationError } from '@/lib/mutationHelpers';

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConversationCreated: (conversationId: string) => void;
  preselectedSellerId?: string;
  preselectedSellerName?: string;
}

export const NewConversationDialog = ({
  open,
  onOpenChange,
  onConversationCreated,
  preselectedSellerId,
  preselectedSellerName,
}: NewConversationDialogProps) => {
  const queryClient = useQueryClient();
  const [type, setType] = useState<'direct' | 'support'>(
    preselectedSellerId ? 'direct' : 'direct'
  );
  const [sellerSearch, setSellerSearch] = useState('');
  const [selectedSellerId, setSelectedSellerId] = useState(
    preselectedSellerId || ''
  );
  const [selectedSellerName, setSelectedSellerName] = useState(
    preselectedSellerName || ''
  );
  const [selectedSellerImage, setSelectedSellerImage] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Fetch all sellers
  const { data: allSellers = [], isLoading: loadingSellers } = useQuery({
    queryKey: ['all-sellers'],
    queryFn: () => api.user.getSellers(),
    staleTime: 5 * 60 * 1000, // cache for 5 mins
  });

  // Resolve preselected seller info from the sellers list
  useMemo(() => {
    if (preselectedSellerId && !preselectedSellerName && allSellers.length > 0) {
      const match = allSellers.find((s) => s.id === preselectedSellerId);
      if (match) {
        setSelectedSellerName(match.displayName || match.username);
        setSelectedSellerImage(match.profileImageUrl);
      }
    }
  }, [preselectedSellerId, preselectedSellerName, allSellers]);

  // Filter sellers by search term
  const filteredSellers = useMemo(() => {
    if (!sellerSearch.trim()) return allSellers;
    const term = sellerSearch.toLowerCase();
    return allSellers.filter(
      (s) =>
        s.username?.toLowerCase().includes(term) ||
        s.displayName?.toLowerCase().includes(term)
    );
  }, [allSellers, sellerSearch]);

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
    setSelectedSellerImage(null);
    setSubject('');
    setMessage('');
    setShowDropdown(false);
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
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={selectedSellerImage || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary text-xs">
                        {selectedSellerName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-white">
                      {selectedSellerName}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedSellerId('');
                      setSelectedSellerName('');
                      setSelectedSellerImage(null);
                    }}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={sellerSearch}
                      onChange={(e) => {
                        setSellerSearch(e.target.value);
                        setShowDropdown(true);
                      }}
                      onFocus={() => setShowDropdown(true)}
                      placeholder="Search for a seller..."
                      className="pl-9"
                    />
                  </div>
                  {showDropdown && (
                    <div className="absolute z-50 w-full mt-1 border border-border/40 rounded-lg bg-background shadow-lg">
                      {loadingSellers ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      ) : filteredSellers.length > 0 ? (
                        <ScrollArea className="max-h-[200px]">
                          {filteredSellers.map((seller) => (
                            <button
                              key={seller.id}
                              onClick={() => {
                                setSelectedSellerId(seller.id);
                                setSelectedSellerName(seller.displayName || seller.username);
                                setSelectedSellerImage(seller.profileImageUrl);
                                setSellerSearch('');
                                setShowDropdown(false);
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 text-left transition-colors"
                            >
                              <Avatar className="h-7 w-7">
                                <AvatarImage src={seller.profileImageUrl || undefined} />
                                <AvatarFallback className="bg-primary/20 text-primary text-xs">
                                  {(seller.displayName || seller.username || '?').charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col min-w-0">
                                <span className="text-sm text-white truncate">
                                  {seller.displayName || seller.username}
                                </span>
                                {seller.displayName && seller.username !== seller.displayName && (
                                  <span className="text-xs text-muted-foreground truncate">
                                    @{seller.username}
                                  </span>
                                )}
                              </div>
                            </button>
                          ))}
                        </ScrollArea>
                      ) : (
                        <div className="py-3 text-center text-sm text-muted-foreground">
                          {sellerSearch ? 'No sellers found' : 'No sellers available'}
                        </div>
                      )}
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
