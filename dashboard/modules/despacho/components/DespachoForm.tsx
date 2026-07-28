"use client";
import { useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { QRViewer } from "./QRViewer";
import { EstadoTracker } from "./EstadoTracker";
import { useMutation } from "@tanstack/react-query";
import { crearDespacho } from "../services/despacho.api";
import type { DespachoPayload } from "../types/despacho.types";

gsap.registerPlugin(useGSAP);

const schema = z.object({
  idLote:          z.string().min(1, "Requerido"),
  idComunidad:     z.string().min(1, "Requerido"),
  nombreComunidad: z.string().min(1, "Requerido"),
  operador:        z.string().min(1, "Requerido"),
  notas:           z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export function DespachoForm() {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.from(".despacho-field", {
      opacity: 0, y: 10, stagger: 0.07, duration: 0.4, ease: "power2.out",
    });
  }, { scope: ref });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const { mutate, data: resultado, isPending, isSuccess, isError } = useMutation({
    mutationFn: (data: DespachoPayload) => crearDespacho(data),
  });

  const onSubmit = (data: FormData) => {
    mutate(data);
  };

  return (
    <div ref={ref} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Formulario */}
      <div className="bg-surface rounded-xl border border-border shadow-card p-6">
        <div className="mb-6">
          <h2 className="text-base font-semibold text-text">Datos del despacho</h2>
          <p className="text-sm text-dim mt-1">Completa la información para generar el QR de trazabilidad.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="despacho-field" style={{ willChange: "transform, opacity" }}>
            <Input label="ID del lote" placeholder="LOT-20240115-001" error={errors.idLote?.message} {...register("idLote")} />
          </div>
          <div className="despacho-field" style={{ willChange: "transform, opacity" }}>
            <Input label="ID de comunidad" placeholder="COM-OAX-001" error={errors.idComunidad?.message} {...register("idComunidad")} />
          </div>
          <div className="despacho-field" style={{ willChange: "transform, opacity" }}>
            <Input label="Nombre de comunidad" placeholder="San Mateo del Mar" error={errors.nombreComunidad?.message} {...register("nombreComunidad")} />
          </div>
          <div className="despacho-field" style={{ willChange: "transform, opacity" }}>
            <Input label="Operador responsable" placeholder="Nombre completo" error={errors.operador?.message} {...register("operador")} />
          </div>
          <div className="despacho-field" style={{ willChange: "transform, opacity" }}>
            <Input label="Notas (opcional)" placeholder="Observaciones del despacho..." {...register("notas")} />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" variant="primary" loading={isPending} className="flex-1" size="lg">
              Generar despacho y QR
            </Button>
            <Button type="button" variant="ghost" onClick={() => reset()} size="lg">
              Limpiar
            </Button>
          </div>
        </form>

        {isError && (
          <div className="mt-4 rounded-lg border border-critica/30 bg-red-50 px-4 py-3">
            <div className="text-sm text-critica font-medium">No se pudo crear el despacho</div>
            <div className="text-xs text-critica/70 mt-0.5">Intenta de nuevo o verifica la conexión.</div>
          </div>
        )}
      </div>

      {/* Panel QR + estado */}
      <div className="flex flex-col gap-4">
        {isSuccess && resultado ? (
          <>
            <QRViewer qrData={resultado.qrData} nombreComunidad={resultado.nombreComunidad} />
            <div className="bg-surface rounded-xl border border-border shadow-card p-5">
              <h3 className="text-sm font-semibold text-text mb-3">Estado del despacho</h3>
              <EstadoTracker estado={resultado.estado} />
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center bg-surface rounded-xl border border-border border-dashed p-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary-light flex items-center justify-center mb-4">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
                <path d="M14 14h.01M17 14h.01M20 14h.01M20 17h.01M17 17h3v3M14 17h.01M14 20h.01"/>
              </svg>
            </div>
            <p className="text-sm font-medium text-dim">El QR aparecerá aquí</p>
            <p className="text-xs text-mute mt-1.5 max-w-xs leading-relaxed">
              Completa el formulario y genera el despacho para obtener el código QR con hash SHA-256.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
