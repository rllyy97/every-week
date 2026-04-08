import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useCategories, useUpdateCategory, useCreateCategory, useDeleteCategory } from '../hooks/useCategories';
import './SettingsDialog.css';

export function SettingsDialog() {
  const [open, setOpen] = useState(false);
  const { data: categories } = useCategories();
  const updateCategory = useUpdateCategory();
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();

  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#888888');

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
        <button className="header-btn">Settings</button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="settings-overlay" />
        <Dialog.Content className="settings-content" aria-describedby={undefined}>
          <div className="settings-header">
            <Dialog.Title className="settings-title">Settings</Dialog.Title>
            <Dialog.Close className="settings-close">×</Dialog.Close>
          </div>

          <h3 className="settings-section-title">Categories</h3>

          <div className="settings-categories">
            {categories?.map((cat) => (
              <div key={cat.id} className="settings-category-row">
                <input
                  type="color"
                  value={cat.color}
                  onChange={(e) =>
                    updateCategory.mutate({ id: cat.id, color: e.target.value })
                  }
                  className="settings-color-input"
                />
                <input
                  type="text"
                  value={cat.name}
                  onChange={(e) =>
                    updateCategory.mutate({ id: cat.id, name: e.target.value })
                  }
                  className="settings-name-input"
                />
                <button
                  className="settings-delete-btn"
                  onClick={() => deleteCategory.mutate(cat.id)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="settings-add-row">
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
              className="settings-name-input"
              onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
            />
            <button className="settings-add-btn" onClick={handleAddCategory}>
              +
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
