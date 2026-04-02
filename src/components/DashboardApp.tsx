"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Me = {
  email: string;
  companyName: string;
};

type EmployeeRow = {
  id: string;
  fullName: string;
  monthlySalaryFormatted: string;
  advanceFormatted: string;
  netToPayFormatted: string;
};

type AnimalRow = {
  id: string;
  caravan: string;
  characteristics: string;
  purchasePrice: number | null;
  purchaseDate: string | null;
  latestWeight: number | null;
  latestWeightDate: string | null;
  weightObjectiveLabel: string;
  weightObjectiveMet: boolean | null;
  foodCostAccruedFormatted: string | null;
  totalSpentToDateFormatted: string | null;
  weights: { id: string; date: string; weightKg: number }[];
};

type CommandLog = {
  id: string;
  rawText: string;
  result: string;
  success: boolean;
  createdAt: string;
};

type Tab = "staff" | "animals" | "assistant";

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function DashboardApp() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [tab, setTab] = useState<Tab>("staff");
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [animals, setAnimals] = useState<AnimalRow[]>([]);
  const [logs, setLogs] = useState<CommandLog[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [empName, setEmpName] = useState("");
  const [empSalary, setEmpSalary] = useState("");

  const [anCaravan, setAnCaravan] = useState("");
  const [anChars, setAnChars] = useState("");
  const [anPrice, setAnPrice] = useState("");
  const [anDate, setAnDate] = useState("");

  const [wAnimal, setWAnimal] = useState("");
  const [wKg, setWKg] = useState("");
  const [wDate, setWDate] = useState("");

  const [cmdText, setCmdText] = useState("");
  const [cmdMsg, setCmdMsg] = useState<string | null>(null);
  const [cmdOk, setCmdOk] = useState<boolean | null>(null);
  const [cmdBusy, setCmdBusy] = useState(false);

  const refreshAll = useCallback(async () => {
    setLoadError(null);
    const [meRes, eRes, aRes, lRes] = await Promise.all([
      fetch("/api/auth/me"),
      fetch("/api/employees"),
      fetch("/api/animals"),
      fetch("/api/commands"),
    ]);
    if (meRes.status === 401) {
      router.push("/login");
      return;
    }
    const meData = await meRes.json();
    setMe({
      email: meData.user.email,
      companyName: meData.user.companyName,
    });
    if (!eRes.ok || !aRes.ok) {
      setLoadError("No se pudieron cargar los datos");
      return;
    }
    const ej = await eRes.json();
    const aj = await aRes.json();
    setEmployees(ej.employees);
    setAnimals(aj.animals);
    if (lRes.ok) {
      const lj = await lRes.json();
      setLogs(lj.logs);
    }
  }, [router]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function addEmployee(e: React.FormEvent) {
    e.preventDefault();
    const salary = Number(empSalary.replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(salary) || salary <= 0) return;
    const res = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName: empName.trim(), monthlySalary: salary }),
    });
    if (res.ok) {
      setEmpName("");
      setEmpSalary("");
      refreshAll();
    }
  }

  async function removeEmployee(id: string) {
    if (!confirm("¿Eliminar este empleado?")) return;
    await fetch(`/api/employees/${id}`, { method: "DELETE" });
    refreshAll();
  }

  async function addAnimal(e: React.FormEvent) {
    e.preventDefault();
    const price =
      anPrice.trim() === ""
        ? null
        : Number(anPrice.replace(/\./g, "").replace(",", "."));
    const res = await fetch("/api/animals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caravan: anCaravan.trim(),
        characteristics: anChars.trim(),
        purchasePrice: price != null && Number.isFinite(price) ? price : null,
        purchaseDate: anDate || null,
      }),
    });
    if (res.ok) {
      setAnCaravan("");
      setAnChars("");
      setAnPrice("");
      setAnDate("");
      refreshAll();
    } else {
      const j = await res.json().catch(() => ({}));
      alert(j.error ?? "Error al crear animal");
    }
  }

  async function addWeight(e: React.FormEvent) {
    e.preventDefault();
    if (!wAnimal) return;
    const kg = Number(wKg.replace(",", "."));
    if (!Number.isFinite(kg) || kg <= 0) return;
    const res = await fetch(`/api/animals/${wAnimal}/weights`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        weightKg: kg,
        date: wDate ? `${wDate}T12:00:00` : undefined,
      }),
    });
    if (res.ok) {
      setWKg("");
      setWDate("");
      refreshAll();
    }
  }

  async function removeAnimal(id: string) {
    if (!confirm("¿Eliminar este animal y todos sus pesajes?")) return;
    await fetch(`/api/animals/${id}`, { method: "DELETE" });
    refreshAll();
  }

  async function sendCommand(e: React.FormEvent) {
    e.preventDefault();
    if (!cmdText.trim()) return;
    setCmdBusy(true);
    setCmdMsg(null);
    try {
      const res = await fetch("/api/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: cmdText.trim() }),
      });
      const data = await res.json();
      setCmdMsg(data.message ?? "");
      setCmdOk(data.success === true);
      setCmdText("");
      refreshAll();
    } finally {
      setCmdBusy(false);
    }
  }

  if (!me) {
    return (
      <div className="p-8 text-center text-[var(--muted)]">Cargando…</div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "staff", label: "Manejo de personal" },
    { id: "animals", label: "Manejo de animales" },
    { id: "assistant", label: "Asistente de carga" },
  ];

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--border)] bg-[var(--card)] sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-[var(--primary)]">
              {me.companyName}
            </h1>
            <p className="text-xs text-[var(--muted)]">{me.email}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="text-sm px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-stone-50"
          >
            Cerrar sesión
          </button>
        </div>
        <nav className="max-w-6xl mx-auto px-4 flex gap-1 pb-0 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${
                tab === t.id
                  ? "border-[var(--primary)] text-[var(--primary)] bg-stone-50/80"
                  : "border-transparent text-[var(--muted)] hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {loadError && (
          <p className="mb-4 text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">
            {loadError}
          </p>
        )}

        {tab === "staff" && (
          <section className="space-y-6">
            <p className="text-sm text-[var(--muted)]">
              Salario mensual, adelantos del mes en curso y monto neto a pagar
              (salario − adelantos).
            </p>
            <form
              onSubmit={addEmployee}
              className="flex flex-wrap gap-3 items-end p-4 rounded-xl bg-[var(--card)] border border-[var(--border)]"
            >
              <div className="flex-1 min-w-[140px]">
                <label className="block text-xs font-medium mb-1">Nombre</label>
                <input
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  required
                  className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                />
              </div>
              <div className="w-40">
                <label className="block text-xs font-medium mb-1">
                  Salario mensual
                </label>
                <input
                  value={empSalary}
                  onChange={(e) => setEmpSalary(e.target.value)}
                  placeholder="ej. 500000"
                  required
                  className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                />
              </div>
              <button
                type="submit"
                className="rounded-lg bg-[var(--primary)] text-white px-4 py-2 text-sm font-medium hover:bg-[var(--primary-hover)]"
              >
                Agregar
              </button>
            </form>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-stone-100 text-stone-700">
                  <tr>
                    <th className="px-4 py-3 font-medium">Nombre</th>
                    <th className="px-4 py-3 font-medium">Salario mensual</th>
                    <th className="px-4 py-3 font-medium">Adelanto del mes</th>
                    <th className="px-4 py-3 font-medium">A pagar</th>
                    <th className="px-4 py-3 w-24" />
                  </tr>
                </thead>
                <tbody>
                  {employees.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-[var(--muted)]"
                      >
                        No hay empleados. Agregue filas o use el asistente.
                      </td>
                    </tr>
                  )}
                  {employees.map((row) => (
                    <tr
                      key={row.id}
                      className="border-t border-[var(--border)] hover:bg-stone-50/50"
                    >
                      <td className="px-4 py-3 font-medium">{row.fullName}</td>
                      <td className="px-4 py-3">${row.monthlySalaryFormatted}</td>
                      <td className="px-4 py-3">${row.advanceFormatted}</td>
                      <td className="px-4 py-3 text-green-800 font-medium">
                        ${row.netToPayFormatted}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => removeEmployee(row.id)}
                          className="text-xs text-red-700 hover:underline"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === "animals" && (
          <section className="space-y-6">
            <p className="text-sm text-[var(--muted)]">
              Objetivo de engorde: ~1,5 kg/día (~45 kg/mes). Comida: $14.800 por
              día desde la fecha de compra (se actualiza cada día).
            </p>

            <form
              onSubmit={addAnimal}
              className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-xl bg-[var(--card)] border border-[var(--border)]"
            >
              <div>
                <label className="block text-xs font-medium mb-1">
                  Caravana
                </label>
                <input
                  value={anCaravan}
                  onChange={(e) => setAnCaravan(e.target.value)}
                  required
                  className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium mb-1">
                  Características
                </label>
                <input
                  value={anChars}
                  onChange={(e) => setAnChars(e.target.value)}
                  placeholder="Raza, sexo, notas…"
                  className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Precio compra
                </label>
                <input
                  value={anPrice}
                  onChange={(e) => setAnPrice(e.target.value)}
                  placeholder="opcional"
                  className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Fecha compra
                </label>
                <input
                  type="date"
                  value={anDate}
                  onChange={(e) => setAnDate(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-4">
                <button
                  type="submit"
                  className="rounded-lg bg-[var(--primary)] text-white px-4 py-2 text-sm font-medium hover:bg-[var(--primary-hover)]"
                >
                  Registrar animal
                </button>
              </div>
            </form>

            <form
              onSubmit={addWeight}
              className="flex flex-wrap gap-3 items-end p-4 rounded-xl bg-amber-50/50 border border-amber-200/80"
            >
              <div className="min-w-[160px]">
                <label className="block text-xs font-medium mb-1">
                  Animal
                </label>
                <select
                  value={wAnimal}
                  onChange={(e) => setWAnimal(e.target.value)}
                  required
                  className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm bg-white"
                >
                  <option value="">Elegir caravana…</option>
                  {animals.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.caravan}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-28">
                <label className="block text-xs font-medium mb-1">Peso (kg)</label>
                <input
                  value={wKg}
                  onChange={(e) => setWKg(e.target.value)}
                  required
                  className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                />
              </div>
              <div className="w-40">
                <label className="block text-xs font-medium mb-1">Fecha</label>
                <input
                  type="date"
                  value={wDate}
                  onChange={(e) => setWDate(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm bg-white"
                />
              </div>
              <button
                type="submit"
                className="rounded-lg bg-[var(--accent)] text-white px-4 py-2 text-sm font-medium hover:opacity-90"
              >
                Guardar peso
              </button>
            </form>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-x-auto">
              <table className="w-full text-sm text-left min-w-[900px]">
                <thead className="bg-stone-100 text-stone-700">
                  <tr>
                    <th className="px-3 py-3 font-medium">Caravana</th>
                    <th className="px-3 py-3 font-medium">Características</th>
                    <th className="px-3 py-3 font-medium">Peso / fecha</th>
                    <th className="px-3 py-3 font-medium">Objetivo (~1,5 kg/día)</th>
                    <th className="px-3 py-3 font-medium">Precio compra</th>
                    <th className="px-3 py-3 font-medium">Fecha compra</th>
                    <th className="px-3 py-3 font-medium">Comida acum.</th>
                    <th className="px-3 py-3 font-medium">Total hasta venta</th>
                    <th className="px-3 py-3 w-20" />
                  </tr>
                </thead>
                <tbody>
                  {animals.length === 0 && (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-8 text-center text-[var(--muted)]"
                      >
                        No hay animales registrados.
                      </td>
                    </tr>
                  )}
                  {animals.map((a) => (
                    <tr
                      key={a.id}
                      className="border-t border-[var(--border)] align-top hover:bg-stone-50/50"
                    >
                      <td className="px-3 py-3 font-mono font-medium">
                        {a.caravan}
                      </td>
                      <td className="px-3 py-3 max-w-[180px] text-[var(--muted)]">
                        {a.characteristics || "—"}
                      </td>
                      <td className="px-3 py-3">
                        {a.latestWeight != null ? (
                          <>
                            <span className="font-medium">{a.latestWeight} kg</span>
                            <br />
                            <span className="text-xs text-[var(--muted)]">
                              {fmtDate(a.latestWeightDate)}
                            </span>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={
                            a.weightObjectiveMet === true
                              ? "text-green-800"
                              : a.weightObjectiveMet === false
                                ? "text-amber-800"
                                : "text-[var(--muted)]"
                          }
                        >
                          {a.weightObjectiveLabel}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        {a.purchasePrice != null
                          ? `$${a.purchasePrice.toLocaleString("es-AR")}`
                          : "—"}
                      </td>
                      <td className="px-3 py-3">{fmtDate(a.purchaseDate)}</td>
                      <td className="px-3 py-3">
                        {a.foodCostAccruedFormatted != null
                          ? `$${a.foodCostAccruedFormatted}`
                          : "—"}
                      </td>
                      <td className="px-3 py-3 font-medium">
                        {a.totalSpentToDateFormatted != null
                          ? `$${a.totalSpentToDateFormatted}`
                          : "—"}
                      </td>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={() => removeAnimal(a.id)}
                          className="text-xs text-red-700 hover:underline"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === "assistant" && (
          <section className="space-y-6 max-w-2xl">
            <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-5 space-y-3 text-sm text-[var(--muted)]">
              <p className="font-medium text-foreground">Cómo usar el asistente</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Adelanto:</strong> «Carlos adelantó 200.000» — suma el
                  adelanto del mes para el empleado que coincida con el nombre.
                </li>
                <li>
                  <strong>Peso:</strong> «Caravana 33 pesa 305 kg hoy» — registra
                  el peso y evalúa el objetivo de ~1,5 kg/día.
                </li>
              </ul>
            </div>

            <form onSubmit={sendCommand} className="space-y-3">
              <label htmlFor="cmd" className="block text-sm font-medium">
                Escribí la novedad
              </label>
              <textarea
                id="cmd"
                value={cmdText}
                onChange={(e) => setCmdText(e.target.value)}
                rows={3}
                placeholder="Ej: María adelantó 150.000"
                className="w-full rounded-xl border border-[var(--border)] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
              <button
                type="submit"
                disabled={cmdBusy}
                className="rounded-lg bg-[var(--primary)] text-white px-5 py-2.5 text-sm font-medium hover:bg-[var(--primary-hover)] disabled:opacity-60"
              >
                {cmdBusy ? "Procesando…" : "Aplicar a las tablas"}
              </button>
            </form>

            {cmdMsg && (
              <p
                className={`text-sm rounded-lg px-4 py-3 ${
                  cmdOk
                    ? "bg-green-50 text-green-900"
                    : "bg-amber-50 text-amber-900"
                }`}
              >
                {cmdMsg}
              </p>
            )}

            <div>
              <h3 className="text-sm font-medium mb-2">Últimos mensajes</h3>
              <ul className="space-y-2 max-h-80 overflow-y-auto">
                {logs.map((l) => (
                  <li
                    key={l.id}
                    className="text-xs rounded-lg border border-[var(--border)] bg-[var(--card)] p-3"
                  >
                    <span className="text-[var(--muted)]">
                      {new Date(l.createdAt).toLocaleString("es-AR")} —{" "}
                    </span>
                    <span className={l.success ? "text-green-800" : "text-red-800"}>
                      {l.result}
                    </span>
                    <div className="mt-1 text-[var(--muted)] italic">
                      «{l.rawText}»
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
