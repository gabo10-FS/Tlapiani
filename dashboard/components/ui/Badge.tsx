import { clsx } from "clsx";
import type { EstadoLote } from "@/modules/inventario/types/lote.types";
import type { NivelUrgencia } from "@/modules/mapa/types/urgencia.types";

const estadoConfig: Record<EstadoLote, { label: string; dot: string; cls: string }> = {
  "Creado":                 { label: "Creado",    dot: "bg-violet-400",  cls: "bg-violet-50  text-violet-700  border-violet-200" },
  "En Ruta":                { label: "En ruta",   dot: "bg-primary",     cls: "bg-blue-50    text-blue-700    border-blue-200"   },
  "Entregado Exitosamente": { label: "Entregado", dot: "bg-secondary",   cls: "bg-emerald-50 text-emerald-700 border-emerald-200"},
  "Alerta de Manipulación": { label: "Alerta",    dot: "bg-critica",     cls: "bg-red-50     text-red-700     border-red-200"    },
};

export function BadgeEstado({ estado }: { estado: EstadoLote }) {
  const cfg = estadoConfig[estado];
  return (
    <span className={clsx("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border", cfg.cls)}>
      <span className={clsx("h-1.5 w-1.5 rounded-full shrink-0", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

const urgenciaConfig: Record<NivelUrgencia, { label: string; cls: string }> = {
  critica: { label: "Crítica", cls: "bg-red-50    text-red-700    border-red-200"    },
  alta:    { label: "Alta",    cls: "bg-orange-50 text-orange-700 border-orange-200" },
  media:   { label: "Media",   cls: "bg-amber-50  text-amber-700  border-amber-200"  },
  baja:    { label: "Baja",    cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  segura:  { label: "Segura",  cls: "bg-green-50  text-green-700  border-green-200"  },
};

export function BadgeUrgencia({ nivel }: { nivel: NivelUrgencia }) {
  const cfg = urgenciaConfig[nivel];
  return (
    <span className={clsx("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border", cfg.cls)}>
      {cfg.label}
    </span>
  );
}
