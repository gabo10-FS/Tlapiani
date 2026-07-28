"use client";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { clsx } from "clsx";
import type { NivelUrgencia } from "../types/urgencia.types";

gsap.registerPlugin(useGSAP);

const LEYENDA: { nivel: NivelUrgencia; label: string; color: string; rango: string }[] = [
  { nivel: "critica", label: "Crítica",   color: "bg-red-500",    rango: "80–100" },
  { nivel: "alta",    label: "Alta",      color: "bg-orange-500", rango: "60–79"  },
  { nivel: "media",   label: "Media",     color: "bg-yellow-500", rango: "40–59"  },
  { nivel: "baja",    label: "Baja",      color: "bg-green-500",  rango: "20–39"  },
  { nivel: "segura",  label: "Segura",    color: "bg-emerald-500",rango: "0–19"   },
];

export function LeyendaPanel() {
  const panelRef = useRef<HTMLDivElement>(null);

  // GSAP: slide-in desde la derecha — solo x + opacity, sin reflow
  useGSAP(() => {
    gsap.from(panelRef.current, {
      x: 20,
      opacity: 0,
      duration: 0.45,
      ease: "power2.out",
      delay: 0.3,
    });
  }, { scope: panelRef });

  return (
    <div
      ref={panelRef}
      className="absolute bottom-6 right-4 z-10 rounded-xl border border-slate-700 bg-slate-900/95 p-4 shadow-xl backdrop-blur"
      style={{ willChange: "transform, opacity" }}
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
        Score de Urgencia
      </p>
      <div className="flex flex-col gap-2">
        {LEYENDA.map((item) => (
          <div key={item.nivel} className="flex items-center gap-2.5">
            <span className={clsx("h-3 w-3 rounded-full", item.color)} />
            <span className="text-xs text-slate-300">{item.label}</span>
            <span className="ml-auto text-[10px] text-slate-500">{item.rango}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 border-t border-slate-800 pt-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-3 w-3 items-center justify-center rounded-full border-2 border-white bg-red-500 text-[6px] text-white">!</span>
          <span className="text-[10px] text-slate-400">Alerta CENAPRED activa</span>
        </div>
      </div>
    </div>
  );
}
