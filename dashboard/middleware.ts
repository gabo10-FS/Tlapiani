
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SESSION_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? "dev-secret-change-in-production-32chars"
);

// Rutas que requieren autenticación
const RUTAS_ADMIN = /^\/(inventario|mapa|despacho)(\/.*)?$/;

export async function middleware(req: NextRequest) {
  if (RUTAS_ADMIN.test(req.nextUrl.pathname)) {
    const cookie = req.cookies.get("tlapiani_session");

    if (!cookie) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    try {
      await jwtVerify(cookie.value, SESSION_SECRET);
    } catch {
      // Token expirado o inválido
      const res = NextResponse.redirect(new URL("/login", req.url));
      res.cookies.delete("tlapiani_session");
      return res;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/(inventario|mapa|despacho)(.*)",
    // Excluir archivos estáticos
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
