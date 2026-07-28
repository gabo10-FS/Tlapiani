"use client";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { QRCodeSVG } from "qrcode.react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AuditoriaTimeline } from "./AuditoriaTimeline";
import { BadgeEstado, BadgeUrgencia } from "@/components/ui/Badge";
import type { PasaporteDigital as TPasaporte } from "../types/auditoria.types";

gsap.registerPlugin(useGSAP);

const HEX_CHARS = "0123456789abcdef";

export function PasaporteDigital({ pasaporte }: { pasaporte: TPasaporte }) {
  const ref    = useRef<HTMLDivElement>(null);
  const hashEl = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.from(".pasaporte-block", {
      autoAlpha: 0, y: 20, stagger: 0.1, duration: 0.5, clearProps: "all",
    });
  }, { scope: ref });

  useGSAP(() => {
    if (!hashEl.current) return;
    const el   = hashEl.current;
    const hash = pasaporte.hash;
    const tween = gsap.to({}, {
      duration: 2.2, ease: "power2.out",
      onUpdate() {
        const resolved = Math.floor(this.progress() * hash.length);
        let html = "";
        for (let i = 0; i < hash.length; i++) {
          html += i < resolved
            ? `<span style="color:#0EA5E9">${hash[i]}</span>`
            : `<span style="color:#CBD5E1">${HEX_CHARS[Math.floor(Math.random() * 16)]}</span>`;
        }
        el.innerHTML = html;
      },
      onComplete() { el.innerHTML = `<span style="color:#0EA5E9">${hash}</span>`; },
    });
    return () => tween.kill();
  }, { scope: ref, dependencies: [pasaporte.id] });

  const qrValue = JSON.stringify({
    idLote: pasaporte.id, hash: pasaporte.hash,
    comunidadDestino: pasaporte.comunidadDestino,
    timestamp: pasaporte.fechaCreacion,
  });

  return (
    <div ref={ref} className="flex flex-col gap-5">

      {/* Header del pasaporte */}
      <div className="pasaporte-block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-5 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-400 mb-1">Pasaporte digital · verificable</p>
              <h1 className="text-xl font-bold text-sky-400">{pasaporte.id}</h1>
              <p className="text-slate-300 mt-1">{pasaporte.tipoBien} · {pasaporte.comunidadDestino}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <BadgeEstado estado={pasaporte.estadoActual} />
              <BadgeUrgencia nivel={pasaporte.nivelUrgencia} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 divide-x divide-slate-100">
          {[
            { label: "Cantidad",  val: `${pasaporte.cantidad.toLocaleString("es-MX")} ${pasaporte.unidad}` },
            { label: "Registrado", val: format(new Date(pasaporte.fechaCreacion), "d MMM yyyy", { locale: es }) },
            { label: "Operador",  val: pasaporte.operador ?? "—" },
            { label: "Eventos",   val: String(pasaporte.timeline?.length ?? "—") },
          ].map((m) => (
            <div key={m.label} className="px-5 py-3.5">
              <p className="text-xs text-slate-400 font-medium">{m.label}</p>
              <p className="text-sm font-semibold text-slate-700 mt-0.5">{m.val}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Hash SHA-256 */}
      <div className="pasaporte-block bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-700">Hash SHA-256</h2>
            <p className="text-xs text-slate-400 mt-0.5">Inmutable · generado al registrar el lote</p>
          </div>
          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
            ✓ Verificado
          </span>
        </div>
        <div ref={hashEl} className="hash-terminal bg-slate-50 rounded-xl p-4 leading-loose" />
      </div>

      {/* QR + Stats */}
      <div className="pasaporte-block grid grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-sm font-bold text-slate-700 mb-4">Código QR de verificación</h2>
          <div className="flex justify-center bg-white p-4 rounded-xl border border-slate-100">
            <QRCodeSVG value={qrValue} size={150} bgColor="#ffffff" fgColor="#0F172A" level="H" />
          </div>
          <p className="text-xs text-slate-400 text-center mt-3">Escanea para verificar en cualquier dispositivo</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col">
          <h2 className="text-sm font-bold text-slate-700 mb-4">Cadena de custodia</h2>
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="text-5xl font-bold text-sky-600">{pasaporte.timeline?.length ?? 0}</div>
            <p className="text-sm text-slate-400 mt-2">eventos registrados</p>
          </div>
          <div className="border-t border-slate-100 pt-4 mt-4 space-y-1">
            <p className="text-xs text-slate-400">Fuente: CONAPO / CONEVAL · CENAPRED</p>
            <p className="text-xs text-slate-400">
              Verificado: {format(new Date(), "d MMM yyyy HH:mm", { locale: es })}
            </p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      {pasaporte.timeline && pasaporte.timeline.length > 0 && (
        <div className="pasaporte-block">
          <AuditoriaTimeline eventos={pasaporte.timeline} />
        </div>
      )}
    </div>
  );
}
