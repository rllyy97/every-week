import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  format,
  isSameDay,
  isBefore,
  startOfDay,
  addDays,
  getDate,
  getYear,
} from 'date-fns';
import {
  useRef,
  useCallback,
  useEffect,
  useState,
  useMemo,
} from 'react';
import { flushSync } from 'react-dom';
import { useEventsForRange } from '../hooks/useEvents';
import { useDayColorsForRange, useBatchSetDayColors, useBatchRemoveDayColors } from '../hooks/useDayColors';
import { useCategories } from '../hooks/useCategories';
import { useCalendarStore } from '../stores/calendarStore';
import { usePaintStore } from '../stores/paintStore';
import { DayCell } from './DayCell';
import { DayExpanded } from './DayExpanded';
import { WeekSummary } from './WeekSummary';
import { SwatchPicker } from './SwatchPicker';
import { SettingsDialog } from './SettingsDialog';
import { supabase } from '../lib/supabase';
import type { Event, Category } from '../types/database';
import shared from '../styles/shared.module.css';
import logoSvg from '../assets/logo.svg';
import './Calendar.css';

const WEEKS_BUFFER = 26; // load 26 weeks up and down from current
const WEEK_ROW_HEIGHT = 48; // px per week row (matches --cell-size default)
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getWeekStarts(centerDate: Date, weeksBefore: number, weeksAfter: number): Date[] {
  const weeks: Date[] = [];
  const centerWeekStart = startOfWeek(centerDate);
  for (let i = -weeksBefore; i <= weeksAfter; i++) {
    weeks.push(addWeeks(centerWeekStart, i));
  }
  return weeks;
}

