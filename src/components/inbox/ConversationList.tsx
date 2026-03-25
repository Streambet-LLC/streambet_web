import { useQuery } from '@tanstack/react-query';
import { api } from '@/integrations/api/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, Ban } from 'lucide-react';
import type { ConversationTab, Conversation } from '@/types/inbox';
import { formatDistanceToNow } from 'date-fns';

interface ConversationListProps {
  tab: ConversationTab;
  selectedId: string | null;
  onSelect: (id: string) => void;
  currentUserId?: string;
}

export const ConversationList = ({
  tab,
  selectedId,
  onSelect,
  currentUserId,
}: ConversationListProps) => {
  const { data, isLoading } = useQuery({
    queryKey: ['inbox-conversations', tab],
    queryFn: () => api.inbox.listConversations({ tab, limit: 50 }),
    refetchInterval: 30000, // Poll every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="p-3 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
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
        <p className="text-sm text-center">
          {tab === 'blocked'
            ? 'No blocked conversations'
            : tab === 'support'
              ? 'No support conversations'
              : 'No conversations yet'}
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-2 space-y-1">
        {conversations.map((conversation) => (
          <ConversationItem
            key={conversation.id}
            conversation={conversation}
            isSelected={selectedId === conversation.id}
            onClick={() => onSelect(conversation.id)}
            currentUserId={currentUserId}
          />
        ))}
      </div>
    </ScrollArea>
  );
};

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
  currentUserId?: string;
}

const ConversationItem = ({
  conversation,
  isSelected,
  onClick,
  currentUserId,
}: ConversationItemProps) => {
  const isSupport = conversation.type === 'support';

  // For support: find the non-admin requester to show their name
  // For direct: find the other participant (not the current user)
  const otherParticipant = isSupport
    ? conversation.participants.find(
        (p) => p.user?.role !== 'admin' && String(p.userId ?? p.user?.id) !== String(currentUserId)
      ) || conversation.participants.find((p) => p.user?.role !== 'admin')
    : conversation.participants.find(
        (p) => String(p.userId ?? p.user?.id ?? p.id) !== String(currentUserId)
      );

  const displayName = otherParticipant?.user?.username
    || otherParticipant?.user?.name
    || (isSupport ? (conversation.subject || 'Support') : 'Unknown');
  const displayImage = otherParticipant?.user?.profileImageUrl;
  const isSeller = otherParticipant?.user?.isSeller;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors hover:bg-white/5 ${
        isSelected ? 'bg-white/10' : ''
      }`}
    >
      <div className="relative">
        <Avatar className="h-10 w-10">
          <AvatarImage src={displayImage || undefined} />
          <AvatarFallback className="bg-primary/20 text-primary">
            {isSupport ? (
              <Shield className="h-5 w-5" />
            ) : (
              displayName.charAt(0).toUpperCase()
            )}
          </AvatarFallback>
        </Avatar>
        {conversation.isBlocked && (
          <div className="absolute -bottom-1 -right-1 bg-destructive rounded-full p-0.5">
            <Ban className="h-3 w-3 text-white" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-medium text-sm text-white truncate">
              {displayName}
            </span>
            {isSeller && !isSupport && (
              <Badge
                variant="outline"
                className="text-[10px] px-1 py-0 border-primary/40 text-primary"
              >
                Seller
              </Badge>
            )}
            {isSupport && (
              <Badge
                variant="outline"
                className="text-[10px] px-1 py-0 border-blue-400/40 text-blue-400"
              >
                Support
              </Badge>
            )}
          </div>
          <span className="text-[11px] text-muted-foreground whitespace-nowrap">
            {conversation.lastMessage
              ? formatDistanceToNow(new Date(conversation.lastMessage.createdAt), {
                  addSuffix: true,
                })
              : ''}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className="text-xs text-muted-foreground truncate">
            {conversation.subject ||
              conversation.lastMessage?.content ||
              'No messages yet'}
          </p>
          {(conversation.unreadCount ?? 0) > 0 && (
            <Badge className="bg-primary text-white text-[10px] h-5 min-w-[20px] flex items-center justify-center rounded-full px-1.5">
              {conversation.unreadCount}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
};
