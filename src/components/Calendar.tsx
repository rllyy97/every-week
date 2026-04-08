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
} from 'date-fns';
import {
  useRef,
  useCallback,
  useEffect,
  useState,
  useMemo,
} from 'react';
import { useEventsForRange } from '../hooks/useEvents';
import { useCategories } from '../hooks/useCategories';
import { useCalendarStore } from '../stores/calendarStore';
import { DayCell } from './DayCell';
import { DayExpanded } from './DayExpanded';
import { WeekSummary } from './WeekSummary';
import { SettingsDialog } from './SettingsDialog';
import { supabase } from '../lib/supabase';
import type { Event, Category } from '../types/database';
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

  const selectedDate = useCalendarStore((s) => s.selectedDate);
  const setSelectedDate = useCalendarStore((s) => s.setSelectedDate);

  const weeks = useMemo(
    () => getWeekStarts(today, weeksBefore, weeksAfter),
    [today, weeksBefore, weeksAfter]
  );

  const rangeStart = format(weeks[0], 'yyyy-MM-dd');
  const rangeEnd = format(endOfWeek(weeks[weeks.length - 1]), 'yyyy-MM-dd');

  const { data: events } = useEventsForRange(rangeStart, rangeEnd);
  const { data: categories } = useCategories();

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
    if (!el) return;

    if (el.scrollTop < WEEK_ROW_HEIGHT * 4) {
      // Near top - load more weeks above
      const addCount = WEEKS_BUFFER;
      setWeeksBefore((prev) => prev + addCount);
      // Maintain scroll position
      el.scrollTop += addCount * WEEK_ROW_HEIGHT;
    }

    if (el.scrollHeight - el.scrollTop - el.clientHeight < WEEK_ROW_HEIGHT * 4) {
      // Near bottom - load more weeks below
      setWeeksAfter((prev) => prev + WEEKS_BUFFER);
    }
  }, []);

  const handleDayClick = useCallback(
    (dateStr: string) => {
      setSelectedDate(selectedDate === dateStr ? null : dateStr);
    },
    [selectedDate, setSelectedDate]
  );

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
    container.scrollTop += offset;
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="calendar-layout">
      <header className="calendar-header">
        <h1 className="calendar-logo">Seven</h1>
        <div className="calendar-header-actions">
          <SettingsDialog />
          <button className="header-btn" onClick={handleSignOut}>
            Sign Out
          </button>
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
                        onClick={handleDayClick}
                      />
                    );
                  })}
                </div>

                <WeekSummary events={weekEvents} />
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
            Today
          </button>
        )}
      </div>

      {selectedDate && (
        <DayExpanded
          dateStr={selectedDate}
          events={eventsByDate.get(selectedDate) || []}
          categories={categories || []}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  );
}
