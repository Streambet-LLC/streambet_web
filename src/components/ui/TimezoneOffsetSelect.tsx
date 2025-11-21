import { formatInTimeZone } from 'date-fns-tz';

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

// Timezone display names for North America
const NORTH_AMERICA_NAMES = {
  'America/New_York': 'EST',
  'America/Chicago': 'CST',
  'America/Denver': 'MST',
  'America/Phoenix': 'MST (AZ)',
  'America/Los_Angeles': 'PST',
  'America/Anchorage': 'AKST',
  'Pacific/Honolulu': 'HST',
};

// Common timezones grouped by region
const TIMEZONES = [
  { region: 'North America', zones: [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Phoenix',
    'America/Los_Angeles',
    'America/Anchorage',
    'Pacific/Honolulu',
  ]},
  { region: 'Europe', zones: [
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Europe/Madrid',
    'Europe/Rome',
    'Europe/Amsterdam',
    'Europe/Moscow',
  ]},
  { region: 'Asia', zones: [
    'Asia/Dubai',
    'Asia/Kolkata',
    'Asia/Bangkok',
    'Asia/Singapore',
    'Asia/Hong_Kong',
    'Asia/Shanghai',
    'Asia/Tokyo',
    'Asia/Seoul',
  ]},
  { region: 'Australia & Pacific', zones: [
    'Australia/Sydney',
    'Australia/Melbourne',
    'Australia/Brisbane',
    'Australia/Perth',
    'Pacific/Auckland',
  ]},
];

export const TimezoneOffsetSelect = ({ value, onChange }: TimezoneOffsetSelectProps) => {
  const userTimezone = detectUserTimezone();
  const selectedTimezone = value || userTimezone;

  return (
    <div className="border-t border-[#3a3a3a] p-2">
      <span className="text-xs text-white block mb-1">Timezone (optional):</span>
      <select
        value={selectedTimezone}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#272727] text-[#D7DFEF] border border-input rounded px-2 py-1 text-sm"
        style={{ color: 'white' }}
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
      <span className="text-[10px] text-[#FFFFFFBF] mt-1 block">
        {selectedTimezone === userTimezone
          ? 'Scheduling in your local timezone'
          : `Scheduling in ${selectedTimezone.replace(/_/g, ' ')} timezone`}
      </span>
    </div>
  );
};
