/** Interpreta montos: 200.000 (miles), 200000, 1.200.500, 200,5 (decimales). */
export function parseAmount(raw: string): number {
  const s = raw.trim().replace(/\s/g, "");
  if (/^\d{1,3}(\.\d{3})+(\,\d{1,2})?$/.test(s)) {
    const [ints, dec] = s.split(",");
    const base = ints.replace(/\./g, "");
    return dec ? parseFloat(`${base}.${dec}`) : parseInt(base, 10);
  }
  if (/^\d+,\d{1,2}$/.test(s)) {
    return parseFloat(s.replace(",", "."));
  }
  const noThousands = s.replace(/\./g, "");
  const n = parseFloat(noThousands.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function formatMoney(n: number): string {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(
    Math.round(n),
  );
}

export function currentYearMonth(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
