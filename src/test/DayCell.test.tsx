import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DayCell } from '../components/DayCell';

const noop = () => {};

describe('DayCell', () => {
  const baseProps = {
    date: new Date(2026, 3, 7), // April 7, 2026
    dateStr: '2026-04-07',
    dayNum: 7,
    isFirst: false,
    isToday: false,
    isPast: false,
    events: [],
    isSelected: false,
    onClick: noop,
  };

  it('renders day number', () => {
    render(<DayCell {...baseProps} />);
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('applies today class when isToday', () => {
    render(<DayCell {...baseProps} isToday />);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('day-cell--today');
  });

  it('applies past class when isPast and not today', () => {
    render(<DayCell {...baseProps} isPast />);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('day-cell--past');
  });

  it('does not apply past class when isToday', () => {
    render(<DayCell {...baseProps} isToday isPast />);
    const btn = screen.getByRole('button');
    expect(btn.className).not.toContain('day-cell--past');
  });

  it('shows first-of-month indicator', () => {
    render(<DayCell {...baseProps} dayNum={1} isFirst />);
    expect(screen.getByText('●')).toBeInTheDocument();
    expect(screen.getByRole('button').className).toContain('day-cell--first');
  });

  it('shows single event color background', () => {
    const events = [
      {
        id: '1',
        user_id: 'u1',
        category_id: 'c1',
        title: 'Test',
        start_date: '2026-04-07',
        duration_days: 1,
        created_at: '',
        updated_at: '',
        category: {
          id: 'c1',
          user_id: 'u1',
          name: 'Red',
          color: '#ef4444',
          sort_order: 0,
          created_at: '',
        },
      },
    ] as any;

    const { container } = render(<DayCell {...baseProps} events={events} />);
    const bg = container.querySelector('.day-cell-bg');
    expect(bg).toBeTruthy();
    expect(bg?.getAttribute('style')).toContain('background-color');
    expect(bg?.getAttribute('style')).toContain('239, 68, 68');
  });

  it('shows horizontal split for multiple event colors', () => {
    const events = [
      {
        id: '1',
        user_id: 'u1',
        category_id: 'c1',
        title: 'Red Event',
        start_date: '2026-04-07',
        duration_days: 1,
        created_at: '',
        updated_at: '',
        category: { id: 'c1', user_id: 'u1', name: 'Red', color: '#ef4444', sort_order: 0, created_at: '' },
      },
      {
        id: '2',
        user_id: 'u1',
        category_id: 'c2',
        title: 'Blue Event',
        start_date: '2026-04-07',
        duration_days: 1,
        created_at: '',
        updated_at: '',
        category: { id: 'c2', user_id: 'u1', name: 'Blue', color: '#3b82f6', sort_order: 2, created_at: '' },
      },
    ] as any;

    const { container } = render(<DayCell {...baseProps} events={events} />);
    const bg = container.querySelector('.day-cell-bg');
    expect(bg).toBeTruthy();
    const style = bg?.getAttribute('style') || '';
    expect(style).toContain('linear-gradient');
    expect(style).toContain('239, 68, 68');
    expect(style).toContain('59, 130, 246');
  });

  it('applies selected class when isSelected', () => {
    render(<DayCell {...baseProps} isSelected />);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('day-cell--selected');
  });
});
