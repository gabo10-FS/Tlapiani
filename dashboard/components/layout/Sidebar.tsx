"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useAuthStore } from "@/store/auth.store";
import { useUiStore } from "@/store/ui.store";

gsap.registerPlugin(useGSAP);

const NAV = [
  {
    href: "/inventario", label: "Inventario", desc: "Lotes y trazabilidad",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8m-4-4v4M7 8h10M7 12h6"/></svg>,
  },
  {
    href: "/mapa", label: "Mapa de impacto", desc: "Comunidades activas",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>,
  },
  {
    href: "/despacho", label: "Despacho", desc: "QR y salida de lotes",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h.01M17 14h3v3M17 20h.01M20 17h.01M20 20h.01"/></svg>,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { usuario, logout } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar } = useUiStore();
  const sidebarRef = useRef<HTMLElement>(null);

  useGSAP((_, contextSafe) => {
    // Timeline de entrada — sidebar + items en secuencia
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.from(sidebarRef.current, { x: -60, autoAlpha: 0, duration: 0.5, clearProps: "all" })
      .from(".nav-item", {
        x: -16, autoAlpha: 0, stagger: 0.07, duration: 0.35,
        ease: "back.out(1.4)", clearProps: "all",
      }, "<0.15");

    // Hover microinteraction en nav items — contextSafe para que se limpie al desmontar
    const items = sidebarRef.current?.querySelectorAll<HTMLElement>(".nav-item");
    items?.forEach((item) => {
      const icon = item.querySelector("span:first-child");
      const onEnter = contextSafe!(() => {
        if (!item.classList.contains("nav-active")) {
          gsap.to(icon, { x: 3, duration: 0.2, ease: "power2.out" });
        }
      });
      const onLeave = contextSafe!(() => {
        gsap.to(icon, { x: 0, duration: 0.2, ease: "power2.out" });
      });
      item.addEventListener("mouseenter", onEnter);
      item.addEventListener("mouseleave", onLeave);
      return () => {
        item.removeEventListener("mouseenter", onEnter);
        item.removeEventListener("mouseleave", onLeave);
      };
    });
  }, { scope: sidebarRef });

  const initials = usuario?.nombre?.split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase() ?? "??";

  return (
    <aside
      ref={sidebarRef}
      className={[
        "flex h-screen flex-col shrink-0",
        "bg-slate-900 border-r border-slate-800",
        "transition-[width] duration-300 ease-in-out",
        sidebarCollapsed ? "w-16" : "w-60",
      ].join(" ")}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-3 py-4 border-b border-slate-800">
        {!sidebarCollapsed ? (
          <>
            <div className="flex items-center gap-2.5 pl-1">
              <div className="w-8 h-8 bg-sky-500 rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-sky-500/30">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <div>
                <div className="text-sm font-bold text-white">Tlapiani</div>
                <div className="text-[10px] text-slate-500">v1.0 · Operaciones</div>
              </div>
            </div>
            <button onClick={toggleSidebar} className="p-1 rounded-lg text-slate-600 hover:text-white hover:bg-slate-800 transition-colors">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
          </>
        ) : (
          <button onClick={toggleSidebar} className="w-full flex justify-center py-1">
            <div className="w-8 h-8 bg-sky-500 rounded-xl flex items-center justify-center shadow-md shadow-sky-500/30">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {NAV.map((item) => {
          const activo = pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} title={sidebarCollapsed ? item.label : undefined}
              className={[
                "nav-item", activo ? "nav-active" : "",
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-150",
                activo
                  ? "bg-sky-500/15 text-sky-400 border border-sky-500/20"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent",
              ].join(" ")}
            >
              <span className="shrink-0">{item.icon}</span>
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <div className="text-sm font-medium leading-tight">{item.label}</div>
                  {!activo && <div className="text-[10px] text-slate-600 leading-tight mt-0.5">{item.desc}</div>}
                </div>
              )}
            </Link>
          );
        })}

        <div className="mx-1 my-3 border-t border-slate-800" />

        <Link href="/transparencia" title={sidebarCollapsed ? "Transparencia" : undefined}
          className="nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors border border-transparent"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>
          </svg>
          {!sidebarCollapsed && (
            <div>
              <div className="text-sm font-medium">Transparencia</div>
              <div className="text-[10px] text-slate-600 mt-0.5">Portal público</div>
            </div>
          )}
        </Link>
      </nav>

      {/* Usuario */}
      <div className="border-t border-slate-800 p-3">
        {!sidebarCollapsed ? (
          <div className="flex items-center gap-3 px-1">
            <div className="w-8 h-8 rounded-full bg-sky-500/20 border border-sky-500/40 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-sky-400">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-200 truncate">{usuario?.nombre}</div>
              <div className="text-[10px] text-slate-500">{usuario?.rol}</div>
            </div>
            <button onClick={logout} title="Cerrar sesión" className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-slate-800 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-8 h-8 rounded-full bg-sky-500/20 border border-sky-500/40 flex items-center justify-center">
              <span className="text-xs font-bold text-sky-400">{initials}</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
