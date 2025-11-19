import { SearchInput } from '../ui/SearchInput';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { SortAsc, SortDesc } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useDebounce } from '@/lib/utils';

export default function HomeBetsFilters({
  onChange
} : {
  onChange?: (filters: any) => void;
}) {
  // temporary
  const [search, setSearch] = useState("");

  const debouncedSearch = useDebounce((searchTerm: string) => {
    onChange({ search, sort, order });
  });
  const [sort, setSort] = useState("totalBet");
  const [order, setOrder] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    onChange({ search, sort, order });
  }, [sort, order]);

  useEffect(() => {
    debouncedSearch(search);
  }, [search]);

  return (
    <div className="flex justify-end gap-2">
      <SearchInput id='' className="border-none" value={search} onChange={setSearch} />
      <Select value={sort} onValueChange={setSort}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Total Bet" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="totalBet">
            Total Bet
          </SelectItem>
          <SelectItem value="numberOfBettors">
            Number of Bettors
          </SelectItem>
          <SelectItem value="dateCreated">
            Date Created
          </SelectItem>
        </SelectContent>
      </Select>
      <Button size="icon" onClick={() => setOrder(order === "asc" ? "desc" : "asc")}>
        {order === "asc" ? <SortAsc /> : <SortDesc />}
      </Button>
    </div>
  );
}
