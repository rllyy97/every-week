import { useState, useRef, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import * as Dialog from '@radix-ui/react-dialog';
import { useCreateEvent, useUpdateEvent, useDeleteEvent } from '../hooks/useEvents';
import { CategorySelect } from './CategorySelect';
import type { Event, Category } from '../types/database';
import shared from '../styles/shared.module.css';
import './DayExpanded.css';

interface DayExpandedProps {
  dateStr: string;
  events: (Event & { category: Category })[];
  categories: Category[];
  defaultCategory?: { name: string; color: string };
  onSetDefaultCategory: (categoryId: string) => void;
  onRemoveDefaultCategory: () => void;
  onClose: () => void;
}

function EditableTitle({ event, onSave }: { event: Event; onSave: (title: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(event.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commit = () => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== event.title) {
      onSave(trimmed);
    } else {
      setValue(event.title);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="event-item-title-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') { setValue(event.title); setEditing(false); }
        }}
      />
    );
  }

  return (
    <span className="event-item-title event-item-title--editable" onClick={() => setEditing(true)}>
      {event.title}
    </span>
  );
}

export function DayExpanded({ dateStr, events, categories, defaultCategory, onSetDefaultCategory, onRemoveDefaultCategory, onClose }: DayExpandedProps) {
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
        <Dialog.Overlay className={shared.overlay} />
        <Dialog.Content className={`${shared.dialogContent} day-expanded-content`} aria-describedby={undefined}>
          <div className={shared.dialogHeader}>
            <Dialog.Title className={shared.dialogTitle}>{formattedDate}</Dialog.Title>
            <Dialog.Close className={shared.closeBtn}>×</Dialog.Close>
          </div>

          <div className="day-expanded-default-category">
            <CategorySelect
              categories={categories}
              value={categories.find((c) => c.name === defaultCategory?.name)?.id || ''}
              onChange={(id) => {
                if (id) {
                  onSetDefaultCategory(id);
                } else {
                  onRemoveDefaultCategory();
                }
              }}
              placeholder="No default"
              allowEmpty
              size="sm"
            />
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
                  <div className="event-item-info">
                    <EditableTitle
                      event={event}
                      onSave={(title) => updateEvent.mutate({ id: event.id, title })}
                    />
                    <CategorySelect
                      categories={categories}
                      value={event.category_id}
                      onChange={(id) => updateEvent.mutate({ id: event.id, category_id: id })}
                      size="sm"
                    />
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
                    className={shared.btnDelete}
                    onClick={() => deleteEvent.mutate(event.id)}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          {showAddForm ? (
            <div className={`${shared.formColumn} add-event-form`}>
              <input
                className={shared.textInput}
                placeholder="Event title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                autoFocus
              />
              <div className={shared.formRow}>
                <CategorySelect
                  categories={categories}
                  value={newCategoryId}
                  onChange={(id) => setNewCategoryId(id)}
                />
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
              <div className={shared.formActions}>
                <button className={shared.btnSecondary} onClick={() => setShowAddForm(false)}>
                  Cancel
                </button>
                <button
                  className={shared.btnPrimary}
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
