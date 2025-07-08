// components/ChatInput.tsx
import { useState, useRef } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { Smile } from 'lucide-react';

interface ChatInputProps {
  onSend: (msg: string) => void;
}

export const ChatInput = ({ onSend }: ChatInputProps) => {
  const [message, setMessage] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (message.trim()) {
      onSend(message);
      setMessage('');
    }
  };

  const onEmojiClick = (emojiData: any) => {
    setMessage(prev => prev + emojiData.emoji);
    setShowEmoji(false);
    inputRef.current?.focus();
  };

  return (
    <div className="relative  p-2 flex items-center">
      <button onClick={() => setShowEmoji(prev => !prev)} className="mr-2">
        <Smile className="text-white w-5 h-5" />
      </button>

      {showEmoji && (
        <div className="absolute bottom-16 left-4 z-10">
          <EmojiPicker onEmojiClick={onEmojiClick} />
        </div>
      )}

      <input
        ref={inputRef}
        type="text"
        value={message}
        onChange={e => setMessage(e.target.value)}
        className="flex-1 bg-zinc-800 text-white px-4 py-2 rounded-lg outline-none"
      />

      <button
        onClick={handleSend}
        className="ml-2 bg-[#BDFF00]  text-[#000000] px-5 py-3 rounded-[32px] font-semibold text-xs"
      >
        Send
      </button>
    </div>
  );
};
