import { memo } from 'react';
import type { Event, Category } from '../types/database';
import './DayCell.css';

interface DayCellProps {
  date: Date;
  dateStr: string;
  dayNum: number;
  isFirst: boolean;
  isToday: boolean;
  isPast: boolean;
  events: (Event & { category: Category })[];
  isSelected: boolean;
  onClick: (dateStr: string) => void;
}

export const DayCell = memo(function DayCell({
  dateStr,
  dayNum,
  isFirst,
  isToday,
  isPast,
  events,
  isSelected,
  onClick,
}: DayCellProps) {
  const uniqueColors = [...new Set(events.map((e) => e.category?.color).filter(Boolean))];
  const hasEvents = uniqueColors.length > 0;

  const cellClass = [
    'day-cell',
    isToday && 'day-cell--today',
    isPast && !isToday && 'day-cell--past',
    isFirst && 'day-cell--first',
    isSelected && 'day-cell--selected',
    hasEvents && 'day-cell--has-events',
  ]
    .filter(Boolean)
    .join(' ');

  // Build background for event colors (horizontal split)
  const bgStyle: React.CSSProperties = {};
  if (uniqueColors.length === 1) {
    bgStyle.backgroundColor = uniqueColors[0];
  } else if (uniqueColors.length > 1) {
    const pct = 100 / uniqueColors.length;
    const stops = uniqueColors
      .map((c, i) => `${c} ${i * pct}%, ${c} ${(i + 1) * pct}%`)
      .join(', ');
    bgStyle.background = `linear-gradient(to bottom, ${stops})`;
  }

  return (
    <button
      className={cellClass}
      onClick={() => onClick(dateStr)}
      aria-label={`${dateStr}${isToday ? ' (today)' : ''}`}
      data-date={dateStr}
    >
      {hasEvents && <div className="day-cell-bg" style={bgStyle} />}
      <span className={`day-cell-num ${hasEvents ? 'day-cell-num--on-color' : ''}`}>
        {isFirst ? (
          <>
            <span className="day-cell-dot">●</span>
            {dayNum}
          </>
        ) : (
          dayNum
        )}
      </span>
    </button>
  );
});
