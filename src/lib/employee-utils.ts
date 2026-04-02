import type { Employee } from "@prisma/client";
import { currentYearMonth } from "@/lib/format";

export function advanceForCurrentMonth(emp: Employee): number {
  if (emp.advanceYearMonth !== currentYearMonth()) return 0;
  return emp.advanceAmount;
}

export function netSalary(emp: Employee): number {
  return Math.max(0, emp.monthlySalary - advanceForCurrentMonth(emp));
}
