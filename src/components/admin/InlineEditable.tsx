import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Edit } from 'lucide-react';

interface InlineEditableProps {
  value: string;
  onSave: (newValue: string) => void;
  className?: string;
  minLength?: number;
  placeholder?: string;
  style?: React.CSSProperties;
  isNotCreatedStatus?: boolean;
}

export function InlineEditable({ 
  value, 
  onSave, 
  className = '', 
  minLength = 3,
  placeholder = 'Enter text...',
  isNotCreatedStatus,
  style
}: InlineEditableProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [error, setError] = useState('');
  const [showNotEditableDialog, setShowNotEditableDialog] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const editableRef = useRef<HTMLSpanElement>(null); // Reintroduce a ref for the editable span

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleClick = () => {
    if (isNotCreatedStatus) {
      setShowNotEditableDialog(true);
      return;
    }
    setIsEditing(true);
    setEditValue(value);
    setError('');
  };

  const handleSave = () => {
    const trimmedValue = editValue.trim();
    if (trimmedValue.length < minLength) {
      setError(`Must be at least ${minLength} characters`);
      return;
    }
    if (trimmedValue.length > 50) {
    setError('Must be at most 50 characters');
    return;
    }
    if (trimmedValue !== value) {
      onSave(trimmedValue);
    }
    setIsEditing(false);
    setError('');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(value);
    setError('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip open={!isEditing && !showNotEditableDialog && isHovering}>
          <TooltipTrigger asChild>
            <span 
              ref={editableRef} // Assign the editableRef to the span
              className={`${className} cursor-pointer hover:bg-gray-700 hover:bg-opacity-50 px-1 py-0.5 rounded`}
              style={style}
              onClick={handleClick}
              title="Click to edit"
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
            >
              {value}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{value}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
       <span 
        className={`cursor-pointer`} onClick={handleClick}>
          <Edit className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity ml-2" />
        </span>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className='border-2 border-[#BDFF00]' style={{ background: '#0D0D0D' }}>
          <DialogHeader>
            <DialogTitle>Edit Value</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              ref={inputRef} // Ensure inputRef is assigned to the Input component
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className={`${className} ${error ? 'border-red-500' : ''}`}
              style={style}
            />
            {error && (
              <div className="text-red-500 text-xs mt-1">
                {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <button onClick={handleCancel} className="bg-[#272727] text-white font-medium px-3 rounded-lg border-none text-sm flex items-center justify-center hover:bg-[#232323] focus:bg-[#232323] active:bg-[#1a1a1a] transition-colors h-10">Cancel</button>
            </DialogClose>
            <button onClick={handleSave} className="bg-primary text-black font-medium px-3 rounded-lg border-none text-sm flex items-center justify-center hover:bg-[#6be612] focus:bg-[#6be612] active:bg-[#5cb90f] transition-colors h-10">Save</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showNotEditableDialog} onOpenChange={setShowNotEditableDialog}>
        <DialogContent className='border-2 border-[#7AFF14]' style={{ background: '#0D0D0D' }}>
          <DialogHeader>
            <DialogTitle>Cannot Edit</DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm">
            Cannot edit this field as this round already started by admin
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <button className="bg-[#272727] text-white font-medium px-3 rounded-lg border-none text-sm flex items-center justify-center hover:bg-[#232323] focus:bg-[#232323] active:bg-[#1a1a1a] transition-colors h-10">Close</button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 
