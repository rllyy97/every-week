import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import type { Category } from '../types/database';
import './CategorySelect.css';

interface CategorySelectProps {
  categories: Category[];
  value: string;
  onChange: (categoryId: string) => void;
  placeholder?: string;
  allowEmpty?: boolean;
  size?: 'sm' | 'md';
}

export function CategorySelect({
  categories,
  value,
  onChange,
  placeholder = 'Select…',
  allowEmpty = false,
  size = 'md',
}: CategorySelectProps) {
  const [open, setOpen] = useState(false);
  const selected = categories.find((c) => c.id === value);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button className={`cat-select-trigger cat-select-trigger--${size}`} type="button">
          {selected ? (
            <>
              <span className="cat-select-dot" style={{ background: selected.color }} />
              <span className="cat-select-label">{selected.name}</span>
            </>
          ) : (
            <span className="cat-select-placeholder">{placeholder}</span>
          )}
          <span className="cat-select-chevron">▾</span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="cat-select-content" sideOffset={4} align="start">
          {allowEmpty && (
            <button
              className={`cat-select-item ${!value ? 'cat-select-item--active' : ''}`}
              onClick={() => { onChange(''); setOpen(false); }}
            >
              <span className="cat-select-dot cat-select-dot--empty" />
              <span>{placeholder}</span>
            </button>
          )}
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`cat-select-item ${cat.id === value ? 'cat-select-item--active' : ''}`}
              onClick={() => { onChange(cat.id); setOpen(false); }}
            >
              <span className="cat-select-dot" style={{ background: cat.color }} />
              <span>{cat.name}</span>
            </button>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
