import { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BettingRoundStatus } from '@/enums';
import { ChevronDown } from 'lucide-react';

interface PickStatusFilterProps {
  selectedStatuses: string[];
  onStatusChange: (statuses: string[]) => void;
  setCurrentPage?: (page: number) => void;
}

const PICK_STATUS_OPTIONS = [
  { value: BettingRoundStatus.OPEN, label: 'Open', color: '#007AFF' },
  { value: BettingRoundStatus.LOCKED, label: 'Locked', color: 'orange' },
  { value: BettingRoundStatus.CLOSED, label: 'Closed', color: '#6c757d' },
  { value: BettingRoundStatus.CREATED, label: 'Created', color: '#34C759' },
];

export const PickStatusFilter = ({
  selectedStatuses,
  onStatusChange,
  setCurrentPage,
}: PickStatusFilterProps) => {
  const [isExpanded, setIsExpanded] = useState(selectedStatuses.length > 0);
  const [localStatuses, setLocalStatuses] = useState<string[]>(selectedStatuses);

  const handleCheckboxChange = (status: string, checked: boolean) => {
    if (checked) {
      setLocalStatuses([...localStatuses, status]);
    } else {
      setLocalStatuses(localStatuses.filter(s => s !== status));
    }
  };

  const handleApply = () => {
    onStatusChange(localStatuses);
    if (setCurrentPage) {
      setCurrentPage(1);
    }
  };

  const handleClearAll = () => {
    setLocalStatuses([]);
    onStatusChange([]);
    if (setCurrentPage) {
      setCurrentPage(1);
    }
  };

  const selectedCount = localStatuses.length;

  // Sync local state and expanded state with the applied filters
  useEffect(() => {
    setLocalStatuses(selectedStatuses);

    if (selectedStatuses.length > 0) {
      setIsExpanded(true);
    } else {
      setIsExpanded(false);
    }
  }, [selectedStatuses]);

  return (
    <Card className="bg-[rgba(22,22,22,1)] border-[#2D343E] mb-6">
      {/* Clickable Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 cursor-pointer hover:bg-[rgba(30,30,30,1)] transition-colors"
      >
        <div className="flex items-center gap-3">
          <ChevronDown
            size={20}
            className={`text-[#B0B8C1] transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
          <h3 className="font-semibold text-white text-sm flex-1">Filter by Pick Status</h3>
          {selectedCount > 0 && (
            <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
              {selectedCount} selected
            </span>
          )}
        </div>
      </div>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-[#2D343E] space-y-4">
          <div className="flex flex-wrap gap-4 pt-4">
            {PICK_STATUS_OPTIONS.map(option => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`pick-status-${option.value}`}
                  checked={localStatuses.includes(option.value)}
                  onCheckedChange={(checked) =>
                    handleCheckboxChange(option.value, checked as boolean)
                  }
                  className="border-[#4B5563]"
                />
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: option.color }}
                  />
                  <label
                    htmlFor={`pick-status-${option.value}`}
                    className="text-sm text-[#B0B8C1] cursor-pointer font-medium"
                  >
                    {option.label}
                  </label>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              className="border-[#4B5563] text-[#B0B8C1] hover:bg-[#1a1a1a]"
            >
              Clear All
            </Button>
            <Button
              size="sm"
              onClick={handleApply}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};
