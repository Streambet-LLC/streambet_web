import { useEffect, useState } from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';
import { ChatInput } from './ChatInput';


interface Message {
  id: number;
  text: string;
  name:string
}

const ALL_MESSAGES: Message[] = Array.from({ length: 100 }, (_, i) => ({
  id: i + 1,
  text: `Message ${i + 1}`,
  name:'Anyone else'
}));

const PAGE_SIZE = 20;

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadMore(); // Load latest messages on mount
  }, []);

  const loadMore = () => {
    const total = ALL_MESSAGES.length;
    const start = Math.max(0, total - (page + 1) * PAGE_SIZE);
    const end = total - page * PAGE_SIZE;

    const newMessages = ALL_MESSAGES.slice(start, end);
    if (newMessages.length === 0) {
      setHasMore(false);
      return;
    }

    setMessages(prev => [...newMessages, ...prev]);
    setPage(prev => prev + 1);
  };

  const handleSend = (msg: string) => {
    const newMsg: Message = { id: Date.now(), text: msg, name: 'You' };
    setMessages(prev => [...prev, newMsg]);
    setTimeout(() => {
      const container = document.getElementById('scrollableDiv');
      if (container) container.scrollTop = container.scrollHeight;
    }, 50);
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white border border-zinc-700 rounded-[16px]">
      <div className="p-4 text-xl font-semibold ">Live Chat</div>

      <div
        id="scrollableDiv"
        className="flex-1 overflow-y-auto px-4 py-2 space-y-2 bg-['rgba(36, 36, 36, 1)']"
        style={{ display: 'flex', flexDirection: 'column-reverse',backgroundColor:'rgba(24, 24, 24, 1)' }}
      >
        <InfiniteScroll
          dataLength={messages.length}
          next={loadMore}
          hasMore={hasMore}
          inverse={true} // Important for chat-like behavior
          loader={<p className="text-center text-sm text-zinc-500">Loading older messages...</p>}
          scrollableTarget="scrollableDiv"
        >
          {messages.map(msg => (
            <div
              key={msg.id}
              className="px-4 py-2 rounded-lg w-fit max-w-[75%] mb-2"
            >
               <span className="text-sm text-zinc-400 mb-1">{msg.name}</span>
              {/* actual message */}
              <span className="text-white">{msg.text}</span>
            </div>
          ))}
        </InfiniteScroll>
      </div>

      <ChatInput onSend={handleSend} />
    </div>
  );
}
