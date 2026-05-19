import { useState } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { DayPicker, DateRange } from 'react-day-picker';
import { Icon } from '../ds/icon';
import 'react-day-picker/dist/style.css';
import './DateRangePicker.css';

interface DateRangePickerProps {
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const formatDateRange = (range: DateRange | undefined) => {
    if (!range?.from) return 'Seleziona periodo...';
    if (!range.to) return format(range.from, 'dd MMM yyyy', { locale: it });
    return `${format(range.from, 'dd MMM yyyy', { locale: it })} - ${format(
      range.to,
      'dd MMM yyyy',
      { locale: it },
    )}`;
  };

  const hasValue = Boolean(value?.from);

  return (
    <div className="date-range">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="date-range__trigger"
      >
        <Icon family="regular" name="calendar" className="date-range__trigger-icon" />
        <span className={hasValue ? '' : 'date-range__placeholder'}>
          {formatDateRange(value)}
        </span>
      </button>

      {isOpen && (
        <>
          <div className="date-range__backdrop" onClick={() => setIsOpen(false)} />
          <div className="date-range__pop">
            <DayPicker
              mode="range"
              selected={value}
              onSelect={(range) => {
                onChange(range);
                if (range?.from && range?.to) {
                  setIsOpen(false);
                }
              }}
              locale={it}
              disabled={{ before: new Date() }}
              className="date-range-picker"
            />
          </div>
        </>
      )}
    </div>
  );
}
