"use client";
import { useUiStore } from "@/store/ui.store";
import { InventarioTable } from "@/modules/inventario/components/InventarioTable";
import { FiltrosBar } from "@/modules/inventario/components/FiltrosBar";
import { NuevoLoteModal } from "@/modules/inventario/components/NuevoLoteModal";

export default function ClientInventario() {
  const { abrirModal } = useUiStore();
  return (
    <>
      <FiltrosBar onNuevoLote={() => abrirModal("nuevo-lote")} />
      <div className="mt-3">
        <InventarioTable />
      </div>
      <NuevoLoteModal />
    </>
  );
}
