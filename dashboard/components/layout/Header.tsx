"use client";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

gsap.registerPlugin(useGSAP);

const META: Record<string, { label: string; color: string }> = {
  "/inventario":    { label: "Inventario",       color: "text-sky-500" },
  "/mapa":          { label: "Mapa de impacto",   color: "text-violet-500" },
  "/despacho":      { label: "Despacho",          color: "text-emerald-500" },
  "/transparencia": { label: "Transparencia",     color: "text-amber-500" },
};

export function Header() {
  const pathname  = usePathname();
  const base      = "/" + pathname.split("/")[1];
  const meta      = META[base] ?? { label: "Tlapiani", color: "text-sky-500" };
  const headerRef = useRef<HTMLElement>(null);
  const [hora, setHora]   = useState("");
  const [fecha, setFecha] = useState("");

  useGSAP(() => {
    gsap.from(headerRef.current, {
      autoAlpha: 0, y: -10, duration: 0.4, ease: "power2.out", clearProps: "all",
    });
  }, { scope: headerRef });

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setHora(now.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }));
      setFecha(now.toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" }));
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <header ref={headerRef} className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-5 shrink-0 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="text-slate-300">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </span>
        <span className="text-slate-300 text-sm">/</span>
        <span className={`text-sm font-semibold ${meta.color}`}>{meta.label}</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-1.5 text-sm">
          <span className="text-slate-400 capitalize">{fecha}</span>
          <span className="text-slate-200">·</span>
          <span className="font-medium text-slate-600">{hora}</span>
        </div>
        <div className="h-4 w-px bg-slate-200" />
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-sm text-emerald-600 font-medium">Sistema activo</span>
        </div>
      </div>
    </header>
  );
}
