export interface ConversationParticipant {
  id: string;
  userId: string;
  lastReadAt: string | null;
  isBlocked: boolean;
  blockedAt: string | null;
  user: {
    id: string;
    username: string;
    name: string;
    profileImageUrl: string | null;
    isSeller: boolean;
    role: string;
  };
}

export interface MessageAttachment {
  id: string;
  fileUrl: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  isAdminMessage: boolean;
  adminName: string | null;
  hasReadReceipt: boolean;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
  sender: {
    id: string;
    username: string;
    name: string;
    profileImageUrl: string | null;
    role: string;
  };
  attachments: MessageAttachment[];
}

export interface Conversation {
  id: string;
  type: 'direct' | 'support';
  subject: string | null;
  createdAt: string;
  updatedAt: string;
  participants: ConversationParticipant[];
  lastMessage?: Message;
  unreadCount?: number;
  isBlocked?: boolean;
  totalMessages?: number;
}

export interface ConversationListResponse {
  data: Conversation[];
  total: number;
  page: number;
  limit: number;
}

export interface MessageListResponse {
  data: Message[];
  total: number;
  page: number;
  limit: number;
  conversation?: Conversation;
}

export interface UnreadCountResponse {
  unreadCount: number;
}

export interface InboxSettings {
  readReceiptsEnabled: boolean;
}

export interface UploadedAttachment {
  fileUrl: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

export type ConversationTab = 'all' | 'support' | 'blocked';
export type AdminConversationTab = 'support' | 'user_messages';
