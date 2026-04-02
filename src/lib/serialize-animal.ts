import type { Animal, AnimalWeight } from "@prisma/client";
import {
  analyzeWeightObjective,
  foodCostSincePurchase,
} from "@/lib/livestock";
import { formatMoney } from "@/lib/format";

export type AnimalDTO = {
  id: string;
  caravan: string;
  characteristics: string;
  purchasePrice: number | null;
  purchaseDate: string | null;
  foodCostAccrued: number | null;
  foodCostAccruedFormatted: string | null;
  /** Compra + comida acumulada hasta hoy */
  totalSpentToDate: number | null;
  totalSpentToDateFormatted: string | null;
  weightObjectiveLabel: string;
  weightObjectiveMet: boolean | null;
  latestWeight: number | null;
  latestWeightDate: string | null;
  weights: { id: string; date: string; weightKg: number }[];
};

export function serializeAnimals(
  list: (Animal & { weights: AnimalWeight[] })[],
): AnimalDTO[] {
  return list.map((animal) => {
    const sorted = [...animal.weights].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    const weightRows = sorted.map((w) => ({
      id: w.id,
      date: w.date.toISOString(),
      weightKg: w.weightKg,
    }));
    const obj = analyzeWeightObjective(
      sorted.map((w) => ({ date: w.date, weightKg: w.weightKg })),
    );
    const food = foodCostSincePurchase(animal.purchaseDate);
    const purchase = animal.purchasePrice ?? 0;
    const totalSpent =
      food != null ? purchase + food : animal.purchasePrice != null ? purchase : null;
    const last = sorted[sorted.length - 1];
    return {
      id: animal.id,
      caravan: animal.caravan,
      characteristics: animal.characteristics,
      purchasePrice: animal.purchasePrice,
      purchaseDate: animal.purchaseDate?.toISOString() ?? null,
      foodCostAccrued: food,
      foodCostAccruedFormatted: food != null ? formatMoney(food) : null,
      totalSpentToDate: totalSpent,
      totalSpentToDateFormatted:
        totalSpent != null ? formatMoney(totalSpent) : null,
      weightObjectiveLabel: obj.label,
      weightObjectiveMet: obj.met,
      latestWeight: last?.weightKg ?? null,
      latestWeightDate: last?.date.toISOString() ?? null,
      weights: weightRows,
    };
  });
}
