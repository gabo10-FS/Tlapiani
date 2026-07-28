import { MapaPrioridad } from "@/modules/mapa/components/MapaPrioridad";

export const metadata = { title: "Mapa de impacto · Tlapiani" };

export default function MapaPage() {
  return (
    <div className="flex flex-col h-full gap-4 p-1">
      <div>
        <h1 className="text-2xl font-bold text-text">Mapa de impacto</h1>
        <p className="mt-1 text-sm text-dim">
          Comunidades activas por nivel de urgencia. Datos CONAPO / CONEVAL.
        </p>
      </div>
      <div className="flex-1 rounded-xl overflow-hidden border border-border shadow-card" style={{ minHeight: "560px" }}>
        <MapaPrioridad />
      </div>
    </div>
  );
}
