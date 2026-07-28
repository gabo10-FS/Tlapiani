"use client";
// GSAP: línea de progreso con scaleX (sin reflow), pasos con stagger opacity+x

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

gsap.registerPlugin(useGSAP);

type EstadoDespacho = "Pendiente" | "En Camino" | "Completado" | "Cancelado";

const PASOS = [
  { key: "Pendiente",  label: "PENDING"   },
  { key: "En Camino",  label: "TRANSIT"   },
  { key: "Completado", label: "DELIVERED" },
];

const ORDEN: Record<string, number> = {
  Pendiente: 0, "En Camino": 1, Completado: 2, Cancelado: 1,
};

export function EstadoTracker({ estado }: { estado: EstadoDespacho }) {
  const ref   = useRef<HTMLDivElement>(null);
  const lineaRef = useRef<HTMLDivElement>(null);
  const idx   = ORDEN[estado] ?? 0;
  const color = estado === "Cancelado" ? "var(--c-critica)" : "var(--c-accent)";

  // GSAP: scaleX en la línea — sin animar width (reflow)
  useGSAP(() => {
    gsap.fromTo(lineaRef.current,
      { scaleX: 0 },
      { scaleX: idx / (PASOS.length - 1), duration: 0.7, ease: "power2.out", delay: 0.1,
        transformOrigin: "left center" }
    );
    gsap.from(".tracker-step-item", {
      opacity: 0, x: -6, stagger: 0.1, duration: 0.25, ease: "power2.out", delay: 0.05,
    });
  }, { scope: ref, dependencies: [estado] });

  return (
    <div ref={ref} className="relative py-3">
      {/* Línea base */}
      <div className="absolute top-[1.65rem] left-2 right-2 h-px bg-border" />
      {/* Línea de progreso — scaleX */}
      <div
        ref={lineaRef}
        className="absolute top-[1.65rem] left-2 h-px origin-left"
        style={{ width: "calc(100% - 1rem)", background: color, willChange: "transform" }}
      />
      <div className="relative flex justify-between">
        {PASOS.map((paso, i) => {
          const done   = i <= idx;
          const active = i === idx;
          return (
            <div
              key={paso.key}
              className="tracker-step-item flex flex-col items-center gap-1.5"
              style={{ willChange: "transform, opacity" }}
            >
              <div
                className="flex h-6 w-6 items-center justify-center border text-2xs font-mono"
                style={{
                  background:  active ? color + "20" : "var(--c-panel)",
                  borderColor: done   ? color : "var(--c-border)",
                  color:       done   ? color : "var(--c-dim)",
                }}
              >
                {done ? (active ? "●" : "✓") : "·"}
              </div>
              <span className="text-2xs tracking-widest" style={{ color: done ? color : "var(--c-dim)" }}>
                {paso.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
