import { Suspense } from "react";
import ClientInventario from "./ClientInventario";
import { TableSkeleton } from "@/components/feedback/LoadingSkeleton";

export const metadata = { title: "Inventario · Tlapiani" };

export default function InventarioPage() {
  return (
    <div className="flex flex-col gap-5 p-1">
      {/* Encabezado de página */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Inventario de ayuda</h1>
          <p className="mt-1 text-sm text-dim">
            Gestiona y rastrea todos los lotes con trazabilidad completa y hash SHA-256.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-secondary-light rounded-lg border border-secondary/20">
          <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
          <span className="text-xs font-medium text-secondary-dark">Datos en tiempo real</span>
        </div>
      </div>

      <Suspense fallback={<TableSkeleton filas={6} />}>
        <ClientInventario />
      </Suspense>
    </div>
  );
}
