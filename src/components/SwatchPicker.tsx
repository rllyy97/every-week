import { useCategories } from '../hooks/useCategories';
import { usePaintStore } from '../stores/paintStore';
import './SwatchPicker.css';

export function SwatchPicker() {
  const { data: categories } = useCategories();
  const tool = usePaintStore((s) => s.tool);
  const setTool = usePaintStore((s) => s.setTool);

  const handleSwatchClick = (categoryId: string) => {
    if (tool?.type === 'category' && tool.categoryId === categoryId) {
      setTool(null); // deselect
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
    <div className="swatch-picker">
      <span className="swatch-picker-icon" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m14.622 17.897-10.68-2.913" />
          <path d="M18.376 2.622a1 1 0 1 1 3.002 3.002L17.36 9.643a.5.5 0 0 0 0 .707l.944.944a2.41 2.41 0 0 1 0 3.408l-.944.944a.5.5 0 0 1-.707 0L8.354 7.348a.5.5 0 0 1 0-.707l.944-.944a2.41 2.41 0 0 1 3.408 0l.944.944a.5.5 0 0 0 .707 0z" />
          <path d="M9 8c-1.804 2.71-3.97 3.46-6.583 3.948a.507.507 0 0 0-.302.819l7.32 8.883a1 1 0 0 0 1.185.204C12.735 20.405 16 16.792 16 15" />
        </svg>
      </span>
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
    </div>
  );
}
