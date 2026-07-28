"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { registrarLote } from "../services/inventario.api";
import type { RegistroLotePayload } from "../types/lote.types";

const schema = z.object({
  tipoBien:           z.string().min(1, "Selecciona un tipo"),
  cantidad:           z.coerce.number().positive("Debe ser mayor a 0"),
  unidad:             z.string().min(1, "Requerida"),
  idComunidadDestino: z.string().min(1, "Requerido"),
  nombreComunidad:    z.string().min(1, "Requerida"),
});
type FormData = z.infer<typeof schema>;

const TIPOS = [
  { value: "Alimentos",    label: "Alimentos"    },
  { value: "Medicamentos", label: "Medicamentos" },
  { value: "Agua",         label: "Agua"         },
  { value: "Ropa",         label: "Ropa"         },
  { value: "Herramientas", label: "Herramientas" },
  { value: "Otro",         label: "Otro"         },
];

export function NuevoLoteModal() {
  const qc = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const { mutate, isPending, isSuccess } = useMutation({
    mutationFn: (data: RegistroLotePayload) => registrarLote(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventario"] });
      setTimeout(() => reset(), 1500);
    },
  });

  return (
    <Modal id="nuevo-lote" title="Registrar nuevo lote" ancho="md">
      {isSuccess ? (
        <div className="flex flex-col items-center py-6 text-center gap-3">
          <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div>
            <p className="text-base font-semibold text-text">Lote registrado</p>
            <p className="text-sm text-dim mt-1">El hash SHA-256 fue generado y el lote está activo.</p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit((d) => mutate(d as RegistroLotePayload))} className="flex flex-col gap-4">
          <Select label="Tipo de bien" options={TIPOS} error={errors.tipoBien?.message} {...register("tipoBien")} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Cantidad" type="number" error={errors.cantidad?.message} {...register("cantidad")} />
            <Input label="Unidad" placeholder="kg / L / unidades" error={errors.unidad?.message} {...register("unidad")} />
          </div>
          <Input label="ID comunidad destino" placeholder="COM-OAX-001" error={errors.idComunidadDestino?.message} {...register("idComunidadDestino")} />
          <Input label="Nombre de comunidad" placeholder="San Mateo del Mar" error={errors.nombreComunidad?.message} {...register("nombreComunidad")} />

          <div className="flex items-center gap-2.5 bg-secondary-light rounded-lg px-4 py-3 mt-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0F766E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0-4h.01"/>
            </svg>
            <p className="text-xs text-secondary-dark">El hash SHA-256 se genera automáticamente al registrar el lote.</p>
          </div>

          <Button type="submit" variant="primary" loading={isPending} className="w-full" size="lg">
            Registrar lote
          </Button>
        </form>
      )}
    </Modal>
  );
}
