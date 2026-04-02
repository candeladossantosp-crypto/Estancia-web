import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { advanceForCurrentMonth, netSalary } from "@/lib/employee-utils";
import { formatMoney } from "@/lib/format";

const createSchema = z.object({
  fullName: z.string().min(1).max(120),
  monthlySalary: z.number().positive(),
});

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const list = await prisma.employee.findMany({
    where: { companyId: session.companyId },
    orderBy: { fullName: "asc" },
  });
  return NextResponse.json({
    employees: list.map((e) => ({
      id: e.id,
      fullName: e.fullName,
      monthlySalary: e.monthlySalary,
      advanceThisMonth: advanceForCurrentMonth(e),
      netToPay: netSalary(e),
      monthlySalaryFormatted: formatMoney(e.monthlySalary),
      advanceFormatted: formatMoney(advanceForCurrentMonth(e)),
      netToPayFormatted: formatMoney(netSalary(e)),
    })),
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const emp = await prisma.employee.create({
    data: {
      companyId: session.companyId,
      fullName: parsed.data.fullName.trim(),
      monthlySalary: parsed.data.monthlySalary,
      advanceAmount: 0,
      advanceYearMonth: "",
    },
  });
  return NextResponse.json({ employee: emp });
}
