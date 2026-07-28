"use client";
import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import dynamic from "next/dynamic";
import { useMapaUrgencia, useMapaStats } from "../hooks/useMapaUrgencia";
import { PanelAuditoria } from "./PanelAuditoria";
import { MapSkeleton } from "@/components/feedback/LoadingSkeleton";
import type { ComunidadUrgencia } from "../types/urgencia.types";

gsap.registerPlugin(useGSAP);

const MapaLeaflet = dynamic(() => import("./MapaLeaflet"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

const URGENCIA_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  critica: { bg: "bg-red-50",    text: "text-red-600",    dot: "bg-red-500"    },
  alta:    { bg: "bg-orange-50", text: "text-orange-600", dot: "bg-orange-500" },
  media:   { bg: "bg-amber-50",  text: "text-amber-600",  dot: "bg-amber-500"  },
  baja:    { bg: "bg-emerald-50",text: "text-emerald-600",dot: "bg-emerald-500"},
  segura:  { bg: "bg-green-50",  text: "text-green-700",  dot: "bg-green-600"  },
};

export function MapaPrioridad() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { data: comunidades, isLoading } = useMapaUrgencia();
  const { data: stats } = useMapaStats();
  const [seleccionada, setSeleccionada] = useState<ComunidadUrgencia | null>(null);

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.from(".mapa-stat", { autoAlpha: 0, y: -10, stagger: 0.08, duration: 0.4, clearProps: "all" })
      .from(".mapa-container", { autoAlpha: 0, duration: 0.4, clearProps: "all" }, "<0.1");
  }, { scope: containerRef });

  return (
    <div ref={containerRef} className="flex flex-col gap-4 h-full">

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total comunidades", val: stats?.totalComunidades ?? "—", color: "sky" },
          { label: "Nivel crítico",     val: stats?.criticas          ?? "—", color: "red" },
          { label: "En atención",       val: stats?.enAtencion        ?? "—", color: "orange" },
          { label: "Suministro seguro", val: stats?.suministroSeguro  ?? "—", color: "emerald" },
        ].map((s) => (
          <div key={s.label} className="mapa-stat bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-sm">
            <div className="text-xs text-slate-400 font-medium">{s.label}</div>
            <div className={`text-2xl font-bold mt-1 ${
              s.color === "sky"     ? "text-sky-600"     :
              s.color === "red"     ? "text-red-500"     :
              s.color === "orange"  ? "text-orange-500"  :
                                      "text-emerald-600"
            }`}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Mapa + Panel */}
      <div className="mapa-container flex gap-4 flex-1 min-h-0">

        {/* Mapa */}
        <div className="relative flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" style={{ minHeight: 520 }}>
          {/* Barra superior del mapa */}
          <div className="absolute top-0 left-0 right-0 z-10 bg-white/90 backdrop-blur-sm border-b border-slate-100 px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
              <span className="text-sm font-medium text-slate-700">Mapa de impacto · CONAPO / CONEVAL</span>
            </div>
            <span className="text-xs text-slate-400">
              {seleccionada
                ? `${seleccionada.nombre} · ${seleccionada.lat.toFixed(3)}, ${seleccionada.lng.toFixed(3)}`
                : `${comunidades?.length ?? 0} comunidades activas`
              }
            </span>
          </div>

          {/* Mapa Leaflet */}
          <div className="absolute inset-0 top-10">
            {isLoading ? <MapSkeleton /> : (
              <MapaLeaflet
                comunidades={comunidades ?? []}
                onSelectComunidad={setSeleccionada}
                comunidadSeleccionada={seleccionada}
              />
            )}
          </div>

          {/* Leyenda */}
          <div className="absolute bottom-4 left-4 z-10 bg-white/95 backdrop-blur-sm rounded-xl border border-slate-200 p-3 shadow-md">
            <p className="text-xs font-semibold text-slate-500 mb-2">Score de urgencia</p>
            <div className="space-y-1.5">
              {Object.entries(URGENCIA_COLORS).map(([nivel, c]) => (
                <div key={nivel} className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${c.dot}`} />
                  <span className="text-xs text-slate-600 capitalize">{nivel}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Panel lateral */}
        <div className="w-80 shrink-0">
          {seleccionada ? (
            <PanelAuditoria
              key={seleccionada.id}
              comunidad={seleccionada}
              onCerrar={() => setSeleccionada(null)}
            />
          ) : (
            <div className="h-full bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center p-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center mb-4">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0EA5E9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                  <circle cx="12" cy="9" r="2.5"/>
                </svg>
              </div>
              <p className="text-sm font-semibold text-slate-700">Selecciona una comunidad</p>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Haz clic en cualquier marcador del mapa para ver su perfil de auditoría y hash SHA-256.
              </p>
              <div className="mt-5 space-y-1.5 text-left w-full">
                {["Hash SHA-256 inmutable", "Score de urgencia IA", "Ciclo de vida del lote"].map((f) => (
                  <div key={f} className="flex items-center gap-2 text-xs text-slate-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-sky-300" />
                    {f}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
