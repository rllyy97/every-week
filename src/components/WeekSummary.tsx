import type { Event, Category } from '../types/database';
import './WeekSummary.css';

interface WeekSummaryProps {
  events: (Event & { category: Category })[];
}

export function WeekSummary({ events }: WeekSummaryProps) {
  if (events.length === 0) return null;

  // De-duplicate events (same event may span multiple days in the week)
  const seen = new Set<string>();
  const unique = events.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });

  return (
    <div className="week-summary">
      {unique.map((event) => (
        <div key={event.id} className="week-summary-item">
          <span
            className="week-summary-dot"
            style={{ background: event.category?.color || '#666' }}
          />
          <span className="week-summary-title">{event.title}</span>
        </div>
      ))}
    </div>
  );
}
