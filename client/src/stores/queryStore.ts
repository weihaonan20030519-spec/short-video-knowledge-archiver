import { create } from "zustand";

export type ActiveFilter = "all" | "recent" | "unorganized" | "not_started" | "needs_review" | "review_later";

interface QueryState {
  activeFilter: ActiveFilter;
  searchQuery: string;
  selectedFolderId: string | null;
  selectedTagId: string | null;
  setActiveFilter: (value: ActiveFilter) => void;
  setSearchQuery: (value: string) => void;
  setSelectedFolderId: (value: string | null) => void;
  setSelectedTagId: (value: string | null) => void;
  resetScopedFilters: () => void;
}

export const useQueryStore = create<QueryState>((set) => ({
  activeFilter: "all",
  searchQuery: "",
  selectedFolderId: null,
  selectedTagId: null,
  setActiveFilter: (activeFilter) => set({ activeFilter }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedFolderId: (selectedFolderId) => set({ selectedFolderId }),
  setSelectedTagId: (selectedTagId) => set({ selectedTagId }),
  resetScopedFilters: () => set({ selectedFolderId: null, selectedTagId: null })
}));
