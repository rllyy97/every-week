import { useEffect, useState } from 'react';
import { startOfDay } from 'date-fns';

/**
 * Returns the start-of-day Date for "today" and keeps it fresh:
 * - Schedules an update for the next local midnight.
 * - Re-checks when the tab becomes visible or window regains focus,
 *   so leaving the tab open across days still updates the marker.
 */
export function useToday(): Date {
  const [today, setToday] = useState<Date>(() => startOfDay(new Date()));

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const update = () => {
      const next = startOfDay(new Date());
      setToday((prev) => (prev.getTime() === next.getTime() ? prev : next));
    };

    const scheduleNextMidnight = () => {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      const now = new Date();
      const nextMidnight = startOfDay(new Date(now.getTime() + 24 * 60 * 60 * 1000));
      // Add a small buffer so we land just after midnight.
      const delay = Math.max(1000, nextMidnight.getTime() - now.getTime() + 500);
      timeoutId = setTimeout(() => {
        update();
        scheduleNextMidnight();
      }, delay);
    };

    const handleVisibilityOrFocus = () => {
      update();
      scheduleNextMidnight();
    };

    scheduleNextMidnight();
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, []);

  return today;
}
