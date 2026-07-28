import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { inventarioService } from "../services/inventario.api";
import { useInventarioStore } from "@/store/inventario.store";
import type { RegistroLotePayload } from "../types/lote.types";

export function useInventario() {
  const filtros = useInventarioStore((s) => s.filtros);

  return useQuery({
    queryKey: ["inventario", "lotes", filtros],
    queryFn: () => inventarioService.getLotes(filtros),
    staleTime: 30_000,
  });
}

export function useRegistrarLote() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: RegistroLotePayload) =>
      inventarioService.registrarLote(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventario", "lotes"] });
    },
  });
}
