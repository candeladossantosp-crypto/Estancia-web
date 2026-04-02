import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeAnimals } from "@/lib/serialize-animal";

const patchSchema = z.object({
  caravan: z.string().min(1).max(40).optional(),
  characteristics: z.string().max(500).optional(),
  purchasePrice: z.number().min(0).nullable().optional(),
  purchaseDate: z.string().nullable().optional(),
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
  const existing = await prisma.animal.findFirst({
    where: { id, companyId: session.companyId },
    include: { weights: true },
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
    caravan?: string;
    characteristics?: string;
    purchasePrice?: number | null;
    purchaseDate?: Date | null;
  } = {};
  if (parsed.data.caravan !== undefined) data.caravan = parsed.data.caravan.trim();
  if (parsed.data.characteristics !== undefined) {
    data.characteristics = parsed.data.characteristics.trim();
  }
  if (parsed.data.purchasePrice !== undefined) {
    data.purchasePrice = parsed.data.purchasePrice;
  }
  if (parsed.data.purchaseDate !== undefined) {
    if (parsed.data.purchaseDate === null || parsed.data.purchaseDate === "") {
      data.purchaseDate = null;
    } else {
      const d = new Date(parsed.data.purchaseDate);
      data.purchaseDate = Number.isNaN(d.getTime()) ? null : d;
    }
  }
  try {
    const animal = await prisma.animal.update({
      where: { id },
      data,
      include: { weights: true },
    });
    return NextResponse.json({ animal: serializeAnimals([animal])[0] });
  } catch {
    return NextResponse.json(
      { error: "Ya existe otro animal con esa caravana" },
      { status: 409 },
    );
  }
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
  const existing = await prisma.animal.findFirst({
    where: { id, companyId: session.companyId },
  });
  if (!existing) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  await prisma.animal.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
