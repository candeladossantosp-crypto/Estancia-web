import type { Employee } from "@prisma/client";

export function findEmployeeBySpokenName(
  employees: Employee[],
  spokenName: string,
): Employee | null {
  const q = spokenName.trim().toLowerCase();
  if (!q) return null;
  const exact = employees.find((e) => e.fullName.toLowerCase() === q);
  if (exact) return exact;
  const firstName = employees.find(
    (e) => e.fullName.toLowerCase().split(/\s+/)[0] === q,
  );
  if (firstName) return firstName;
  return (
    employees.find((e) => e.fullName.toLowerCase().includes(q)) ?? null
  );
}
