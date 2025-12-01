import React from 'react';
import { Label } from './label';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { CalendarIcon, XIcon } from 'lucide-react';
import { Calendar } from './calendar';

function formatTime12hr(time24) {
  console.log(time24);

  if (!time24) return '';
  const [hour, minute] = time24.split(':');
  const date = new Date();
  date.setHours(Number(hour), Number(minute));
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

const CalendarDatePicker = ({
  label,
  error,
  isLive,
  isUploading,
  onClick,
  dateVal,
  timeVal,
  onChange,
  onChangeDate,
  onChangeTime,
}) => {
  return (
    <div>
      <Label className="text-white font-light mb-3 block">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={`w-full pl-10 mt-2 flex items-center h-10 rounded-md relative
      ${error ? 'border border-red-500' : 'border-none'}
      ${isLive ? 'bg-[#232323] opacity-60 cursor-not-allowed' : 'bg-[#272727] text-[#D7DFEF]'}
    `}
            style={{ textAlign: 'left' }}
            onClick={onClick}
            disabled={isUploading}
          >
            <span className="absolute left-3 top-1/2 -translate-y-1/2">
              <CalendarIcon className="h-5 w-5 text-white" />
            </span>
            <span className={dateVal ? '' : 'text-[#FFFFFFBF]'}>
              {dateVal
                ? dateVal.toLocaleDateString() + (timeVal ? ` ${formatTime12hr(timeVal)}` : '')
                : 'Pick a date & time'}
            </span>
            {!isLive && (dateVal || timeVal) && (
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent p-0"
                onClick={e => {
                  e.stopPropagation();
                  onChange({ date: null, time: '' });
                }}
              >
                <XIcon className="h-4 w-4 text-white" />
              </button>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={dateVal || undefined}
            onSelect={date => {
              if (date) {
                // Set both date and time in a single onChange call to ensure atomic update
                onChange({
                  date: date,
                  time: timeVal || '00:00',
                });
              } else {
                onChange({ data: null, time: '' });
              }
              onChangeDate(date);
            }}
            initialFocus
            showOutsideDays
            disabled={date => date < new Date(new Date().setHours(0, 0, 0, 0))}
          />
          <div className="flex items-center gap-2 p-2">
            <span className="text-xs text-white">Time:</span>
            <input
              type="time"
              value={timeVal}
              onChange={onChangeTime}
              className="bg-[#272727] text-[#D7DFEF] border border-input rounded px-2 py-1 text-sm"
              style={{ color: 'white' }}
            />
          </div>
        </PopoverContent>
      </Popover>
      {error && <div className="text-destructive text-xs mt-1">{error}</div>}
    </div>
  );
};

export default CalendarDatePicker;
