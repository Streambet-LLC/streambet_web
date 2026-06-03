import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/integrations/api/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchInput } from '@/components/ui/SearchInput';
import {
  Shield,
  ArrowLeft,
  Send,
  Loader2,
  Check,
  CheckCheck,
  MessageSquare,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { handleMutationError } from '@/lib/mutationHelpers';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import type {
  AdminConversationTab,
  Conversation,
  Message,
} from '@/types/inbox';

interface AdminInboxPanelProps {
  tab: AdminConversationTab;
}

export const AdminInboxPanel = ({ tab }: AdminInboxPanelProps) => {
  const [search, setSearch] = useState('');
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);

  return (
    <div className="flex border border-border/40 rounded-lg overflow-hidden h-[600px]">
      {/* List */}
      <div
        className={`w-full lg:w-[380px] lg:min-w-[380px] border-r border-border/40 flex flex-col ${
          selectedConversationId ? 'hidden lg:flex' : 'flex'
        }`}
      >
        <div className="p-3 border-b border-border/40">
          <SearchInput
            id="admin-inbox-search"
            placeholder="Search conversations..."
            value={search}
            onChange={setSearch}
          />
        </div>
        <AdminConversationList
          tab={tab}
          search={search}
          selectedId={selectedConversationId}
          onSelect={setSelectedConversationId}
        />
      </div>

      {/* Thread */}
      <div
        className={`flex-1 flex flex-col ${
          selectedConversationId ? 'flex' : 'hidden lg:flex'
        }`}
      >
        {selectedConversationId ? (
          <AdminThreadView
            conversationId={selectedConversationId}
            onBack={() => setSelectedConversationId(null)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Select a conversation to view</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Admin Conversation List ────────────────────────────────────────

interface AdminConversationListProps {
  tab: AdminConversationTab;
  search: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const AdminConversationList = ({
  tab,
  search,
  selectedId,
  onSelect,
}: AdminConversationListProps) => {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-inbox', tab, search],
    queryFn: () =>
      api.inbox.adminListConversations({ tab, search: search || undefined }),
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="p-3 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-2">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const conversations = data?.data ?? [];

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground p-6">
        <p className="text-sm">No conversations found</p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-2 space-y-1">
        {conversations.map((conv) => {
          const participants = conv.participants || [];
          const userParticipants = participants.filter(
            (p) => p.user?.role !== 'admin'
          );
          const displayNames = userParticipants
            .map((p) => p.user?.username)
            .filter(Boolean)
            .join(', ');

          return (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={`w-full flex items-start gap-3 p-2.5 rounded-lg text-left transition-colors hover:bg-white/5 ${
                selectedId === conv.id ? 'bg-white/10' : ''
              }`}
            >
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary/20 text-primary text-sm">
                  {conv.type === 'support' ? (
                    <Shield className="h-4 w-4" />
                  ) : (
                    (displayNames.charAt(0) || '?').toUpperCase()
                  )}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm text-white truncate">
                    {displayNames || 'Unknown'}
                  </span>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {conv.lastMessage
                      ? formatDistanceToNow(
                          new Date(conv.lastMessage.createdAt),
                          { addSuffix: true }
                        )
                      : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs text-muted-foreground truncate">
                    {conv.subject || conv.lastMessage?.content || 'No messages'}
                  </p>
                  {conv.type === 'support' && (
                    <Badge
                      variant="outline"
                      className="text-[9px] px-1 py-0 border-blue-400/40 text-blue-400 shrink-0"
                    >
                      Support
                    </Badge>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
};

// ─── Admin Thread View ──────────────────────────────────────────────

interface AdminThreadViewProps {
  conversationId: string;
  onBack: () => void;
}

const AdminThreadView = ({
  conversationId,
  onBack,
}: AdminThreadViewProps) => {
  const queryClient = useQueryClient();
  const [replyContent, setReplyContent] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-inbox-messages', conversationId],
    queryFn: () =>
      api.inbox.adminGetConversationMessages(conversationId, { limit: 100 }),
    refetchInterval: 15000,
  });

  const sendMutation = useMutation({
    mutationFn: () =>
      api.inbox.adminSendMessage(conversationId, replyContent.trim()),
    onSuccess: () => {
      setReplyContent('');
      queryClient.invalidateQueries({
        queryKey: ['admin-inbox-messages', conversationId],
      });
      queryClient.invalidateQueries({ queryKey: ['admin-inbox'] });
    },
    onError: (err) => handleMutationError(err, 'Failed to send message'),
  });

  const handleSend = () => {
    if (!replyContent.trim()) return;
    sendMutation.mutate();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const messages = data?.data ?? [];
  const conversation = data?.conversation;

  if (isLoading) {
    return (
      <div className="flex-1 p-4 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-60 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="lg:hidden h-8 w-8"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-white">
              {conversation?.subject || 'Conversation'}
            </span>
            <Badge
              variant="outline"
              className="text-[10px] px-1 py-0 border-border/40"
            >
              {conversation?.type === 'support' ? 'Support' : 'Direct'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {conversation?.participants
              ?.map((p: any) => p.user?.username)
              .filter(Boolean)
              .join(', ')}
          </p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {messages.map((msg: Message) => (
            <div key={msg.id} className="flex gap-2.5">
              <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                <AvatarImage
                  src={msg.sender?.profileImageUrl || undefined}
                />
                <AvatarFallback className="text-[10px] bg-primary/20 text-primary">
                  {msg.isAdminMessage ? (
                    <Shield className="h-3 w-3" />
                  ) : (
                    (msg.sender?.username?.charAt(0) || '?').toUpperCase()
                  )}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">
                    {msg.sender?.username || 'Unknown'}
                  </span>
                  {msg.isAdminMessage && (
                    <Badge className="text-[9px] px-1 py-0 bg-blue-500/20 text-blue-400 border-0">
                      Admin
                    </Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(msg.createdAt), 'MMM d, h:mm a')}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap">
                  {msg.content}
                </p>
                {msg.attachments?.map((att) => (
                  <a
                    key={att.id}
                    href={att.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-1"
                  >
                    <img
                      src={att.fileUrl}
                      alt={att.fileName}
                      className="max-w-[200px] rounded-lg max-h-[150px] object-cover"
                      loading="lazy"
                    />
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Reply */}
      <div className="border-t border-border/40 p-3">
        <div className="flex items-end gap-2">
          <Textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Reply as admin..."
            className="min-h-[40px] max-h-[100px] resize-none bg-[rgba(30,30,30,1)] border-border/40"
            rows={1}
          />
          <Button
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={handleSend}
            disabled={sendMutation.isPending || !replyContent.trim()}
          >
            {sendMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
