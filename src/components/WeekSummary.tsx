import { useRef, useState, useCallback, useEffect } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import type { Event, Category } from '../types/database';
import './WeekSummary.css';

interface WeekSummaryProps {
  events: (Event & { category: Category })[];
  onEventClick?: (dateStr: string) => void;
}

export function WeekSummary({ events, onEventClick }: WeekSummaryProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState<number | null>(null);

  // De-duplicate events (same event may span multiple days in the week)
  const seen = new Set<string>();
  const unique = events.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container || unique.length === 0) {
      setVisibleCount(null);
      return;
    }
    const maxH = container.clientHeight;
    const children = Array.from(container.children) as HTMLElement[];
    let fits = 0;
    for (const child of children) {
      if (child.offsetTop + child.offsetHeight > container.offsetTop + maxH + 1) break;
      fits++;
    }
    if (fits >= unique.length) {
      setVisibleCount(null);
    } else {
      // Reserve one slot for the "+x" badge
      setVisibleCount(Math.max(0, fits - 1));
    }
  }, [unique.length]);

  // Re-measure when container resizes or events change
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // First render: show all to measure, then trim
    setVisibleCount(null);
    requestAnimationFrame(measure);

    const ro = new ResizeObserver(() => {
      setVisibleCount(null);
      requestAnimationFrame(measure);
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [measure]);

  if (unique.length === 0) return null;

  const displayed = visibleCount !== null ? unique.slice(0, visibleCount) : unique;
  const hidden = visibleCount !== null ? unique.slice(visibleCount) : [];
  const overflow = hidden.length;

  return (
    <div className="week-summary" ref={containerRef}>
      {displayed.map((event) => (
        <button
          key={event.id}
          className="week-summary-item"
          onClick={() => onEventClick?.(event.start_date)}
        >
          <span
            className="week-summary-dot"
            style={{ background: event.category?.color || '#666' }}
          />
          <span className="week-summary-title">{event.title}</span>
        </button>
      ))}
      {overflow > 0 && (
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <span className="week-summary-overflow">+{overflow}</span>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content className="week-summary-tooltip" sideOffset={5} side="bottom">
              {hidden.map((event) => (
                <button
                  key={event.id}
                  className="week-summary-tooltip-item"
                  onClick={() => onEventClick?.(event.start_date)}
                >
                  <span
                    className="week-summary-dot"
                    style={{ background: event.category?.color || '#666' }}
                  />
                  <span>{event.title}</span>
                </button>
              ))}
              <Tooltip.Arrow className="week-summary-tooltip-arrow" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      )}
    </div>
  );
}
