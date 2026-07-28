import { notFound } from "next/navigation";
import { getPasaporteById } from "@/modules/transparencia/services/transparencia.api";
import { PasaporteDigital } from "@/modules/transparencia/components/PasaporteDigital";

export const metadata = { title: "Pasaporte Digital · Tlapiani" };

interface Props { params: { id: string } }

export default async function PasaportePage({ params }: Props) {
  const pasaporte = await getPasaporteById(decodeURIComponent(params.id));
  if (!pasaporte) notFound();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-sky-500 rounded-xl flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div>
              <div className="font-bold">Tlapiani</div>
              <div className="text-xs text-slate-400">Pasaporte digital · {pasaporte.id}</div>
            </div>
          </div>
          <a href="/transparencia" className="text-sm text-slate-400 hover:text-sky-400 transition-colors flex items-center gap-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5m7-7-7 7 7 7"/>
            </svg>
            Portal público
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <PasaporteDigital pasaporte={pasaporte} />
      </main>
    </div>
  );
}
