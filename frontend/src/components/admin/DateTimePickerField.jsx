import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock } from 'lucide-react';

/*
 * Date + time field with an explicit "OK" to commit.
 *
 * Replaces `<input type="datetime-local">` in the admin flow. The native
 * control only opens its picker from the small calendar glyph, and Chrome's
 * popup has no confirm button - you pick a date, pick a time, then have to
 * click somewhere else on the page and hope it took. This field opens from
 * anywhere in the box and keeps every choice in a draft until OK is pressed,
 * so nothing is written by accident and cancelling really cancels.
 *
 * Value in / out is the same `YYYY-MM-DDTHH:mm` string the native input
 * produced, so callers and the API are unaffected.
 */

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const QUICK_TIMES = ['09:00', '12:00', '15:00', '18:00'];
const DEFAULT_TIME = '09:00';

const pad = (n) => String(n).padStart(2, '0');
const dateKeyOf = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const parseDateKey = (key) => {
  const [y, m, d] = String(key).split('-').map(Number);
  return new Date(y, m - 1, d);
};

/*
 * Accepts what the form may already be holding: a bare date, a
 * datetime-local string, or an ISO timestamp. ISO strings are trimmed rather
 * than converted, matching the behaviour of the input this replaces.
 */
const splitValue = (raw) => {
  const text = String(raw || '').trim();
  if (!text) return { dateKey: '', time: '' };
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return { dateKey: text, time: '' };
  const match = text.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  if (match) return { dateKey: match[1], time: match[2] };
  return { dateKey: '', time: '' };
};

const formatTime = (time) => {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
};

/* Chip labels drop the ":00" so all four presets fit on one row. */
const formatCompactTime = (time) => {
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  const opts = m ? { hour: 'numeric', minute: '2-digit' } : { hour: 'numeric' };
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, opts);
};

const formatDisplay = (dateKey, time) => {
  if (!dateKey) return '';
  const date = parseDateKey(dateKey);
  if (Number.isNaN(date.getTime())) return '';
  const day = date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  return time ? `${day} at ${formatTime(time)}` : day;
};

const monthCells = (year, month) => {
  const cells = [];
  const lead = new Date(year, month, 1).getDay();
  const total = new Date(year, month + 1, 0).getDate();
  for (let i = 0; i < lead; i += 1) cells.push(null);
  for (let d = 1; d <= total; d += 1) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
};

