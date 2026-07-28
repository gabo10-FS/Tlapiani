"use client";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { EventoAuditoria } from "../types/auditoria.types";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const TIPO_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  creacion:     { color: "#0EA5E9", bg: "#EFF6FF", label: "Registro"       },
  transito:     { color: "#F59E0B", bg: "#FFFBEB", label: "Tránsito"       },
  entrega:      { color: "#10B981", bg: "#ECFDF5", label: "Entrega"        },
  alerta:       { color: "#EF4444", bg: "#FEF2F2", label: "Alerta"         },
  verificacion: { color: "#8B5CF6", bg: "#F5F3FF", label: "Verificación"   },
};

export function AuditoriaTimeline({ eventos }: { eventos: EventoAuditoria[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.set(".timeline-evento", { autoAlpha: 0, x: -12 });
    ScrollTrigger.batch(".timeline-evento", {
      onEnter: (els) => gsap.to(els, { autoAlpha: 1, x: 0, stagger: 0.08, duration: 0.4, ease: "power2.out", clearProps: "transform" }),
      start: "top 90%",
      once: true,
    });
  }, { scope: ref });

  return (
    <div ref={ref} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-700">Cadena de custodia</h3>
        <p className="text-xs text-slate-400 mt-0.5">{eventos.length} eventos registrados · Inmutable</p>
      </div>

      <div className="p-6">
        <div className="relative space-y-4">
          <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-slate-100" />

          {eventos.map((ev, i) => {
            const s = TIPO_STYLE[ev.tipo] ?? { color: "#64748B", bg: "#F8FAFC", label: ev.tipo };
            return (
              <div key={ev.id ?? i} className="timeline-evento relative flex gap-4 pl-1">
                {/* Nodo */}
                <div className="w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 z-10"
                  style={{ borderColor: s.color, background: s.bg }}>
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                </div>

                {/* Contenido */}
                <div className="flex-1 bg-slate-50 rounded-xl border border-slate-100 px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold" style={{ color: s.color }}>{s.label}</span>
                      <p className="text-sm text-slate-700 mt-0.5">{ev.descripcion}</p>
                      {ev.actor && <p className="text-xs text-slate-400 mt-1">Por: {ev.actor}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-medium text-slate-500">
                        {format(new Date(ev.timestamp), "HH:mm", { locale: es })}
                      </p>
                      <p className="text-xs text-slate-400">
                        {format(new Date(ev.timestamp), "d MMM", { locale: es })}
                      </p>
                    </div>
                  </div>
                  {ev.hashBloque && (
                    <code className="mt-2 block text-xs font-mono text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg truncate">
                      #{ev.hashBloque.slice(0, 20)}…
                    </code>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
