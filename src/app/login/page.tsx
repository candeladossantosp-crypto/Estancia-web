import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[var(--background)]">
      <div className="w-full max-w-md rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-sm p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-[var(--primary)] tracking-tight">
            Estancia
          </h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            Gestión ganadera segura para tu empresa
          </p>
        </div>
        <LoginForm />
        <p className="text-center text-sm text-[var(--muted)] mt-6">
          ¿Primera vez?{" "}
          <Link
            href="/register"
            className="text-[var(--primary)] font-medium hover:underline"
          >
            Crear cuenta
          </Link>
        </p>
      </div>
    </div>
  );
}
