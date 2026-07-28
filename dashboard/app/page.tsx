import { redirect } from "next/navigation";
// Redirigir la raíz al inventario (protegido por middleware)
export default function Home() {
  redirect("/inventario");
}
