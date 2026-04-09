import { create } from 'zustand';

type PaintTool = { type: 'category'; categoryId: string } | { type: 'eraser' } | null;

interface PaintStore {
  tool: PaintTool;
  setTool: (tool: PaintTool) => void;
  painting: boolean;
  setPainting: (painting: boolean) => void;
}

export const usePaintStore = create<PaintStore>((set) => ({
  tool: null,
  setTool: (tool) => set({ tool }),
  painting: false,
  setPainting: (painting) => set({ painting }),
}));
