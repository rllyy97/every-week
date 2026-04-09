import { memo, forwardRef } from 'react';
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
  dayColor?: string;
  paintActive?: boolean;
  onClick: (dateStr: string) => void;
  onPointerDown?: (dateStr: string) => void;
  onPointerEnter?: (dateStr: string) => void;
}

export const DayCell = memo(forwardRef<HTMLButtonElement, DayCellProps>(function DayCell({
  dateStr,
  dayNum,
  isFirst,
  isToday,
  isPast,
  events,
  isSelected,
  dayColor,
  paintActive,
  onClick,
  onPointerDown,
  onPointerEnter,
}, ref) {
  const uniqueColors = [...new Set(events.map((e) => e.category?.color).filter(Boolean))];
  const hasEvents = uniqueColors.length > 0;
  const hasColor = hasEvents || !!dayColor;

  const cellClass = [
    'day-cell',
    isToday && 'day-cell--today',
    isPast && !isToday && 'day-cell--past',
    isFirst && 'day-cell--first',
    isSelected && 'day-cell--selected',
    hasColor && 'day-cell--has-events',
    paintActive && 'day-cell--paint',
  ]
    .filter(Boolean)
    .join(' ');

  // Build background: event colors take priority, then day color
  const bgStyle: React.CSSProperties = {};
  if (uniqueColors.length === 1) {
    bgStyle.backgroundColor = uniqueColors[0];
  } else if (uniqueColors.length > 1) {
    const pct = 100 / uniqueColors.length;
    const stops = uniqueColors
      .map((c, i) => `${c} ${i * pct}%, ${c} ${(i + 1) * pct}%`)
      .join(', ');
    bgStyle.background = `linear-gradient(to bottom, ${stops})`;
  } else if (dayColor) {
    bgStyle.backgroundColor = dayColor;
  }

  // Show corner triangle when day has both events and a default category
  const showCorner = hasEvents && !!dayColor;

  return (
    <button
      ref={ref}
      className={cellClass}
      onClick={() => onClick(dateStr)}
      onPointerDown={() => onPointerDown?.(dateStr)}
      onPointerEnter={() => onPointerEnter?.(dateStr)}
      aria-label={`${dateStr}${isToday ? ' (today)' : ''}`}
      data-date={dateStr}
    >
      {hasColor && <div className="day-cell-bg" style={bgStyle} />}
      {showCorner && <div className="day-cell-corner" style={{ '--corner-color': dayColor } as React.CSSProperties} />}
      <span className={`day-cell-num ${hasColor ? 'day-cell-num--on-color' : ''}`}>
        {isFirst && <span className="day-cell-dot">●</span>}
        {dayNum}
      </span>
    </button>
  );
}));
