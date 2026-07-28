"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function BuscadorLote() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  const buscar = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) { setError("Ingresa un ID de lote o hash SHA-256"); return; }
    const esHash = /^[0-9a-f]{64}$/i.test(q);
    const esId   = /^LOT-/i.test(q);
    if (!esHash && !esId) { setError("Formato inválido — usa LOT-... o el hash SHA-256 de 64 caracteres"); return; }
    setError("");
    router.push(`/transparencia/lote/${encodeURIComponent(q)}`);
  };

  return (
    <form onSubmit={buscar} className="flex flex-col gap-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setError(""); }}
          placeholder="LOT-20240115-001  o  hash SHA-256 (64 chars)"
          className="flex-1 bg-white/10 border border-white/20 text-white rounded-xl px-4 py-3 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400/50 focus:border-sky-400/50 transition-all"
        />
        <button
          type="submit"
          className="bg-sky-500 hover:bg-sky-400 text-white font-semibold rounded-xl px-5 py-3 text-sm transition-all active:scale-[0.98] shrink-0"
        >
          Consultar
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <p className="text-xs text-slate-500 text-left">
        Ejemplos: <span className="text-slate-400 font-mono">LOT-20240115-001</span> · <span className="text-slate-400 font-mono">a3f8d2c1…(64 hex)</span>
      </p>
    </form>
  );
}
