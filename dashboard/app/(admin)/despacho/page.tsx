import { DespachoForm } from "@/modules/despacho/components/DespachoForm";

export const metadata = { title: "Despacho · Tlapiani" };

export default function DespachoPage() {
  return (
    <div className="flex flex-col gap-5 p-1">
      <div>
        <h1 className="text-2xl font-bold text-text">Despacho de lotes</h1>
        <p className="mt-1 text-sm text-dim">
          Genera el QR de trazabilidad y registra la salida de cada lote con hash SHA-256.
        </p>
      </div>
      <DespachoForm />
    </div>
  );
}
