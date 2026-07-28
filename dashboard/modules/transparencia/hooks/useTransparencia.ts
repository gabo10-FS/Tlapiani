import { useQuery } from "@tanstack/react-query";
import { transparenciaService } from "../services/transparencia.api";

export function usePasaporte(idLote: string) {
  return useQuery({
    queryKey: ["transparencia", "pasaporte", idLote],
    queryFn: () => transparenciaService.buscarPasaporte(idLote),
    enabled: idLote.trim().length > 0,
  });
}
