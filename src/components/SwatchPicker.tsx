import { useState, useEffect } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { useCategories } from '../hooks/useCategories';
import { usePaintStore } from '../stores/paintStore';
import './SwatchPicker.css';

const COMPACT_BREAKPOINT = 600;

function useIsCompact() {
  const [compact, setCompact] = useState(() => window.innerWidth < COMPACT_BREAKPOINT);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${COMPACT_BREAKPOINT - 1}px)`);
    const handler = (e: MediaQueryListEvent) => setCompact(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return compact;
}

const PaintIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m14.622 17.897-10.68-2.913" />
    <path d="M18.376 2.622a1 1 0 1 1 3.002 3.002L17.36 9.643a.5.5 0 0 0 0 .707l.944.944a2.41 2.41 0 0 1 0 3.408l-.944.944a.5.5 0 0 1-.707 0L8.354 7.348a.5.5 0 0 1 0-.707l.944-.944a2.41 2.41 0 0 1 3.408 0l.944.944a.5.5 0 0 0 .707 0z" />
    <path d="M9 8c-1.804 2.71-3.97 3.46-6.583 3.948a.507.507 0 0 0-.302.819l7.32 8.883a1 1 0 0 0 1.185.204C12.735 20.405 16 16.792 16 15" />
  </svg>
);

function SwatchButtons() {
  const { data: categories } = useCategories();
  const tool = usePaintStore((s) => s.tool);
  const setTool = usePaintStore((s) => s.setTool);

  const handleSwatchClick = (categoryId: string) => {
    if (tool?.type === 'category' && tool.categoryId === categoryId) {
      setTool(null);
    } else {
      setTool({ type: 'category', categoryId });
    }
  };

  const handleEraserClick = () => {
    if (tool?.type === 'eraser') {
      setTool(null);
    } else {
      setTool({ type: 'eraser' });
    }
  };

  if (!categories?.length) return null;

  return (
    <>
      {categories.map((cat) => (
        <button
          key={cat.id}
          className={`swatch-btn ${tool?.type === 'category' && tool.categoryId === cat.id ? 'swatch-btn--active' : ''}`}
          style={{ backgroundColor: cat.color }}
          onClick={() => handleSwatchClick(cat.id)}
          title={cat.name}
          aria-label={`Paint ${cat.name}`}
        />
      ))}
      <button
        className={`swatch-btn swatch-btn--eraser ${tool?.type === 'eraser' ? 'swatch-btn--active' : ''}`}
        onClick={handleEraserClick}
        title="Eraser"
        aria-label="Eraser"
      >
        ✕
      </button>
    </>
  );
}

export function SwatchPicker() {
  const { data: categories } = useCategories();
  const tool = usePaintStore((s) => s.tool);
  const isCompact = useIsCompact();

  if (!categories?.length) return null;

  if (isCompact) {
    const activeCat = tool?.type === 'category'
      ? categories.find((c) => c.id === tool.categoryId)
      : null;

    return (
      <Popover.Root>
        <Popover.Trigger asChild>
          <button
            className={`swatch-picker-compact-trigger ${tool ? 'swatch-picker-compact-trigger--active' : ''}`}
            aria-label="Paint tools"
          >
            <PaintIcon />
            {activeCat && (
              <span className="swatch-picker-compact-dot" style={{ backgroundColor: activeCat.color }} />
            )}
            {tool?.type === 'eraser' && (
              <span className="swatch-picker-compact-dot swatch-picker-compact-dot--eraser">✕</span>
            )}
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content className="swatch-picker-popover" sideOffset={8} align="center">
            <SwatchButtons />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    );
  }

  return (
    <div className="swatch-picker">
      <span className="swatch-picker-icon" aria-hidden="true">
        <PaintIcon />
      </span>
      <SwatchButtons />
    </div>
  );
}
