import { useState, useRef, useEffect, useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useCategories, useUpdateCategory, useCreateCategory, useDeleteCategory, useReorderCategories } from '../hooks/useCategories';
import type { Category } from '../types/database';
import shared from '../styles/shared.module.css';
import './SettingsDialog.css';

function CategoryNameInput({ value, onSave }: { value: string; onSave: (name: string) => void }) {
  const [localValue, setLocalValue] = useState(value);
  const latestServerValue = useRef(value);

  // Sync from server only when it genuinely changes (not from our own edit)
  useEffect(() => {
    if (value !== latestServerValue.current) {
      latestServerValue.current = value;
      setLocalValue(value);
    }
  }, [value]);

  const commit = () => {
    const trimmed = localValue.trim();
    if (trimmed && trimmed !== value) {
      latestServerValue.current = trimmed;
      onSave(trimmed);
    } else {
      setLocalValue(value);
    }
  };

  return (
    <input
      type="text"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') setLocalValue(value);
      }}
      className={shared.textInputInset}
      style={{ flex: 1, padding: '0.375rem 0.5rem' }}
    />
  );
}

export function SettingsDialog() {
  const [open, setOpen] = useState(false);
  const { data: categories } = useCategories();
  const updateCategory = useUpdateCategory();
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();
  const reorderCategories = useReorderCategories();

  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#888888');

  // Drag reorder state
  const [localOrder, setLocalOrder] = useState<Category[] | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Use localOrder during drag, otherwise server data
  const displayCategories = localOrder ?? categories ?? [];

  const handleDragStart = useCallback((index: number) => {
    setLocalOrder(categories ? [...categories] : null);
    setDragIndex(index);
    setOverIndex(index);
  }, [categories]);

  const handleDragOver = useCallback((index: number) => {
    if (dragIndex === null || !localOrder) return;
    if (index === overIndex) return;
    setOverIndex(index);
    const reordered = [...localOrder];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(index, 0, moved);
    setLocalOrder(reordered);
    setDragIndex(index);
  }, [dragIndex, overIndex, localOrder]);

  const handleDragEnd = useCallback(() => {
    if (localOrder) {
      const newOrder = localOrder.map((c) => c.id);
      reorderCategories.mutate(newOrder, {
        onSettled: () => setLocalOrder(null),
      });
    }
    setDragIndex(null);
    setOverIndex(null);
    // Keep localOrder visible until mutation settles
  }, [localOrder, reorderCategories]);

  const handleAddCategory = () => {
    if (!newName.trim()) return;
    createCategory.mutate({
      name: newName.trim(),
      color: newColor,
      sort_order: (categories?.length || 0),
    });
    setNewName('');
    setNewColor('#888888');
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className={shared.btnSurface}>Settings</button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className={shared.overlay} />
        <Dialog.Content className={shared.dialogContent} style={{ maxWidth: 400 }} aria-describedby={undefined}>
          <div className={shared.dialogHeader} style={{ marginBottom: '1.5rem' }}>
            <Dialog.Title className={shared.dialogTitle} style={{ fontSize: '1.125rem' }}>Settings</Dialog.Title>
            <Dialog.Close className={shared.closeBtn}>×</Dialog.Close>
          </div>

          <h3 className="settings-section-title">Categories</h3>

          <div className="settings-categories" ref={listRef}>
            {displayCategories.map((cat, i) => (
              <div
                key={cat.id}
                className={`${shared.formRow} settings-category-row ${dragIndex === i ? 'settings-category-row--dragging' : ''}`}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'move';
                  handleDragStart(i);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  handleDragOver(i);
                }}
                onDragEnd={handleDragEnd}
              >
                <span className="settings-drag-handle" title="Drag to reorder">⠿</span>
                <input
                  type="color"
                  value={cat.color}
                  onChange={(e) =>
                    updateCategory.mutate({ id: cat.id, color: e.target.value })
                  }
                  className="settings-color-input"
                />
                <CategoryNameInput
                  value={cat.name}
                  onSave={(name) => updateCategory.mutate({ id: cat.id, name })}
                />
                <button
                  className={shared.btnDelete}
                  onClick={() => deleteCategory.mutate(cat.id)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className={shared.formRow}>
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="settings-color-input"
            />
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New category"
              className={shared.textInputInset}
              style={{ flex: 1, padding: '0.375rem 0.5rem' }}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
            />
            <button className={shared.btnIcon} onClick={handleAddCategory}>
              +
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
