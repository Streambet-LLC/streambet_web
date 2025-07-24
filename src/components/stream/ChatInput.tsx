
import { useState, useRef, useEffect } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { Smile, ImagePlus } from 'lucide-react';
import api from '@/integrations/api/client';
import Picker from '@emoji-mart/react'
import data from '@emoji-mart/data'
import { useBettingStatusContext } from '@/contexts/BettingStatusContext';
import { useToast } from '@/hooks/use-toast';

interface ChatInputProps {
  onSend: (msg: string, imageUrl?: string) => void;
  onImageAdd?: () => void;
}

export const ChatInput = ({ onSend,onImageAdd }: ChatInputProps) => {
  const [message, setMessage] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null); 

  const { socketConnect } = useBettingStatusContext();
  const { toast } = useToast();

  const handleSend = () => {
    if (socketConnect && (message.trim() || imageUrl)) {
      onSend(message, imageUrl);
      setMessage('');
      setImageUrl(null)
      setImageFile(null);
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };


  const onEmojiClick = (emojiData: any) => {
    console.log(emojiData,'here emoji data');
    setMessage((prev) => prev + emojiData.emoji);
    setShowEmoji(false);
    inputRef.current?.focus();
  };

  

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
       // Check file type
    if (!file.type.startsWith('image/')) {
      // Show toast for invalid file type
      toast({
        description: 'Only image files are allowed.',
        variant: 'destructive',
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
      if (file.size > 1024 * 1024) {
        toast({
          description: 'Image size must be less than 1MB',
          variant: 'destructive',
        });
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        if (onImageAdd) onImageAdd();
      };
      reader.readAsDataURL(file);
      const response = await api.auth.uploadImage(file, 'thumbnail');
      setImageUrl(response?.data?.Key)
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node)
      ) {
        setShowEmoji(false);
      }
    };

    if (showEmoji) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmoji]);


  return (
    <div>
    <div className="relative p-2 flex items-center">
      <button onClick={() => setShowEmoji(prev => !prev)} className="mr-2">
        <Smile className="text-white w-5 h-5" />
      </button>

      <button onClick={() => fileInputRef.current?.click()} className="mr-2">
        <ImagePlus className="text-white w-5 h-5" />
      </button>

      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handleImageChange}
      />

      {showEmoji && (
        <div  ref={emojiPickerRef} className="custom-emoji-picker absolute bottom-16 left-4 z-10">
          <Picker
            data={data}
            onEmojiSelect={(emoji) => {
              setMessage(prev => prev + emoji.native);
              // setShowEmoji(false);
              inputRef.current?.focus();
            }}
            previewPosition="none"
            theme="dark"
            header={false}
          />
          {/* <EmojiPicker onEmojiClick={onEmojiClick} searchDisabled={true}/> */}
        </div>
      )}

      <div className="flex-1 flex flex-col gap-1">
        <textarea
          style={{
          fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, EmojiOne Color, FabioXM, sans-serif'
          }}
          ref={inputRef}
          value={message}
          onChange={e => setMessage(e.target.value)}
          className="w-full bg-[#212121] text-white px-4 py-2 rounded-lg outline-none resize-none font-emoji"
          rows={1}
        />

      </div>

      <button
        onClick={handleSend}
        className="ml-2 bg-[#BDFF00] text-[#000000] px-5 py-3 rounded-[32px] font-semibold text-xs"
      >
        Send
      </button>
      
    </div>
      {imagePreview && (
        <div className="relative mt-1 w-32" style={{margin:'auto'}}>
          <img
            src={imagePreview}
            alt="preview"
            className="rounded-lg max-h-32 object-cover mt-5 mb-5"
          />
          <button
            onClick={() => {
              setImagePreview(null);
              setImageFile(null);
              setImageUrl(null)
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
            className="absolute top-1 right-1 bg-black bg-opacity-60 text-white text-xs px-1 py-0.5 rounded"
          >
            ✕
          </button>
        </div>
      )}
      </div>
  );
};
