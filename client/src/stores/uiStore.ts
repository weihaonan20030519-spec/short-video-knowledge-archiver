import { create } from "zustand";

interface UIState {
  selectedRecordId: string | null;
  createModalOpen: boolean;
  showOriginalAiResult: boolean;
  setSelectedRecordId: (id: string | null) => void;
  setCreateModalOpen: (open: boolean) => void;
  setShowOriginalAiResult: (show: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  selectedRecordId: null,
  createModalOpen: false,
  showOriginalAiResult: false,
  setSelectedRecordId: (selectedRecordId) => set({ selectedRecordId }),
  setCreateModalOpen: (createModalOpen) => set({ createModalOpen }),
  setShowOriginalAiResult: (showOriginalAiResult) => set({ showOriginalAiResult })
}));