export function Calendar() {
  const today = useMemo(() => startOfDay(new Date()), []);
  const containerRef = useRef<HTMLDivElement>(null);
  const todayRef = useRef<HTMLButtonElement>(null);
  const [weeksBefore, setWeeksBefore] = useState(WEEKS_BUFFER);
  const [weeksAfter, setWeeksAfter] = useState(WEEKS_BUFFER);
  const [initialScrollDone, setInitialScrollDone] = useState(false);
  const [todayDirection, setTodayDirection] = useState<'above' | 'below' | null>(null);
  const isAdjustingScrollRef = useRef(false);

  const selectedDate = useCalendarStore((s) => s.selectedDate);
  const setSelectedDate = useCalendarStore((s) => s.setSelectedDate);

  const weeks = useMemo(
    () => getWeekStarts(today, weeksBefore, weeksAfter),
    [today, weeksBefore, weeksAfter]
  );

  const rangeStart = format(weeks[0], 'yyyy-MM-dd');
  const rangeEnd = format(endOfWeek(weeks[weeks.length - 1]), 'yyyy-MM-dd');

  const { data: events } = useEventsForRange(rangeStart, rangeEnd);
  const { data: dayColors } = useDayColorsForRange(rangeStart, rangeEnd);
  const { data: categories } = useCategories();

  const batchSetDayColors = useBatchSetDayColors();
  const batchRemoveDayColors = useBatchRemoveDayColors();

  const paintTool = usePaintStore((s) => s.tool);
  const setTool = usePaintStore((s) => s.setTool);
  const painting = usePaintStore((s) => s.painting);
  const setPainting = usePaintStore((s) => s.setPainting);

  // Optimistic paint state: local overrides while painting
  const [optimisticPaint, setOptimisticPaint] = useState<Map<string, string | null>>(new Map());
  const paintBatchRef = useRef<Map<string, { type: 'set'; category_id: string } | { type: 'erase' }>>(new Map());

  // Track single-click vs drag for paint toggle behavior
  const paintStartRef = useRef<string | null>(null);
  const paintStartCatIdRef = useRef<string | null>(null);
  const paintDraggedRef = useRef(false);

  // Build maps: date string -> day category color, category info, and category id
  const { dayColorMap, dayCategoryMap, dayCategoryIdMap } = useMemo(() => {
    const colorMap = new Map<string, string>();
    const catMap = new Map<string, { name: string; color: string }>();
    const catIdMap = new Map<string, string>();
    if (dayColors) {
      for (const dc of dayColors) {
        const cat = (dc as any).category;
        if (cat?.color) {
          colorMap.set(dc.date, cat.color);
          catMap.set(dc.date, { name: cat.name, color: cat.color });
          catIdMap.set(dc.date, dc.category_id);
        }
      }
    }
    // Apply optimistic overrides
    for (const [date, color] of optimisticPaint) {
      if (color === null) {
        colorMap.delete(date);
        catMap.delete(date);
        catIdMap.delete(date);
      } else {
        colorMap.set(date, color);
        // Find category name from categories list via paintBatchRef
        const pending = paintBatchRef.current.get(date);
        if (pending?.type === 'set') {
          const cat = categories?.find((c) => c.id === pending.category_id);
          if (cat) {
            catMap.set(date, { name: cat.name, color: cat.color });
            catIdMap.set(date, pending.category_id);
          }
        }
      }
    }
    return { dayColorMap: colorMap, dayCategoryMap: catMap, dayCategoryIdMap: catIdMap };
  }, [dayColors, optimisticPaint, categories]);

  // Build a map: date string -> events on that day
  const eventsByDate = useMemo(() => {
    const map = new Map<string, (Event & { category: Category })[]>();
    if (!events) return map;
    for (const event of events) {
      for (let d = 0; d < event.duration_days; d++) {
        const date = addDays(new Date(event.start_date + 'T00:00:00'), d);
        const key = format(date, 'yyyy-MM-dd');
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(event as Event & { category: Category });
      }
    }
    return map;
  }, [events]);

  // Initial scroll: position current day 1/3 from top
  useEffect(() => {
    if (!containerRef.current || initialScrollDone) return;
    const todayWeekIndex = weeksBefore; // center week is at this index
    const targetScroll = todayWeekIndex * WEEK_ROW_HEIGHT - containerRef.current.clientHeight / 3;
    containerRef.current.scrollTop = Math.max(0, targetScroll);
    setInitialScrollDone(true);
  }, [weeksBefore, initialScrollDone]);

  // Infinite scroll
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el || isAdjustingScrollRef.current) return;

    if (el.scrollTop < WEEK_ROW_HEIGHT * 4) {
      // Near top - load more weeks above
      isAdjustingScrollRef.current = true;
      const prevScrollTop = el.scrollTop;
      const prevHeight = el.scrollHeight;
      flushSync(() => {
        setWeeksBefore((prev) => prev + WEEKS_BUFFER);
      });
      // Restore scroll position: new content was prepended, so offset by the height delta
      el.scrollTop = prevScrollTop + (el.scrollHeight - prevHeight);
      isAdjustingScrollRef.current = false;
    }

    if (el.scrollHeight - el.scrollTop - el.clientHeight < WEEK_ROW_HEIGHT * 4) {
      // Near bottom - load more weeks below
      setWeeksAfter((prev) => prev + WEEKS_BUFFER);
    }
  }, []);

  const handleDayClick = useCallback(
    (dateStr: string) => {
      if (paintTool) return; // don't open dialog when painting
      setSelectedDate(selectedDate === dateStr ? null : dateStr);
    },
    [selectedDate, setSelectedDate, paintTool]
  );

  const applyPaint = useCallback(
    (dateStr: string) => {
      if (!paintTool) return;
      if (paintTool.type === 'category') {
        const cat = categories?.find((c) => c.id === paintTool.categoryId);
        setOptimisticPaint((prev) => new Map(prev).set(dateStr, cat?.color ?? null));
        paintBatchRef.current.set(dateStr, { type: 'set', category_id: paintTool.categoryId });
      } else if (paintTool.type === 'eraser') {
        setOptimisticPaint((prev) => new Map(prev).set(dateStr, null));
        paintBatchRef.current.set(dateStr, { type: 'erase' });
      }
    },
    [paintTool, categories]
  );

  const flushPaintBatch = useCallback(() => {
    const batch = paintBatchRef.current;
    if (batch.size === 0) return;
    const sets: { date: string; category_id: string }[] = [];
    const erases: string[] = [];
    for (const [date, op] of batch) {
      if (op.type === 'set') sets.push({ date, category_id: op.category_id });
      else erases.push(date);
    }
    if (sets.length) batchSetDayColors.mutate(sets);
    if (erases.length) batchRemoveDayColors.mutate(erases);
    paintBatchRef.current = new Map();
    // Clear optimistic state after a short delay to let query refetch
    setTimeout(() => setOptimisticPaint(new Map()), 500);
  }, [batchSetDayColors, batchRemoveDayColors]);

  const handleDayPointerDown = useCallback(
    (dateStr: string) => {
      if (!paintTool) return;
      paintStartRef.current = dateStr;
      paintStartCatIdRef.current = dayCategoryIdMap.get(dateStr) ?? null;
      paintDraggedRef.current = false;
      setPainting(true);
      applyPaint(dateStr);
    },
    [paintTool, setPainting, applyPaint, dayCategoryIdMap]
  );

  const handleDayPointerEnter = useCallback(
    (dateStr: string) => {
      if (!paintTool || !painting) return;
      paintDraggedRef.current = true;
      applyPaint(dateStr);
    },
    [paintTool, painting, applyPaint]
  );

  // Stop painting on pointer up anywhere and flush batch
  // Single-click toggle: if the user clicked one day without dragging and
  // that day already had the same category, convert it to an erase.
  useEffect(() => {
    const handlePointerUp = () => {
      const startDate = paintStartRef.current;
      if (startDate && !paintDraggedRef.current) {
        const pending = paintBatchRef.current.get(startDate);
        if (pending?.type === 'set') {
          const originalCatId = paintStartCatIdRef.current;
          if (originalCatId === pending.category_id) {
            // Toggle: replace the set with an erase
            paintBatchRef.current.set(startDate, { type: 'erase' });
            setOptimisticPaint((prev) => new Map(prev).set(startDate, null));
          }
        }
      }
      paintStartRef.current = null;
      paintStartCatIdRef.current = null;
      paintDraggedRef.current = false;
      setPainting(false);
      flushPaintBatch();
    };
    window.addEventListener('pointerup', handlePointerUp);
    return () => window.removeEventListener('pointerup', handlePointerUp);
  }, [setPainting, flushPaintBatch]);

  // Track whether today's cell is visible, and which direction it is
  useEffect(() => {
    const container = containerRef.current;
    const todayEl = todayRef.current;
    if (!container || !todayEl) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTodayDirection(null);
        } else {
          const containerRect = container.getBoundingClientRect();
          const todayRect = todayEl.getBoundingClientRect();
          setTodayDirection(todayRect.top < containerRect.top ? 'above' : 'below');
        }
      },
      { root: container, threshold: 0 }
    );

    observer.observe(todayEl);
    return () => observer.disconnect();
  }, [initialScrollDone]);

  const scrollToToday = useCallback(() => {
    const todayEl = todayRef.current;
    const container = containerRef.current;
    if (!todayEl || !container) return;
    const containerRect = container.getBoundingClientRect();
    const todayRect = todayEl.getBoundingClientRect();
    const offset = todayRect.top - containerRect.top - containerRect.height / 3;
    container.scrollTo({ top: container.scrollTop + offset, behavior: 'smooth' });
  }, []);

  // Hotkeys: 1-9 toggle category paint, 0 toggles eraser, T scrolls to today, Backspace deselects
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip when user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'Backspace') {
        setTool(null);
      } else if (e.key === '0') {
        setTool(paintTool?.type === 'eraser' ? null : { type: 'eraser' });
      } else if (e.key === 't' || e.key === 'T') {
        scrollToToday();
      } else if (e.key >= '1' && e.key <= '9') {
        const index = parseInt(e.key, 10) - 1;
        if (categories && index < categories.length) {
          const id = categories[index].id;
          setTool(paintTool?.type === 'category' && paintTool.categoryId === id ? null : { type: 'category', categoryId: id });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [categories, setTool, paintTool, scrollToToday]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="calendar-layout">
      <header className="calendar-header">
        <h1 className="calendar-logo">
          <img src={logoSvg} alt="" className="calendar-logo-icon" />
          EveryWeek
        </h1>
        <div className="calendar-header-actions">
          <SwatchPicker />
          <SettingsDialog />
          <button className={shared.btnSurface} onClick={handleSignOut}>
            Sign Out
          </button>
          <a
            href="https://github.com/rllyy97/seven-calendar"
            target="_blank"
            rel="noopener noreferrer"
            className={shared.btnSurface}
            style={{ display: 'inline-flex', alignItems: 'center', padding: '0.375rem' }}
            aria-label="GitHub"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
            </svg>
          </a>
        </div>
      </header>

      <div className="calendar-day-names">
        <div className="day-names-spacer" />
        <div className="day-names-grid">
          {DAY_NAMES.map((name) => (
            <div key={name} className="day-name">
              {name}
            </div>
          ))}
        </div>
        <div className="day-names-spacer" />
      </div>

      <div className="calendar-scroll-wrapper">
        <div className="calendar-scroll" ref={containerRef} onScroll={handleScroll}>
          <div className="calendar-weeks">
          {weeks.map((weekStart) => {
            const days: Date[] = [];
            for (let i = 0; i < 7; i++) {
              days.push(addDays(weekStart, i));
            }

            // Collect all unique events for this week
            const weekEvents: (Event & { category: Category })[] = [];
            const seenIds = new Set<string>();
            for (const day of days) {
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayEvts = eventsByDate.get(dateStr) || [];
              for (const evt of dayEvts) {
                if (!seenIds.has(evt.id)) {
                  seenIds.add(evt.id);
                  weekEvents.push(evt);
                }
              }
            }

            // Check if this week contains the 1st of a month
            const firstOfMonth = days.find((d) => getDate(d) === 1);

            return (
              <div className="calendar-week-row" key={weekStart.toISOString()}>
                <div className="month-label-cell">
                  {firstOfMonth && (
                    <span className="month-label">
                      {format(firstOfMonth, 'MMM')}
                      {getYear(firstOfMonth) !== getYear(today) && (
                        <span className="month-label-year">{format(firstOfMonth, 'yyyy')}</span>
                      )}
                    </span>
                  )}
                </div>

                <div className="calendar-week">
                  {days.map((day) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const dayNum = getDate(day);
                    const isFirst = dayNum === 1;
                    const isToday = isSameDay(day, today);
                    const isPast = isBefore(day, today);
                    const dayEvents = eventsByDate.get(dateStr) || [];
                    const isSelected = selectedDate === dateStr;
                    const dayColor = dayColorMap.get(dateStr);

                    return (
                      <DayCell
                        key={dateStr}
                        ref={isToday ? todayRef : undefined}
                        date={day}
                        dateStr={dateStr}
                        dayNum={dayNum}
                        isFirst={isFirst}
                        isToday={isToday}
                        isPast={isPast}
                        events={dayEvents}
                        isSelected={isSelected}
                        dayColor={dayColor}
                        paintActive={!!paintTool}
                        onClick={handleDayClick}
                        onPointerDown={handleDayPointerDown}
                        onPointerEnter={handleDayPointerEnter}
                      />
                    );
                  })}
                </div>

                <WeekSummary events={weekEvents} onEventClick={setSelectedDate} />
              </div>
            );
          })}
        </div>
      </div>

        {todayDirection && (
          <button
            className={`scroll-to-today scroll-to-today--${todayDirection === 'above' ? 'top' : 'bottom'}`}
            onClick={scrollToToday}
          >
            <span className="scroll-to-today-arrow">{todayDirection === 'above' ? '↑' : '↓'}</span>
            Jump to today
            <kbd className="scroll-to-today-kbd">T</kbd>
          </button>
        )}
      </div>

      {selectedDate && (
        <DayExpanded
          dateStr={selectedDate}
          events={eventsByDate.get(selectedDate) || []}
          categories={categories || []}
          defaultCategory={dayCategoryMap.get(selectedDate)}
          onSetDefaultCategory={(categoryId) => batchSetDayColors.mutate([{ date: selectedDate, category_id: categoryId }])}
          onRemoveDefaultCategory={() => batchRemoveDayColors.mutate([selectedDate])}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  );
}
