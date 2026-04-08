import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import * as Dialog from '@radix-ui/react-dialog';
import { useCreateEvent, useUpdateEvent, useDeleteEvent } from '../hooks/useEvents';
import type { Event, Category } from '../types/database';
import './DayExpanded.css';

interface DayExpandedProps {
  dateStr: string;
  events: (Event & { category: Category })[];
  categories: Category[];
  onClose: () => void;
}

export function DayExpanded({ dateStr, events, categories, onClose }: DayExpandedProps) {
  const date = parseISO(dateStr);
  const formattedDate = format(date, 'EEEE, MMMM d, yyyy');

  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategoryId, setNewCategoryId] = useState(categories[0]?.id || '');
  const [newDuration, setNewDuration] = useState(1);

  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();

  const handleAdd = async () => {
    if (!newTitle.trim() || !newCategoryId) return;
    await createEvent.mutateAsync({
      title: newTitle.trim(),
      category_id: newCategoryId,
      start_date: dateStr,
      duration_days: newDuration,
    });
    setNewTitle('');
    setNewDuration(1);
    setShowAddForm(false);
  };

  const handleDurationChange = (eventId: string, currentDuration: number, delta: number) => {
    const next = Math.max(1, currentDuration + delta);
    updateEvent.mutate({ id: eventId, duration_days: next });
  };

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="day-expanded-overlay" />
        <Dialog.Content className="day-expanded-content">
          <div className="day-expanded-header">
            <Dialog.Title className="day-expanded-title">{formattedDate}</Dialog.Title>
            <Dialog.Close className="day-expanded-close">×</Dialog.Close>
          </div>

          <div className="day-expanded-events">
            {events.length === 0 && !showAddForm && (
              <p className="day-expanded-empty">No events</p>
            )}

            {events.map((event) => (
              <div
                key={event.id}
                className="event-item"
                style={{ borderLeftColor: event.category?.color || '#666' }}
              >
                <div className="event-item-main">
                  <span
                    className="event-color-dot"
                    style={{ background: event.category?.color || '#666' }}
                  />
                  <div className="event-item-info">
                    <span className="event-item-title">{event.title}</span>
                    <span className="event-item-category">{event.category?.name}</span>
                  </div>
                </div>
                <div className="event-item-actions">
                  <div className="duration-control">
                    <button
                      className="duration-btn"
                      onClick={() => handleDurationChange(event.id, event.duration_days, -1)}
                      disabled={event.duration_days <= 1}
                    >
                      −
                    </button>
                    <span className="duration-value">
                      {event.duration_days}d
                    </span>
                    <button
                      className="duration-btn"
                      onClick={() => handleDurationChange(event.id, event.duration_days, 1)}
                    >
                      +
                    </button>
                  </div>
                  <button
                    className="event-delete-btn"
                    onClick={() => deleteEvent.mutate(event.id)}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          {showAddForm ? (
            <div className="add-event-form">
              <input
                className="add-event-input"
                placeholder="Event title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                autoFocus
              />
              <div className="add-event-row">
                <select
                  className="add-event-select"
                  value={newCategoryId}
                  onChange={(e) => setNewCategoryId(e.target.value)}
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <div className="duration-control">
                  <button
                    className="duration-btn"
                    onClick={() => setNewDuration(Math.max(1, newDuration - 1))}
                    disabled={newDuration <= 1}
                  >
                    −
                  </button>
                  <span className="duration-value">{newDuration}d</span>
                  <button
                    className="duration-btn"
                    onClick={() => setNewDuration(newDuration + 1)}
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="add-event-actions">
                <button className="add-event-cancel" onClick={() => setShowAddForm(false)}>
                  Cancel
                </button>
                <button
                  className="add-event-submit"
                  onClick={handleAdd}
                  disabled={!newTitle.trim() || createEvent.isPending}
                >
                  {createEvent.isPending ? '...' : 'Add'}
                </button>
              </div>
            </div>
          ) : (
            <button className="add-event-btn" onClick={() => setShowAddForm(true)}>
              + Add Event
            </button>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
