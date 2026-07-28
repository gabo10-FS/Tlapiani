export function TableSkeleton({ filas = 5 }: { filas?: number }) {
  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-card">
      <div className="border-b border-border px-5 py-3.5 flex gap-3">
        <div className="h-3.5 w-32 animate-pulse bg-row rounded" />
        <div className="h-3.5 w-20 animate-pulse bg-row rounded" />
      </div>
      {Array.from({ length: filas }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-border/60 px-5 py-3.5">
          {[80, 120, 60, 140, 80, 100, 70].map((w, j) => (
            <div key={j} className="h-3 animate-pulse bg-row rounded" style={{ width: w }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="animate-pulse impact-card p-5">
      <div className="mb-2 h-3 w-20 bg-row rounded" />
      <div className="h-8 w-16 bg-row rounded mt-2" />
    </div>
  );
}

export function MapSkeleton() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-panel rounded-xl border border-border">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          </svg>
        </div>
        <p className="text-sm text-dim">Cargando mapa...</p>
      </div>
    </div>
  );
}
