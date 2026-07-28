import { create } from "zustand";
import type { FiltrosInventario } from "@/modules/inventario/types/lote.types";

interface InventarioState {
  filtros: FiltrosInventario;
  paginaActual: number;
  setFiltros: (f: Partial<FiltrosInventario>) => void;
  resetFiltros: () => void;
  setPagina: (p: number) => void;
}

const filtrosDefault: FiltrosInventario = {
  estado: "Todos",
  tipoBien: "Todos",
  busqueda: "",
};

export const useInventarioStore = create<InventarioState>((set) => ({
  filtros: filtrosDefault,
  paginaActual: 1,
  setFiltros: (f) =>
    set((s) => ({ filtros: { ...s.filtros, ...f }, paginaActual: 1 })),
  resetFiltros: () => set({ filtros: filtrosDefault, paginaActual: 1 }),
  setPagina: (p) => set({ paginaActual: p }),
}));
