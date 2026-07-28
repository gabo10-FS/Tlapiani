"use client";
import { useRef, useEffect } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { BadgeEstado } from "@/components/ui/Badge";
import { TableSkeleton } from "@/components/feedback/LoadingSkeleton";
import { EmptyState } from "@/components/feedback/EmptyState";
import { useInventario } from "../hooks/useInventario";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const COLS = ["ID Lote", "Tipo", "Cantidad", "Comunidad destino", "Estado", "Hash SHA-256", "Fecha"];

export function InventarioTable() {
  const { data: lotes, isLoading, isError } = useInventario();
  const tableRef = useRef<HTMLDivElement>(null);

  // ScrollTrigger.batch — la forma correcta de animar listas con GSAP
  useEffect(() => {
    if (!lotes?.length) return;

    // Esperar un frame para que el DOM exista
    const id = requestAnimationFrame(() => {
      // Preparar estado inicial
      gsap.set(".table-row", { autoAlpha: 0, y: 16 });

      ScrollTrigger.batch(".table-row", {
        onEnter: (elements) => {
          gsap.to(elements, {
            autoAlpha: 1,
            y: 0,
            stagger: 0.04,
            duration: 0.45,
            ease: "power2.out",
            clearProps: "transform",
          });
        },
        start: "top 92%",
        once: true,
      });
    });

    return () => {
      cancelAnimationFrame(id);
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, [lotes]);

  if (isLoading) return <TableSkeleton filas={6} />;

  if (isError) return (
    <EmptyState titulo="No se pudo conectar al servidor"
      descripcion="Verifica la conexión con el backend e intenta de nuevo." />
  );

  if (!lotes?.length) return (
    <EmptyState titulo="Sin lotes registrados"
      descripcion="Crea el primer lote usando el botón de nuevo registro." />
  );

  return (
    <div ref={tableRef} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {COLS.map((col) => (
                <th key={col} className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lotes.map((lote) => (
              <tr
                key={lote.id}
                className="table-row border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors duration-100"
              >
                <td className="px-5 py-4">
                  <span className="font-mono text-xs font-bold text-sky-600 bg-sky-50 px-2 py-1 rounded-lg">{lote.id}</span>
                </td>
                <td className="px-5 py-4">
                  <span className="text-sm text-slate-700 font-medium">{lote.tipoBien}</span>
                </td>
                <td className="px-5 py-4">
                  <span className="text-sm font-semibold text-slate-900">{lote.cantidad.toLocaleString("es-MX")}</span>
                  <span className="ml-1 text-xs text-slate-400">{lote.unidad}</span>
                </td>
                <td className="px-5 py-4">
                  <div className="text-sm text-slate-700 font-medium max-w-[200px] truncate">{lote.nombreComunidad}</div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">{lote.idComunidadDestino}</div>
                </td>
                <td className="px-5 py-4">
                  <BadgeEstado estado={lote.estado} />
                </td>
                <td className="px-5 py-4">
                  <code className="font-mono text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg block max-w-[130px] truncate" title={lote.hash}>
                    {lote.hash.slice(0, 12)}…
                  </code>
                </td>
                <td className="px-5 py-4">
                  <span className="text-sm text-slate-500">
                    {format(new Date(lote.timestamp), "d MMM yyyy", { locale: es })}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 bg-slate-50">
        <span className="text-xs text-slate-400">{lotes.length} lotes registrados</span>
        <span className="text-xs font-mono text-slate-300">SHA-256 · integridad verificada</span>
      </div>
    </div>
  );
}
