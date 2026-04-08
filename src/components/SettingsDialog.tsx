import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useCategories, useUpdateCategory, useCreateCategory, useDeleteCategory } from '../hooks/useCategories';
import shared from '../styles/shared.module.css';
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

          <div className="settings-categories">
            {categories?.map((cat) => (
              <div key={cat.id} className={shared.formRow}>
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
                  className={shared.textInputInset}
                  style={{ flex: 1, padding: '0.375rem 0.5rem' }}
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
