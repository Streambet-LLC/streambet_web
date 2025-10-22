import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const widthClasses = {
    full: 'w-full',
    sm: 'w-full md:w-[180px]',
    md: 'w-full md:w-[280px]',
    lg: 'w-full md:w-[320px] lg:w-[400px]',
    auto: 'w-auto',
  };

  return (
    <div
      className={cn(
        'relative rounded-md border border-[#2D343E]',
        widthClasses[width],
        className
      )}
    >
      <Input
        id={id}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        autoFocus={autoFocus}
        className="pl-9 rounded-md"
        aria-label={placeholder}
      />
      <Search 
        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
        aria-hidden="true"
      />
    </div>
  );
};
