"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { AuthGuard } from "@/lib/auth/guards";
import { useAuthStore } from "@/store/auth.store";

function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(() => new QueryClient({
    defaultOptions: { queries: { retry: 2, staleTime: 30_000 } },
  }));
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

function AdminShell({ children }: { children: React.ReactNode }) {
  const { setUsuario } = useAuthStore();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.ok ? r.json() : null)
      .then((u) => u && setUsuario(u))
      .catch(() => {});
  }, [setUsuario]);

  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-bg">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          <Header />
          <main className="flex-1 overflow-y-auto p-4 bg-bg">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <AdminShell>{children}</AdminShell>
    </Providers>
  );
}
