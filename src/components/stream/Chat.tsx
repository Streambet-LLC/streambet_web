import { useEffect, useRef, useState } from 'react';
import { ChatInput } from './ChatInput';
import { getImageLink } from '@/utils/helper';


interface Message {
  id: number;
  text: string;
  name: string;
  imageURL?: string;
  timestamp: string;
}

interface IncomingMessage {
  type: string;
  username: string;
  message: string;
  imageURL: string;
  timestamp: string;
}

interface ChatProps {
  sendMessageSocket: (data: { message: string; imageURL: string }) => void;
  sendMessage?: string;
  newSocketMessage?: IncomingMessage; 
  session:any;
}

export default function Chat({ sendMessageSocket, newSocketMessage,session }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);


  const handleSend = (message: string, imageURL: string) => {
    sendMessageSocket({ message, imageURL });
  };

  console.log(session,'session')

  const addNewMessage = (data: IncomingMessage) => {
    const newMsg: Message = {
      id: Date.now(),
      text: data.message,
      name: data.username === session?.username ? 'You' : data.username,
      imageURL: data.imageURL,
      timestamp: data.timestamp,
    };
    setMessages(prev => [...prev, newMsg]);
  };

  useEffect(() => {
    if (newSocketMessage) {
      addNewMessage(newSocketMessage);
    }
  }, [newSocketMessage]);

  useEffect(() => {
    // Scroll to bottom
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  return (
    <div className="flex flex-col max-h-[120vh] min-h-[80vh] bg-black text-white border border-zinc-700 rounded-[16px]">
      <div className="p-4 text-sm font-semibold">Live chat</div>

      <div
        ref={scrollRef}
        id="scrollableDiv"
        className="flex-1 h-screen overflow-y-auto px-4 py-2 space-y-2 bg-['rgba(36, 36, 36, 1)']"
        style={{ backgroundColor: 'rgba(24, 24, 24, 1)' }}
      >
        {messages.map(msg => (
          <div key={msg.id} className="px-4 py-2 rounded-lg mb-2 bg-[#181818]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold"
               style={{ color: msg.name === 'You' ? '#BDFF00' : '#606060' }}>{msg.name}</span>
              <span className="text-xs text-[#FFFFFF] ml-2">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <span className="text-[#D7DFEF] text-xs font-medium">{msg.text}</span>
            {msg.imageURL && (
              <img 
              onLoad={() => {
                if (scrollRef.current) {
                  scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                }
              }}
              src={getImageLink(msg.imageURL)} alt="chat media" className="mt-1 rounded max-w-[200px]" />
            )}
          </div>
        ))}
      </div>

      <ChatInput onSend={handleSend} onImageAdd={scrollToBottom}/>
    </div>
  );
}
