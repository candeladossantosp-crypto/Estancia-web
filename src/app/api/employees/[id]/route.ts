import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { currentYearMonth } from "@/lib/format";

const patchSchema = z.object({
  fullName: z.string().min(1).max(120).optional(),
  monthlySalary: z.number().positive().optional(),
  advanceAmount: z.number().min(0).optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const existing = await prisma.employee.findFirst({
    where: { id, companyId: session.companyId },
  });
  if (!existing) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const data: {
    fullName?: string;
    monthlySalary?: number;
    advanceAmount?: number;
    advanceYearMonth?: string;
  } = {};
  if (parsed.data.fullName !== undefined) data.fullName = parsed.data.fullName.trim();
  if (parsed.data.monthlySalary !== undefined) {
    data.monthlySalary = parsed.data.monthlySalary;
  }
  if (parsed.data.advanceAmount !== undefined) {
    data.advanceAmount = parsed.data.advanceAmount;
    data.advanceYearMonth = currentYearMonth();
  }
  const emp = await prisma.employee.update({
    where: { id },
    data,
  });
  return NextResponse.json({ employee: emp });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const existing = await prisma.employee.findFirst({
    where: { id, companyId: session.companyId },
  });
  if (!existing) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  await prisma.employee.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
