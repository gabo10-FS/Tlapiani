"use client";
import { useEffect, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useUiStore } from "@/store/ui.store";

gsap.registerPlugin(useGSAP);

interface ModalProps {
  id: string;
  title: string;
  children: React.ReactNode;
  ancho?: "sm" | "md" | "lg";
}

const anchos = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };

export function Modal({ id, title, children, ancho = "md" }: ModalProps) {
  const { modalAbierto, cerrarModal } = useUiStore();
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef   = useRef<HTMLDivElement>(null);
  const abierto    = modalAbierto === id;

  useGSAP(() => {
    if (!overlayRef.current || !panelRef.current || !abierto) return;
    gsap.fromTo(overlayRef.current,
      { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "power2.out" }
    );
    gsap.fromTo(panelRef.current,
      { opacity: 0, y: 16, scale: 0.98 },
      { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: "power3.out" }
    );
  }, { dependencies: [abierto] });

  useEffect(() => {
    const fn = (e: KeyboardEvent) => e.key === "Escape" && cerrarModal();
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [cerrarModal]);

  if (!abierto) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => e.target === overlayRef.current && cerrarModal()}
    >
      <div
        ref={panelRef}
        className={`w-full ${anchos[ancho]} bg-surface rounded-2xl border border-border shadow-lg overflow-hidden`}
        style={{ willChange: "transform, opacity" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold text-text">{title}</h2>
          <button
            onClick={cerrarModal}
            className="p-1.5 rounded-lg text-dim hover:text-text hover:bg-row transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
