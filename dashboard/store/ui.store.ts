import { create } from "zustand";

interface UiState {
  sidebarCollapsed: boolean;
  modalAbierto: string | null;    // ID del modal activo, null si ninguno
  toggleSidebar: () => void;
  abrirModal: (id: string) => void;
  cerrarModal: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarCollapsed: false,
  modalAbierto: null,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  abrirModal: (id) => set({ modalAbierto: id }),
  cerrarModal: () => set({ modalAbierto: null }),
}));
