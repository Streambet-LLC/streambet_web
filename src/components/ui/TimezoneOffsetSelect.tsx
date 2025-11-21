import { formatInTimeZone } from 'date-fns-tz';
import { TIMEZONES, NORTH_AMERICA_NAMES } from '@/utils/constants';

interface TimezoneOffsetSelectProps {
  value?: string;
  onChange: (timezone: string) => void;
}

// Get current UTC offset for a timezone
const getTimezoneOffset = (timezone: string): string => {
  try {
    const now = new Date();
    const offset = formatInTimeZone(now, timezone, 'XXX'); // e.g., "-05:00"
    return offset;
  } catch (error) {
    return '+00:00';
  }
};

// Detect user's current timezone
const detectUserTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    return 'UTC';
  }
};

export const TimezoneOffsetSelect = ({ value, onChange }: TimezoneOffsetSelectProps) => {
  const userTimezone = detectUserTimezone();
  const selectedTimezone = value || userTimezone;

  return (
    <div className="border-t border-border p-2">
      <label 
        htmlFor="timezone-select" 
        className="text-xs text-foreground block mb-1"
      >
        Timezone (optional):
      </label>
      <select
        id="timezone-select"
        aria-describedby="timezone-helper-text"
        value={selectedTimezone}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-muted text-muted-foreground border border-input rounded px-2 py-1 text-sm"
      >
        {TIMEZONES.map((group) => (
          <optgroup key={group.region} label={group.region}>
            {group.zones.map((tz) => {
              const offset = getTimezoneOffset(tz);
              // Use abbreviation for North America, otherwise use city name
              const displayName = group.region === 'North America' 
                ? NORTH_AMERICA_NAMES[tz] || tz
                : tz.split('/').pop()?.replace(/_/g, ' ') || tz;
              return (
                <option key={tz} value={tz}>
                  {displayName} (UTC{offset})
                </option>
              );
            })}
          </optgroup>
        ))}
      </select>
      <span 
        id="timezone-helper-text"
        className="text-[10px] text-muted-foreground/75 mt-1 block"
        role="status"
        aria-live="polite"
      >
        {selectedTimezone === userTimezone
          ? 'Scheduling in your local timezone'
          : `Scheduling in ${selectedTimezone.replace(/_/g, ' ')} timezone`}
      </span>
    </div>
  );
};
