'use client';

import {
  Button,
  Calendar,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@connectmessager/ui';
import { CalendarIcon } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

type TDatePickerProps = {
  value: number | undefined;
  onChange: (timestamp: number) => void;
  placeholder?: string;
  className?: string;
  minDate?: number; // Unix timestamp
  maxDate?: number; // Unix timestamp
};

const formatDate = (date: Date | undefined, language: string): string => {
  if (!date) {
    return '';
  }

  return new Intl.DateTimeFormat(language, {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(date);
};

const isValidDate = (date: Date): boolean => {
  if (!date) {
    return false;
  }

  return !isNaN(date.getTime());
};

const DatePicker = memo(
  ({ value = 0, onChange, placeholder, className, minDate, maxDate }: TDatePickerProps) => {
    const { t, i18n } = useTranslation('common');
    const [open, setOpen] = useState(false);

    const dateFromValue = useMemo(() => {
      return value ? new Date(value) : undefined;
    }, [value]);

    const minDateObj = useMemo(() => {
      return minDate ? new Date(minDate) : undefined;
    }, [minDate]);

    const maxDateObj = useMemo(() => {
      return maxDate ? new Date(maxDate) : undefined;
    }, [maxDate]);

    const [month, setMonth] = useState<Date | undefined>(dateFromValue);
    const [inputValue, setInputValue] = useState(() =>
      formatDate(dateFromValue, i18n.language)
    );

    useEffect(() => {
      setInputValue(formatDate(dateFromValue, i18n.language));

      if (dateFromValue) {
        setMonth(dateFromValue);
      }
    }, [dateFromValue, i18n.language]);

    const handleInputChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInputValue(newValue);

        const parsedDate = new Date(newValue);
        if (isValidDate(parsedDate)) {
          const timestamp = parsedDate.getTime();

          if (minDate && timestamp < minDate) return;
          if (maxDate && timestamp > maxDate) return;

          onChange?.(timestamp);
          setMonth(parsedDate);
        }
      },
      [onChange, minDate, maxDate]
    );

    const handleDateSelect = useCallback(
      (selectedDate: Date | undefined) => {
        if (selectedDate) {
          const timestamp = selectedDate.getTime();

          onChange?.(timestamp);
          setInputValue(formatDate(selectedDate, i18n.language));
        } else {
          onChange?.(0);
          setInputValue('');
        }

        setOpen(false);
      },
      [i18n.language, onChange]
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setOpen(true);
        }
      },
      []
    );

    return (
      <div className={`relative flex gap-2 ${className || ''}`}>
        <Input
          value={inputValue}
          placeholder={placeholder ?? t('selectDatePlaceholder')}
          className="border-[#314055] bg-[#0f1722] pr-10 text-[#d7e2f0] placeholder:text-[#6f839b] focus-visible:border-[#4677b8] focus-visible:ring-2 focus-visible:ring-[#4677b8]/25"
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className="absolute top-1/2 right-2 size-6 -translate-y-1/2 rounded-sm border border-[#314055] bg-[#101926] p-0 text-[#8fa2bb] hover:border-[#3d516b] hover:bg-[#1b2940] hover:text-white"
            >
              <CalendarIcon className="size-3.5" />
              <span className="sr-only">{t('selectDate')}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto overflow-hidden rounded-[12px] border border-[#2b3544] bg-[#182433] p-0 text-[#d7e2f0] shadow-[0_24px_64px_rgba(2,6,23,0.5)]"
            align="end"
            alignOffset={-8}
            sideOffset={10}
          >
            <Calendar
              mode="single"
              selected={dateFromValue}
              captionLayout="dropdown"
              month={month}
              onMonthChange={setMonth}
              onSelect={handleDateSelect}
              fromDate={minDateObj}
              toDate={maxDateObj}
              buttonVariant="ghost"
              className="rounded-[12px] bg-[#182433] p-3"
              classNames={{
                month_caption:
                  'flex h-(--cell-size) w-full items-center justify-center px-(--cell-size) text-white',
                dropdowns:
                  'flex h-(--cell-size) w-full items-center justify-center gap-2 text-sm font-medium',
                dropdown_root:
                  'relative rounded-sm border border-[#314055] bg-[#101926] text-[#d7e2f0] shadow-none has-focus:border-[#4677b8] has-focus:ring-2 has-focus:ring-[#4677b8]/25',
                dropdown:
                  'absolute inset-0 cursor-pointer opacity-0',
                caption_label:
                  'flex h-8 items-center gap-1 rounded-sm px-2 pr-1 text-sm text-white [&>svg]:size-3.5 [&>svg]:text-[#8fa2bb]',
                nav: 'absolute inset-x-0 top-0 flex w-full items-center justify-between',
                button_previous:
                  'size-(--cell-size) rounded-sm border border-[#314055] bg-[#101926] p-0 text-[#8fa2bb] shadow-none hover:border-[#3d516b] hover:bg-[#1b2940] hover:text-white aria-disabled:opacity-50',
                button_next:
                  'size-(--cell-size) rounded-sm border border-[#314055] bg-[#101926] p-0 text-[#8fa2bb] shadow-none hover:border-[#3d516b] hover:bg-[#1b2940] hover:text-white aria-disabled:opacity-50',
                weekday:
                  'flex-1 select-none rounded-md text-[0.8rem] font-normal text-[#6f839b]',
                week: 'mt-2 flex w-full',
                day: 'group/day relative aspect-square h-full w-full p-0 text-center select-none',
                today:
                  'rounded-md bg-[#1b2b40] text-[#d7e8ff] data-[selected=true]:rounded-md',
                outside:
                  'text-[#5f7188] aria-selected:text-[#5f7188]',
                disabled: 'text-[#516176] opacity-45'
              }}
              disabled={(date) => {
                if (minDateObj && date < minDateObj) return true;
                if (maxDateObj && date > maxDateObj) return true;
                return false;
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
    );
  }
);

export { DatePicker };


