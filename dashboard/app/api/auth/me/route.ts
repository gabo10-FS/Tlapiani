import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No session" }, { status: 401 });

  // En producción: validar token con FastAPI y retornar datos del usuario
  return NextResponse.json({
    id:     session.userId,
    rol:    session.rol,
    nombre: session.userId === "USR-001" ? "Ruben Guzmán" : "Admin Tlapiani",
    email:  session.userId === "USR-001" ? "rubenguzman647@gmail.com" : "admin@tlapiani.mx",
  });
}
