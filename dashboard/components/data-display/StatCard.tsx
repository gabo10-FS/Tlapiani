"use client";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { clsx } from "clsx";

gsap.registerPlugin(useGSAP, ScrollTrigger);

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: string;
  positivo?: boolean;
  icono?: React.ReactNode;
  color?: "sky" | "red" | "emerald" | "violet";
  descripcion?: string;
  countUp?: boolean;
}

const colores = {
  sky:     { value: "text-sky-600",     bg: "bg-sky-50",     icon: "text-sky-500",     border: "border-sky-100" },
  red:     { value: "text-red-600",     bg: "bg-red-50",     icon: "text-red-500",     border: "border-red-100" },
  emerald: { value: "text-emerald-600", bg: "bg-emerald-50", icon: "text-emerald-500", border: "border-emerald-100" },
  violet:  { value: "text-violet-600",  bg: "bg-violet-50",  icon: "text-violet-500",  border: "border-violet-100" },
};

export function StatCard({ label, value, delta, positivo, icono, color = "sky", descripcion, countUp }: StatCardProps) {
  const cardRef  = useRef<HTMLDivElement>(null);
  const valueRef = useRef<HTMLParagraphElement>(null);
  const c = colores[color];

  useGSAP(() => {
    // Entrada con back.out para sensación premium
    gsap.from(cardRef.current, {
      autoAlpha: 0, y: 20, duration: 0.55,
      ease: "back.out(1.5)",
      clearProps: "all",
      scrollTrigger: {
        trigger: cardRef.current,
        start: "top 88%",
        once: true,
      },
    });

    // Count-up opcional para valores numéricos
    if (countUp && typeof value === "number" && valueRef.current) {
      const el = valueRef.current;
      const obj = { val: 0 };
      gsap.to(obj, {
        val: value,
        duration: 1.4,
        delay: 0.3,
        ease: "power2.out",
        scrollTrigger: { trigger: cardRef.current, start: "top 88%", once: true },
        onUpdate() {
          el.textContent = Math.round(obj.val).toLocaleString("es-MX");
        },
      });
    }
  }, { scope: cardRef });

  return (
    <div ref={cardRef} className="impact-card p-5" style={{ willChange: "transform, opacity" }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
          <p ref={valueRef} className={clsx("mt-2 text-3xl font-bold tracking-tight", c.value)}>
            {countUp && typeof value === "number" ? "0" : value}
          </p>
          {descripcion && <p className="mt-1 text-xs text-slate-400">{descripcion}</p>}
        </div>
        {icono && (
          <div className={clsx("p-3 rounded-2xl border shrink-0", c.bg, c.border)}>
            <span className={clsx("text-xl", c.icon)}>{icono}</span>
          </div>
        )}
      </div>
      {delta && (
        <div className={clsx(
          "mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs font-semibold",
          positivo ? "text-emerald-600" : "text-red-500"
        )}>
          {positivo ? "↑" : "↓"} {delta}
        </div>
      )}
    </div>
  );
}
