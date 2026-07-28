"use client";
// RF-2.3 — QR Viewer · estilo consola de auditoría
// GSAP: entrada scale+opacity del QR

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/Button";
import type { QRData } from "../types/despacho.types";

gsap.registerPlugin(useGSAP);

export function QRViewer({ qrData, nombreComunidad }: { qrData: QRData; nombreComunidad?: string }) {
  const ref   = useRef<HTMLDivElement>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.from(ref.current,  { opacity: 0, y: 10, duration: 0.3, ease: "power2.out" });
    gsap.from(qrRef.current,{ opacity: 0, scale: 0.88, duration: 0.4, ease: "power2.out", delay: 0.1 });
  }, { scope: ref });

  const qrValue = JSON.stringify(qrData);

  const handleImprimir = () => {
    const svg = ref.current?.querySelector("svg");
    if (!svg) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>QR · ${qrData.idLote}</title>
    <style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#fff;font-family:monospace}</style>
    </head><body>
    <p style="font-size:11px;color:#666;letter-spacing:.1em">TLAPIANI · PASAPORTE DIGITAL</p>
    <p style="font-size:12px;color:#000;letter-spacing:.05em">${qrData.idLote} · ${qrData.comunidadDestino}</p>
    ${svg.outerHTML}
    <p style="font-size:9px;color:#999;margin-top:8px;word-break:break-all;max-width:300px;text-align:center">${qrData.hash}</p>
    </body></html>`);
    w.document.close(); w.print();
  };

  return (
    <div ref={ref} className="border border-border bg-panel p-4 flex flex-col gap-3"
      style={{ willChange: "transform, opacity" }}>
      <div className="border-b border-border pb-2">
        <div className="text-2xs text-dim tracking-widest">QR · PASAPORTE DIGITAL · RF-2.3</div>
        <div className="text-xs text-accent mt-0.5 font-mono">{qrData.idLote}</div>
        <div className="text-2xs text-dim">{nombreComunidad ?? qrData.comunidadDestino}</div>
      </div>

      <div ref={qrRef} className="flex justify-center bg-white p-3" style={{ willChange: "transform, opacity" }}>
        <QRCodeSVG value={qrValue} size={160} bgColor="#ffffff" fgColor="#030303" level="H" />
      </div>

      <div className="border border-border bg-surface p-2">
        <div className="text-2xs text-dim tracking-widest mb-1">HASH SHA-256 · RF-1.2</div>
        <code className="break-all font-mono text-2xs text-accent leading-relaxed">{qrData.hash}</code>
      </div>

      <Button variant="ghost" size="sm" className="w-full" onClick={handleImprimir}>
        IMPRIMIR / EXPORTAR QR
      </Button>
    </div>
  );
}
