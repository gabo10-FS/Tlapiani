interface EmptyStateProps {
  titulo: string;
  descripcion?: string;
  accion?: React.ReactNode;
  icono?: React.ReactNode;
}

export function EmptyState({ titulo, descripcion, accion, icono }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-primary-light flex items-center justify-center mb-4">
        {icono ?? (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
          </svg>
        )}
      </div>
      <h3 className="text-base font-semibold text-text">{titulo}</h3>
      {descripcion && (
        <p className="mt-1.5 text-sm text-dim max-w-xs leading-relaxed">{descripcion}</p>
      )}
      {accion && <div className="mt-5">{accion}</div>}
    </div>
  );
}
