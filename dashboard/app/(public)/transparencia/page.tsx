import { Suspense } from "react";
import { BuscadorLote } from "@/modules/transparencia/components/BuscadorLote";
import { getRecentePasaportes } from "@/modules/transparencia/services/transparencia.api";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export const metadata = {
  title: "Portal de Transparencia · Tlapiani",
  description: "Consulta pública del estado de lotes de ayuda humanitaria en comunidades de México",
};

const ESTADO_STYLE: Record<string, { dot: string; text: string; bg: string }> = {
  "Creado":                 { dot: "bg-violet-400", text: "text-violet-700", bg: "bg-violet-50" },
  "En Ruta":                { dot: "bg-sky-400",    text: "text-sky-700",    bg: "bg-sky-50"    },
  "Entregado Exitosamente": { dot: "bg-emerald-400",text: "text-emerald-700",bg: "bg-emerald-50"},
  "Alerta de Manipulación": { dot: "bg-red-400",    text: "text-red-700",    bg: "bg-red-50"    },
};

async function ListaRecientes() {
  const recientes = await getRecentePasaportes(10);
  if (!recientes.length) return null;

  return (
    <section>
      <h2 className="text-lg font-bold text-slate-800 mb-4">Últimas entregas registradas</h2>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["ID Lote", "Comunidad destino", "Tipo de bien", "Estado", "Fecha"].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recientes.map((p) => {
                const est = ESTADO_STYLE[p.estadoActual] ?? ESTADO_STYLE["Creado"];
                return (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <a href={`/transparencia/lote/${p.id}`}
                        className="font-mono text-xs font-bold text-sky-600 bg-sky-50 px-2 py-1 rounded-lg hover:bg-sky-100 transition-colors">
                        {p.id}
                      </a>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-sm text-slate-700 font-medium">{p.comunidadDestino}</div>
                      <div className="text-xs text-slate-400">{p.idComunidad ?? ""}</div>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">{p.tipoBien}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${est.bg} ${est.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${est.dot}`} />
                        {p.estadoActual === "Entregado Exitosamente" ? "Entregado" :
                         p.estadoActual === "Alerta de Manipulación" ? "Alerta" : p.estadoActual}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-400">
                      {format(new Date(p.fechaCreacion), "d MMM yyyy", { locale: es })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default function TransparenciaPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-slate-900 text-white">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-sky-500 rounded-xl flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div>
              <div className="font-bold text-base">Tlapiani</div>
              <div className="text-xs text-slate-400">Portal de transparencia · Acceso público</div>
            </div>
          </div>
          <a href="/login" className="text-xs text-slate-400 hover:text-sky-400 transition-colors">
            Acceso administrativo →
          </a>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-800 text-white pb-16 pt-12">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <span className="inline-block text-xs font-semibold text-sky-400 bg-sky-400/10 border border-sky-400/20 px-3 py-1 rounded-full mb-4">
            Transparencia total · SHA-256 verificable
          </span>
          <h1 className="text-3xl font-bold mb-4">Consulta el estado de cualquier lote</h1>
          <p className="text-slate-400 max-w-xl mx-auto text-sm leading-relaxed mb-8">
            Cada lote de ayuda humanitaria tiene un pasaporte digital con hash SHA-256 inmutable.
            Cualquier ciudadano puede verificar su integridad y trazabilidad.
          </p>
          <div className="max-w-xl mx-auto">
            <BuscadorLote />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-5xl mx-auto px-6 -mt-6">
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Lotes verificados",  val: "3",      color: "text-sky-600",    bg: "bg-sky-50"     },
            { label: "Entregas confirmadas",val: "1",     color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Hash SHA-256 únicos", val: "3",     color: "text-violet-600",  bg: "bg-violet-50"  },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} rounded-2xl border border-slate-200 px-5 py-4 text-center shadow-sm`}>
              <div className={`text-2xl font-bold ${s.color}`}>{s.val}</div>
              <div className="text-xs text-slate-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Contenido */}
      <main className="max-w-5xl mx-auto px-6 py-10 space-y-10">
        <Suspense fallback={
          <div className="bg-white rounded-2xl border border-slate-200 h-48 flex items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-sky-500" />
          </div>
        }>
          <ListaRecientes />
        </Suspense>

        {/* Explicación del sistema */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <h2 className="text-lg font-bold text-slate-800 mb-2">¿Cómo funciona la verificación?</h2>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            Cada lote de ayuda genera un hash SHA-256 único e inmutable al ser registrado. Cualquier modificación posterior cambiaría el hash, haciendo visible cualquier intento de manipulación.
          </p>
          <div className="grid grid-cols-3 gap-6">
            {[
              { n: "01", title: "Registro con hash", desc: "Al crear un lote se genera un SHA-256 del contenido, timestamp y destino." },
              { n: "02", title: "Tránsito verificado", desc: "Cada evento de la cadena de custodia se registra con su propio bloque de hash." },
              { n: "03", title: "Entrega confirmada", desc: "El QR del lote es escaneado al entregar, sellando la cadena con confirmación GPS." },
            ].map((step) => (
              <div key={step.n} className="flex flex-col gap-3">
                <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-xs font-bold text-sky-600">
                  {step.n}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">{step.title}</p>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 mt-8 py-6 text-center bg-white">
        <p className="text-xs text-slate-400">
          Tlapiani · Sistema de auditoría descentralizada · Acceso público · Datos: CONAPO / CONEVAL
        </p>
      </footer>
    </div>
  );
}
