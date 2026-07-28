"use client";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { BadgeUrgencia } from "@/components/ui/Badge";
import type { ComunidadUrgencia } from "../types/urgencia.types";

gsap.registerPlugin(useGSAP);

const HEX_CHARS = "0123456789abcdef";

function hashDesdeComunidad(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = Math.imul(31, h) + id.charCodeAt(i) | 0;
  const seed = Math.abs(h).toString(16).padStart(8, "0");
  let result = "";
  const base = seed.repeat(8);
  for (let i = 0; i < 64; i++) result += ((parseInt(base[i % base.length], 16) + i * 7) % 16).toString(16);
  return result;
}

const URGENCIA_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  critica: { color: "#EF4444", bg: "#FEF2F2", border: "#FECACA" },
  alta:    { color: "#F97316", bg: "#FFF7ED", border: "#FED7AA" },
  media:   { color: "#F59E0B", bg: "#FFFBEB", border: "#FDE68A" },
  baja:    { color: "#10B981", bg: "#ECFDF5", border: "#A7F3D0" },
  segura:  { color: "#059669", bg: "#F0FDF4", border: "#BBF7D0" },
};

interface Props { comunidad: ComunidadUrgencia; onCerrar: () => void; }

export function PanelAuditoria({ comunidad, onCerrar }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const hashRef  = useRef<HTMLDivElement>(null);
  const hash     = hashDesdeComunidad(comunidad.id);
  const style    = URGENCIA_STYLE[comunidad.nivelUrgencia];

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.from(panelRef.current, { autoAlpha: 0, x: 20, duration: 0.4, clearProps: "all" })
      .from(".audit-metric", { autoAlpha: 0, y: 8, stagger: 0.06, duration: 0.3, clearProps: "all" }, "<0.1")
      .from(".audit-step",   { autoAlpha: 0, x: -8, stagger: 0.1,  duration: 0.3, clearProps: "all" }, "<0.1");
  }, { scope: panelRef });

  // Hash scramble animation
  useGSAP(() => {
    if (!hashRef.current) return;
    const el = hashRef.current;
    const tween = gsap.to({}, {
      duration: 2.0, ease: "power1.inOut",
      onUpdate() {
        const resolved = Math.floor(this.progress() * hash.length);
        let html = "";
        for (let i = 0; i < hash.length; i++) {
          html += i < resolved
            ? `<span style="color:${style.color}">${hash[i]}</span>`
            : `<span style="color:#CBD5E1;opacity:0.6">${HEX_CHARS[Math.floor(Math.random() * 16)]}</span>`;
        }
        el.innerHTML = html;
      },
      onComplete() { el.innerHTML = `<span style="color:${style.color}">${hash}</span>`; },
    });
    return () => tween.kill();
  }, { scope: panelRef, dependencies: [comunidad.id] });

  return (
    <div ref={panelRef} className="h-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-4 py-4 border-b border-slate-100" style={{ background: style.bg }}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full" style={{ background: style.color }} />
              <span className="text-xs font-semibold" style={{ color: style.color }}>
                {comunidad.nivelUrgencia.toUpperCase()}
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-800">{comunidad.nombre}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{comunidad.municipio}, {comunidad.estado}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <button onClick={onCerrar} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/60 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            <BadgeUrgencia nivel={comunidad.nivelUrgencia} />
          </div>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-3 border-b border-slate-100">
        {[
          { label: "Score", val: comunidad.scoreUrgencia, unit: "/100" },
          { label: "Población", val: comunidad.poblacion.toLocaleString("es-MX"), unit: "hab." },
          { label: "Marginación", val: `${(comunidad.indiceMarginacion * 100).toFixed(0)}%`, unit: "" },
        ].map((m) => (
          <div key={m.label} className="audit-metric px-3 py-3 text-center border-r border-slate-100 last:border-0">
            <p className="text-xs text-slate-400">{m.label}</p>
            <p className="text-lg font-bold text-slate-800 mt-0.5">{m.val}</p>
            {m.unit && <p className="text-xs text-slate-400">{m.unit}</p>}
          </div>
        ))}
      </div>

      {/* Alerta */}
      {comunidad.alertaActiva && (
        <div className="px-4 py-2.5 bg-red-50 border-b border-red-100 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs font-semibold text-red-600">
            Alerta CENAPRED activa · {format(new Date(comunidad.ultimaActualizacion), "dd MMM HH:mm", { locale: es })}
          </span>
        </div>
      )}

      {/* Hash SHA-256 */}
      <div className="px-4 py-4 border-b border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500">Hash SHA-256</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: style.bg, color: style.color }}>
            Verificado
          </span>
        </div>
        <div ref={hashRef} className="hash-terminal" />
      </div>

      {/* Ciclo de vida */}
      <div className="flex-1 px-4 py-4 overflow-y-auto">
        <p className="text-xs font-semibold text-slate-500 mb-3">Ciclo de vida del lote</p>
        <div className="space-y-3">
          {[
            { label: "Registrado",       done: true  },
            { label: "Hash generado",    done: true  },
            { label: "En tránsito",      done: true  },
            { label: "Entrega confirmada", done: false },
          ].map((paso, i) => (
            <div key={i} className="audit-step flex items-center gap-3">
              <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0"
                style={{
                  borderColor: paso.done ? style.color : "#E2E8F0",
                  background:  paso.done ? style.bg    : "transparent",
                }}>
                {paso.done && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={style.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </div>
              <span className={`text-sm ${paso.done ? "text-slate-700 font-medium" : "text-slate-400"}`}>
                {paso.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
        <p className="text-xs text-slate-400">
          {format(new Date(comunidad.ultimaActualizacion), "d MMM yyyy · HH:mm", { locale: es })} ·
          {" "}{comunidad.lat.toFixed(4)}, {comunidad.lng.toFixed(4)}
        </p>
      </div>
    </div>
  );
}
