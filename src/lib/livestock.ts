export const DAILY_FOOD_COST_ARS = 14800;
export const EXPECTED_DAILY_WEIGHT_GAIN_KG = 1.5;

/** Costo acumulado de comida: días completos desde compra × 14.800 */
export function foodCostSincePurchase(
  purchaseDate: Date | null,
  now = new Date(),
): number | null {
  if (!purchaseDate) return null;
  const start = new Date(purchaseDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(0, 0, 0, 0);
  const days = Math.max(
    0,
    Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
  );
  return days * DAILY_FOOD_COST_ARS;
}

export type WeightObjectiveResult = {
  label: string;
  met: boolean | null;
  gainedKg: number;
  expectedKg: number;
  days: number;
};

/**
 * Compara ganancia de peso con ~1,5 kg/día entre el peso de referencia y el último pesaje.
 */
export function analyzeWeightObjective(
  weights: { date: Date; weightKg: number }[],
  now = new Date(),
): WeightObjectiveResult {
  const sorted = [...weights].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  if (sorted.length === 0) {
    return {
      label: "Sin pesajes registrados",
      met: null,
      gainedKg: 0,
      expectedKg: 0,
      days: 0,
    };
  }

  const y = now.getFullYear();
  const m = now.getMonth();
  const monthStart = new Date(y, m, 1);
  const monthEnd = new Date(y, m + 1, 0, 23, 59, 59, 999);

  const inMonth = sorted.filter((w) => {
    const d = new Date(w.date);
    return d >= monthStart && d <= monthEnd;
  });

  let startWeight: number;
  let startDate: Date;
  let endWeight: number;
  let endDate: Date;

  if (inMonth.length >= 2) {
    startWeight = inMonth[0].weightKg;
    startDate = new Date(inMonth[0].date);
    endWeight = inMonth[inMonth.length - 1].weightKg;
    endDate = new Date(inMonth[inMonth.length - 1].date);
  } else if (inMonth.length === 1) {
    const before = sorted.filter((w) => new Date(w.date) < monthStart);
    const prev = before[before.length - 1];
    if (!prev) {
      return {
        label: "Un pesaje en el mes; falta peso previo para comparar",
        met: null,
        gainedKg: 0,
        expectedKg: EXPECTED_DAILY_WEIGHT_GAIN_KG * 30,
        days: 0,
      };
    }
    startWeight = prev.weightKg;
    startDate = new Date(prev.date);
    endWeight = inMonth[0].weightKg;
    endDate = new Date(inMonth[0].date);
  } else {
    if (sorted.length < 2) {
      return {
        label: "Se necesitan al menos dos pesajes para evaluar el objetivo",
        met: null,
        gainedKg: 0,
        expectedKg: 0,
        days: 0,
      };
    }
    startWeight = sorted[sorted.length - 2].weightKg;
    startDate = new Date(sorted[sorted.length - 2].date);
    endWeight = sorted[sorted.length - 1].weightKg;
    endDate = new Date(sorted[sorted.length - 1].date);
  }

  const days = Math.max(
    1,
    Math.round(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    ),
  );
  const gainedKg = endWeight - startWeight;
  const expectedKg = EXPECTED_DAILY_WEIGHT_GAIN_KG * days;
  const met = gainedKg >= expectedKg * 0.98;
  const shortfall = Math.max(0, expectedKg - gainedKg);

  const label = met
    ? `Cumple: +${gainedKg.toFixed(1)} kg en ${days} días (esperado ~${expectedKg.toFixed(1)} kg)`
    : `Pendiente: faltan ~${shortfall.toFixed(1)} kg (ganó ${gainedKg.toFixed(1)} kg en ${days} días; esperado ~${expectedKg.toFixed(1)} kg)`;

  return { label, met, gainedKg, expectedKg, days };
}
