import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeAnimals } from "@/lib/serialize-animal";

const schema = z.object({
  weightKg: z.number().positive(),
  date: z.string().optional(),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const animal = await prisma.animal.findFirst({
    where: { id, companyId: session.companyId },
    include: { weights: true },
  });
  if (!animal) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const when = parsed.data.date?.trim()
    ? new Date(parsed.data.date)
    : new Date();
  if (Number.isNaN(when.getTime())) {
    return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
  }
  when.setHours(12, 0, 0, 0);
  await prisma.animalWeight.create({
    data: {
      animalId: id,
      weightKg: parsed.data.weightKg,
      date: when,
    },
  });
  const updated = await prisma.animal.findUniqueOrThrow({
    where: { id },
    include: { weights: true },
  });
  return NextResponse.json({ animal: serializeAnimals([updated])[0] });
}
