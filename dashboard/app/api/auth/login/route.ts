import { NextRequest, NextResponse } from "next/server";
import { setSession } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  // TODO: reemplazar con validación real contra FastAPI
  // const res = await apiClient.post("/auth/token", { email, password })
  const USUARIOS_DEV = [
    { email: "rubenguzman647@gmail.com", password: "admin123", nombre: "Ruben Guzmán",   rol: "Administrador", id: "USR-001" },
    { email: "admin@tlapiani.mx",        password: "admin123", nombre: "Admin Tlapiani",  rol: "Administrador", id: "USR-002" },
    { email: "transportista@tlapiani.mx",password: "pass123",  nombre: "Carlos Mendoza",  rol: "Transportista", id: "USR-003" },
  ];

  const usuario = USUARIOS_DEV.find(
    (u) => u.email === email && u.password === password
  );

  if (!usuario) {
    return NextResponse.json(
      { error: "Correo o contraseña incorrectos" },
      { status: 401 }
    );
  }

  // Setear cookie httpOnly con la sesión cifrada
  await setSession({
    accessToken:  "dev-access-token-" + usuario.id,
    refreshToken: "dev-refresh-token-" + usuario.id,
    userId: usuario.id,
    rol:    usuario.rol,
  });

  return NextResponse.json({
    id:     usuario.id,
    nombre: usuario.nombre,
    email:  usuario.email,
    rol:    usuario.rol,
  });
}
