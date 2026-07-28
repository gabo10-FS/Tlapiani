import { useQuery } from "@tanstack/react-query";
import { mapaService } from "../services/mapa.api";

export function useMapaUrgencia() {
  return useQuery({
    queryKey: ["mapa", "comunidades"],
    queryFn: () => mapaService.getComunidades(),
    staleTime: 60_000,   // datos de urgencia — refrescar cada minuto
    refetchInterval: 60_000,
  });
}

export function useMapaStats() {
  return useQuery({
    queryKey: ["mapa", "stats"],
    queryFn: () => mapaService.getStats(),
    staleTime: 60_000,
  });
}
