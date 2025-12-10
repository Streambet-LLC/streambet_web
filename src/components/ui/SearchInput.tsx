import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRef } from 'react';

interface SearchInputProps {
  id: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  width?: 'full' | 'sm' | 'md' | 'lg' | 'auto';
  autoFocus?: boolean;
}

const WIDTH_CLASSES: Readonly<Record<NonNullable<SearchInputProps['width']>, string>> = {
  full: 'w-full',
  sm: 'w-full md:w-[180px]',
  md: 'w-full md:w-[280px]',
  lg: 'w-full md:w-[320px] lg:w-[400px]',
  auto: 'w-auto',
};

/**
 * A reusable search input component with an embedded search icon.
 * 
 * @example
 * ```tsx
 * <SearchInput
 *   id="search-users"
 *   placeholder="Search users..."
 *   value={searchQuery}
 *   onChange={setSearchQuery}
 *   width="lg"
 * />
 * ```
 */
export const SearchInput: React.FC<SearchInputProps> = ({
  id,
  placeholder = 'Search...',
  value,
  onChange,
  className = '',
  disabled = false,
  width = 'md',
  autoFocus = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  return (
    <div
      className={cn(
        'relative rounded-md border border-[#2D343E]',
        WIDTH_CLASSES[width],
        className
      )}
    >
      <Input
        ref={inputRef}
        id={id}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        autoFocus={autoFocus}
        className={cn('pl-9 rounded-md', value.length > 0 && 'pr-9')}
        aria-label={placeholder}
		    inputMode="search"
      />
      <Search 
        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
        aria-hidden="true"
      />
      {value.length > 0 && (
        <button
          type="button"
          onClick={handleClear}
          disabled={disabled}
          className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground transition-all cursor-pointer animate-in fade-in duration-200"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};
