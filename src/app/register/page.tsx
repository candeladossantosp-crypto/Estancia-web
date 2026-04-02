import Link from "next/link";
import { RegisterForm } from "@/components/RegisterForm";

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[var(--background)]">
      <div className="w-full max-w-md rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-sm p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-[var(--primary)] tracking-tight">
            Nueva empresa
          </h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            Cada registro crea un espacio privado para tu estancia
          </p>
        </div>
        <RegisterForm />
        <p className="text-center text-sm text-[var(--muted)] mt-6">
          <Link href="/login" className="text-[var(--primary)] font-medium hover:underline">
            Volver al inicio de sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
