import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { despachoService } from "../services/despacho.api";
import type { DespachoPayload } from "../types/despacho.types";

export function useDespachos() {
  return useQuery({
    queryKey: ["despacho", "lista"],
    queryFn: () => despachoService.getDespachos(),
  });
}

export function useCrearDespacho() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: DespachoPayload) =>
      despachoService.crearDespacho(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["despacho", "lista"] });
    },
  });
}
