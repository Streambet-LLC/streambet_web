import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout';
import { ConversationList } from '@/components/inbox/ConversationList';
import { ThreadView } from '@/components/inbox/ThreadView';
import { NewConversationDialog } from '@/components/inbox/NewConversationDialog';
import { InboxSettingsDialog } from '@/components/inbox/InboxSettingsDialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Settings, MessageSquare } from 'lucide-react';
import type { ConversationTab } from '@/types/inbox';

const Inbox = () => {
  const { session } = useAuthContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<ConversationTab>('all');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    searchParams.get('conversation')
  );
  const preselectedSellerId = searchParams.get('seller') || undefined;
  const preselectedSellerName = searchParams.get('sellerName') || undefined;
  const preselectedSubject = searchParams.get('subject') || undefined;
  const preselectedMessage = searchParams.get('message') || undefined;
  const [showNewConversation, setShowNewConversation] = useState(!!preselectedSellerId);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const conversationParam = searchParams.get('conversation');
    if (conversationParam) {
      setSelectedConversationId(conversationParam);
    }
  }, [searchParams]);

  // Auto-open new conversation dialog when navigating with ?seller= param
  useEffect(() => {
    if (preselectedSellerId) {
      setShowNewConversation(true);
    }
  }, [preselectedSellerId]);

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setSearchParams({ conversation: conversationId });
  };

  const handleBackToList = () => {
    setSelectedConversationId(null);
    setSearchParams({});
  };

  return (
    <MainLayout showFooter={false} className="!p-0 !pb-0 overflow-hidden">
      <div className="flex flex-col h-[calc(100dvh-64px)] min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold text-white">Inbox</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(true)}
              className="h-8 w-8"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={() => setShowNewConversation(true)} className="gap-1">
              <Plus className="h-4 w-4" />
              New Message
            </Button>
          </div>
        </div>

        {/* Main content - split pane */}
        <div className="flex flex-1 overflow-hidden">
          {/* Conversation List (hidden on mobile when thread is open) */}
          <div
            className={`w-full md:w-[380px] md:min-w-[380px] border-r border-border/40 flex flex-col ${
              selectedConversationId ? 'hidden md:flex' : 'flex'
            }`}
          >
            {/* Tabs */}
            <div className="px-3 pt-3">
              <Tabs value={activeTab} onValueChange={v => setActiveTab(v as ConversationTab)}>
                <TabsList className="w-full">
                  <TabsTrigger value="all" className="flex-1">
                    All
                  </TabsTrigger>
                  <TabsTrigger value="support" className="flex-1">
                    Support
                  </TabsTrigger>
                  <TabsTrigger value="blocked" className="flex-1">
                    Blocked
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Conversation list */}
            <ConversationList
              tab={activeTab}
              selectedId={selectedConversationId}
              onSelect={handleSelectConversation}
              currentUserId={session?.user?.id || session?.id}
            />
          </div>

          {/* Thread View */}
          <div
            className={`flex-1 flex flex-col min-h-0 ${selectedConversationId ? 'flex' : 'hidden md:flex'}`}
          >
            {selectedConversationId ? (
              <ThreadView
                conversationId={selectedConversationId}
                currentUserId={session?.user?.id || session?.id}
                onBack={handleBackToList}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Select a conversation to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <NewConversationDialog
        open={showNewConversation}
        onOpenChange={(open) => {
          setShowNewConversation(open);
          if (!open && preselectedSellerId) {
            searchParams.delete('seller');
            searchParams.delete('sellerName');
            searchParams.delete('subject');
            searchParams.delete('message');
            setSearchParams(searchParams);
          }
        }}
        onConversationCreated={handleSelectConversation}
        preselectedSellerId={preselectedSellerId}
        preselectedSellerName={preselectedSellerName}
        preselectedSubject={preselectedSubject}
        preselectedMessage={preselectedMessage}
      />
      <InboxSettingsDialog open={showSettings} onOpenChange={setShowSettings} />
    </MainLayout>
  );
};

export default Inbox;
