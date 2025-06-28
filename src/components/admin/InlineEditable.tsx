import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';

interface InlineEditableProps {
  value: string;
  onSave: (newValue: string) => void;
  className?: string;
  minLength?: number;
  placeholder?: string;
  style?: React.CSSProperties;
}

export function InlineEditable({ 
  value, 
  onSave, 
  className = '', 
  minLength = 3,
  placeholder = 'Enter text...',
  style
}: InlineEditableProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleClick = () => {
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

  if (isEditing) {
    return (
      <div className="relative">
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          placeholder={placeholder}
          className={`${className} ${error ? 'border-red-500' : ''}`}
          style={style}
        />
        {error && (
          <div className="absolute top-full left-0 text-red-500 text-xs mt-1">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <span 
      className={`${className} cursor-pointer hover:bg-gray-700 hover:bg-opacity-50 px-1 py-0.5 rounded`}
      style={style}
      onClick={handleClick}
      title="Click to edit"
    >
      {value}
    </span>
  );
} 