const DateTimePickerField = ({
  label,
  value,
  onChange,
  placeholder = 'Select date and time',
  testId,
  disabled = false,
}) => {
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const gridRef = useRef(null);
  const refocusGridRef = useRef(false);
  const reactId = useId();
  const labelId = `${reactId}-label`;
  const triggerId = `${reactId}-trigger`;

  const committed = useMemo(() => splitValue(value), [value]);

  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const [draftDate, setDraftDate] = useState(committed.dateKey);
  const [draftTime, setDraftTime] = useState(committed.time);
  const [viewMonth, setViewMonth] = useState(() => {
    const base = committed.dateKey ? parseDateKey(committed.dateKey) : new Date();
    return { year: base.getFullYear(), month: base.getMonth() };
  });

  const todayKey = dateKeyOf(new Date());
  const display = formatDisplay(committed.dateKey, committed.time);

  const openPicker = () => {
    if (disabled) return;
    // Start from whatever is saved; an empty field opens on today so the user
    // is one click from the common case.
    const startDate = committed.dateKey || todayKey;
    const base = parseDateKey(startDate);
    setDraftDate(startDate);
    setDraftTime(committed.time || DEFAULT_TIME);
    setViewMonth({ year: base.getFullYear(), month: base.getMonth() });
    const rect = triggerRef.current?.getBoundingClientRect();
    setDropUp(Boolean(rect) && rect.bottom + 380 > window.innerHeight && rect.top > 380);
    setOpen(true);
  };

  const closePicker = ({ refocus = true } = {}) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };

  const commit = () => {
    if (!draftDate) return;
    onChange(`${draftDate}T${draftTime || DEFAULT_TIME}`);
    closePicker();
  };

  const clear = () => {
    onChange('');
    closePicker();
  };

  /* Dismiss on outside pointer / Escape. Both discard the draft. */
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        closePicker();
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [open]);

  /* Move focus into the panel so keyboard users land on the selected day. */
  useEffect(() => {
    if (!open) return;
    const selected = gridRef.current?.querySelector('[data-selected="true"]');
    (selected || panelRef.current)?.focus();
  }, [open]);

  /* Arrow keys moved the selection; follow it with focus. */
  useEffect(() => {
    if (!refocusGridRef.current) return;
    refocusGridRef.current = false;
    gridRef.current?.querySelector('[data-selected="true"]')?.focus();
  });

  const shiftMonth = (delta) => {
    setViewMonth((prev) => {
      const next = new Date(prev.year, prev.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  };

  const selectDay = (day) => {
    setDraftDate(dateKeyOf(new Date(viewMonth.year, viewMonth.month, day)));
  };

  /* Roving focus across the grid: only the selected day is tabbable. */
  const onGridKeyDown = (event) => {
    const steps = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    const step = steps[event.key];
    const monthStep = event.key === 'PageUp' ? -1 : event.key === 'PageDown' ? 1 : 0;
    if (!step && !monthStep) return;
    event.preventDefault();
    const from = draftDate ? parseDateKey(draftDate) : new Date(viewMonth.year, viewMonth.month, 1);
    const next = monthStep
      ? new Date(from.getFullYear(), from.getMonth() + monthStep, from.getDate())
      : new Date(from.getFullYear(), from.getMonth(), from.getDate() + step);
    setDraftDate(dateKeyOf(next));
    setViewMonth({ year: next.getFullYear(), month: next.getMonth() });
    refocusGridRef.current = true;
  };

  const cells = monthCells(viewMonth.year, viewMonth.month);
  const monthLabel = new Date(viewMonth.year, viewMonth.month, 1)
    .toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <div className="grid gap-1" ref={rootRef}>
      {label && (
        <span id={labelId} className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">{label}</span>
      )}
      <div className="relative">
        <button
          type="button"
          id={triggerId}
          ref={triggerRef}
          onClick={() => (open ? closePicker() : openPicker())}
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-labelledby={label ? `${labelId} ${triggerId}` : undefined}
          data-testid={testId}
          className="flex w-full items-center justify-between gap-2 rounded border border-[#D7CBB8] bg-white px-3 py-2 text-left text-[12px] text-[#1A1A1A] transition-colors hover:border-[#1F4A3A] focus:border-[#1F4A3A] focus:outline-none disabled:cursor-not-allowed disabled:bg-[#F4F2ED] disabled:text-[#8A8A8A]"
        >
          <span className={display ? '' : 'text-[#8A8A8A]'}>{display || placeholder}</span>
          <CalendarDays className="h-3.5 w-3.5 flex-shrink-0 text-[#8A6E2F]" />
        </button>

        {open && (
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="false"
            aria-label={label || 'Select date and time'}
            tabIndex={-1}
            data-testid={testId ? `${testId}-popup` : undefined}
            className={`absolute left-0 z-50 w-[280px] max-w-[calc(100vw-2rem)] rounded-xl border border-[#D7CBB8] bg-white p-3 shadow-lg focus:outline-none ${dropUp ? 'bottom-full mb-2' : 'top-full mt-2'}`}
          >
            {/* Month navigation */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                aria-label="Previous month"
                className="rounded-md p-1 text-[#4F3E2F] hover:bg-[#F4F2EC]"
                data-testid={testId ? `${testId}-prev-month` : undefined}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-[12px] font-semibold text-[#1A1A1A]" aria-live="polite">{monthLabel}</span>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                aria-label="Next month"
                className="rounded-md p-1 text-[#4F3E2F] hover:bg-[#F4F2EC]"
                data-testid={testId ? `${testId}-next-month` : undefined}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Weekday header */}
            <div className="mt-2 grid grid-cols-7 gap-0.5">
              {WEEKDAYS.map((day) => (
                <span key={day} className="py-1 text-center text-[10px] uppercase tracking-wider text-[#8A8A8A]">{day}</span>
              ))}
            </div>

            {/* Days */}
            <div ref={gridRef} className="grid grid-cols-7 gap-0.5" onKeyDown={onGridKeyDown} role="grid" aria-label="Choose a date">
              {cells.map((day, index) => {
                if (!day) return <span key={`pad-${index}`} className="h-8" />;
                const key = dateKeyOf(new Date(viewMonth.year, viewMonth.month, day));
                const isSelected = key === draftDate;
                const isToday = key === todayKey;
                return (
                  <button
                    key={key}
                    type="button"
                    data-selected={isSelected}
                    data-day={key}
                    tabIndex={isSelected ? 0 : -1}
                    aria-pressed={isSelected}
                    onClick={() => selectDay(day)}
                    className={`h-8 rounded-md text-[12px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1F4A3A]/40 ${
                      isSelected
                        ? 'bg-[#1F4A3A] font-semibold text-white'
                        : isToday
                          ? 'border border-[#1F4A3A]/40 text-[#1F4A3A] hover:bg-[#F4F2EC]'
                          : 'text-[#1A1A1A] hover:bg-[#F4F2EC]'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            {/* Time */}
            <div className="mt-3 border-t border-[#F0E7D4] pt-3">
              <label className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-[#8A8A8A]">
                <Clock className="h-3.5 w-3.5 text-[#8A6E2F]" />
                Time
                <input
                  type="time"
                  value={draftTime}
                  onChange={(event) => setDraftTime(event.target.value)}
                  className="ml-auto rounded border border-[#D7CBB8] bg-white px-2 py-1 text-[12px] normal-case tracking-normal text-[#1A1A1A] focus:border-[#1F4A3A] focus:outline-none"
                  data-testid={testId ? `${testId}-time` : undefined}
                />
              </label>
              <div className="mt-2 flex flex-wrap gap-1">
                {QUICK_TIMES.map((time) => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => setDraftTime(time)}
                    className={`rounded-full border px-2 py-0.5 text-[11px] transition-colors ${
                      draftTime === time
                        ? 'border-[#1F4A3A] bg-[#E8F3ED] text-[#1F4A3A]'
                        : 'border-[#E8E4DB] text-[#6E6657] hover:bg-[#F4F2EC]'
                    }`}
                  >
                    {formatCompactTime(time)}
                  </button>
                ))}
              </div>
            </div>

            {/* Commit */}
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#F0E7D4] pt-3">
              <button
                type="button"
                onClick={clear}
                className="text-[11px] text-[#8A8A8A] underline underline-offset-2 hover:text-[#B54A37]"
                data-testid={testId ? `${testId}-clear` : undefined}
              >
                Clear
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => closePicker()}
                  className="rounded-lg border border-[#E8E4DB] px-3 py-1.5 text-[12px] text-[#1A1A1A] hover:bg-[#F4F2EC]"
                  data-testid={testId ? `${testId}-cancel` : undefined}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={commit}
                  disabled={!draftDate}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#1F4A3A] px-4 py-1.5 text-[12px] font-medium text-white hover:bg-[#173D30] disabled:opacity-40"
                  data-testid={testId ? `${testId}-ok` : undefined}
                >
                  <Check className="h-3.5 w-3.5" /> OK
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DateTimePickerField;
