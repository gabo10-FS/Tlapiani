import { create } from "zustand";

export interface UsuarioSesion {
  id: string;
  nombre: string;
  email: string;
  rol: "Administrador" | "Donante" | "Transportista";
}

interface AuthState {
  usuario: UsuarioSesion | null;
  isLoading: boolean;
  setUsuario: (u: UsuarioSesion | null) => void;
  setLoading: (v: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  usuario: null,
  isLoading: true,
  setUsuario: (u) => set({ usuario: u, isLoading: false }),
  setLoading: (v) => set({ isLoading: v }),
  logout: () => {
    set({ usuario: null });
    // El cookie httpOnly se limpia via POST /api/auth/logout en el servidor
    fetch("/api/auth/logout", { method: "POST" }).then(() => {
      window.location.href = "/login";
    });
  },
}));
