"use client";
import { useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

gsap.registerPlugin(useGSAP);

const schema = z.object({
  email:    z.string().email("Ingresa un correo válido"),
  password: z.string().min(1, "La contraseña es requerida"),
});
type FormData = z.infer<typeof schema>;

const STATS = [
  { target: 12400, suffix: "+", label: "Familias beneficiadas", color: "text-sky-400" },
  { target: 98.3,  suffix: "%", label: "Entregas verificadas",  color: "text-emerald-400", decimal: true },
  { target: 32,    suffix: "",  label: "Comunidades activas",   color: "text-violet-400" },
];

export default function LoginPage() {
  const router = useRouter();
  const { setUsuario } = useAuthStore();
  const pageRef  = useRef<HTMLDivElement>(null);
  const counterRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useGSAP(() => {
    // Timeline principal con defaults compartidos
    const tl = gsap.timeline({ defaults: { ease: "power3.out", clearProps: "all" } });

    tl.from(".login-panel", {
        autoAlpha: 0, x: -40, duration: 0.7,
      })
      .from(".login-logo", { autoAlpha: 0, y: -16, duration: 0.4 }, "<0.15")
      .from(".login-headline", { autoAlpha: 0, y: 24, duration: 0.55 }, "<0.1")
      .from(".login-stat", {
        autoAlpha: 0, x: -16, stagger: 0.1, duration: 0.4,
      }, "<0.2")
      .from(".login-form-side", { autoAlpha: 0, x: 30, duration: 0.6 }, "<0.3")
      .from(".login-field", {
        autoAlpha: 0, y: 12, stagger: 0.08, duration: 0.35, ease: "power2.out",
      }, "<0.15");

    // Contadores numéricos — animación de objetos, no del DOM directamente
    counterRefs.current.forEach((el, i) => {
      if (!el) return;
      const stat = STATS[i];
      const obj = { val: 0 };
      gsap.to(obj, {
        val: stat.target,
        duration: 1.6,
        delay: 0.6 + i * 0.1,
        ease: "power2.out",
        onUpdate() {
          if (!el) return;
          const v = stat.decimal
            ? obj.val.toFixed(1)
            : Math.round(obj.val).toLocaleString("es-MX");
          el.textContent = v + stat.suffix;
        },
      });
    });
  }, { scope: pageRef });

  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    const res = await fetch("/api/auth/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError("password", { message: body.error ?? "Credenciales incorrectas" });
      return;
    }
    setUsuario(await res.json());
    router.push("/inventario");
  };

  return (
    <div ref={pageRef} className="min-h-screen bg-slate-950 flex">
      {/* Panel izquierdo */}
      <div className="login-panel hidden lg:flex flex-col justify-between w-[460px] shrink-0 bg-gradient-to-b from-slate-900 to-slate-950 border-r border-slate-800 px-10 py-12">
        <div>
          <div className="login-logo flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-sky-500 rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/30">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div>
              <div className="text-white font-bold text-xl tracking-tight">Tlapiani</div>
              <div className="text-slate-500 text-xs">Sistema de ayuda humanitaria</div>
            </div>
          </div>

          <div className="login-headline mb-10">
            <h1 className="text-4xl font-bold text-white leading-tight tracking-tight">
              Cada entrega<br />
              <span className="text-sky-400">cuenta una</span><br />
              historia
            </h1>
            <p className="mt-4 text-slate-400 text-sm leading-relaxed max-w-xs">
              Trazabilidad completa y transparencia real para la distribución de ayuda en comunidades de México.
            </p>
          </div>

          <div className="space-y-3">
            {STATS.map((stat, i) => (
              <div key={i} className="login-stat flex items-center gap-4 p-4 bg-slate-800/60 rounded-2xl border border-slate-700/50">
                <span
                  ref={(el) => { counterRefs.current[i] = el; }}
                  className={`text-2xl font-bold tabular-nums ${stat.color}`}
                >
                  0{stat.suffix}
                </span>
                <span className="text-sm text-slate-400">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-600 border-t border-slate-800 pt-5 mt-8">
          Datos auditables con hash SHA-256 · Integridad verificable por cualquier ciudadano
        </p>
      </div>

      {/* Lado derecho — formulario */}
      <div className="login-form-side flex-1 flex flex-col items-center justify-center px-6 py-12 bg-slate-900">
        {/* Logo mobile */}
        <div className="login-logo lg:hidden flex items-center gap-2 mb-10">
          <div className="w-8 h-8 bg-sky-500 rounded-xl flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span className="font-bold text-lg text-white">Tlapiani</span>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white">Bienvenido de vuelta</h2>
            <p className="mt-1.5 text-sm text-slate-400">Accede al panel de operaciones.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="login-field">
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Correo electrónico</label>
              <input
                type="email" autoComplete="email" placeholder="nombre@tlapiani.mx"
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500/60 transition-all"
                {...register("email")}
              />
              {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
            </div>
            <div className="login-field">
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Contraseña</label>
              <input
                type="password" autoComplete="current-password"
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500/60 transition-all"
                {...register("password")}
              />
              {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>}
            </div>
            <div className="login-field pt-1">
              <button
                type="submit" disabled={isSubmitting}
                className="w-full bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-semibold rounded-xl px-4 py-3 text-sm transition-all duration-150 active:scale-[0.98] shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2"
              >
                {isSubmitting && (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                )}
                Iniciar sesión
              </button>
            </div>
          </form>

          <div className="mt-7 p-4 bg-slate-800/60 rounded-2xl border border-slate-700/50">
            <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Dev credentials</p>
            <div className="space-y-1 font-mono text-xs">
              <div className="flex gap-2"><span className="text-sky-400">rubenguzman647@gmail.com</span><span className="text-slate-600">/ admin123</span></div>
              <div className="flex gap-2"><span className="text-sky-400">admin@tlapiani.mx</span><span className="text-slate-600">/ admin123</span></div>
            </div>
          </div>

          <div className="mt-5 text-center">
            <a href="/transparencia" className="text-sm text-slate-500 hover:text-sky-400 transition-colors">
              Ver portal público de transparencia →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
