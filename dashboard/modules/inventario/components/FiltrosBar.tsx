"use client";
import { useInventarioStore } from "@/store/inventario.store";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

const ESTADOS = [
  { value: "Todos",                   label: "Todos los estados" },
  { value: "Creado",                  label: "Creado" },
  { value: "En Ruta",                 label: "En ruta" },
  { value: "Entregado Exitosamente",  label: "Entregado" },
  { value: "Alerta de Manipulación",  label: "Alerta de manipulación" },
];

const TIPOS = [
  { value: "Todos",        label: "Todos los tipos" },
  { value: "Alimentos",    label: "Alimentos" },
  { value: "Medicamentos", label: "Medicamentos" },
  { value: "Agua",         label: "Agua" },
  { value: "Ropa",         label: "Ropa" },
  { value: "Herramientas", label: "Herramientas" },
  { value: "Otro",         label: "Otro" },
];

export function FiltrosBar({ onNuevoLote }: { onNuevoLote: () => void }) {
  const { filtros, setFiltros, resetFiltros } = useInventarioStore();

  return (
    <div className="flex flex-wrap items-end gap-3 bg-surface rounded-xl border border-border px-4 py-3.5 shadow-card">
      <div className="flex-1 min-w-52">
        <Input
          placeholder="Buscar por ID, comunidad o hash..."
          value={filtros.busqueda ?? ""}
          onChange={(e) => setFiltros({ busqueda: e.target.value })}
        />
      </div>
      <div className="w-48">
        <Select
          options={ESTADOS}
          value={filtros.estado ?? "Todos"}
          onChange={(e) => setFiltros({ estado: e.target.value as typeof filtros.estado })}
        />
      </div>
      <div className="w-44">
        <Select
          options={TIPOS}
          value={filtros.tipoBien ?? "Todos"}
          onChange={(e) => setFiltros({ tipoBien: e.target.value as typeof filtros.tipoBien })}
        />
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" size="md" onClick={resetFiltros}>
          Limpiar
        </Button>
        <Button variant="primary" size="md" onClick={onNuevoLote}>
          + Nuevo lote
        </Button>
      </div>
    </div>
  );
}
