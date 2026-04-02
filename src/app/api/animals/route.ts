import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeAnimals } from "@/lib/serialize-animal";

const createSchema = z.object({
  caravan: z.string().min(1).max(40),
  characteristics: z.string().max(500).optional(),
  purchasePrice: z.number().min(0).optional().nullable(),
  purchaseDate: z.string().optional().nullable(),
});

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const list = await prisma.animal.findMany({
    where: { companyId: session.companyId },
    include: { weights: true },
    orderBy: { caravan: "asc" },
  });
  return NextResponse.json({ animals: serializeAnimals(list) });
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
  const { caravan, characteristics, purchasePrice, purchaseDate } = parsed.data;
  let purchaseDateVal: Date | null = null;
  if (purchaseDate && purchaseDate.trim() !== "") {
    const d = new Date(purchaseDate);
    purchaseDateVal = Number.isNaN(d.getTime()) ? null : d;
  }
  try {
    const animal = await prisma.animal.create({
      data: {
        companyId: session.companyId,
        caravan: caravan.trim(),
        characteristics: characteristics?.trim() ?? "",
        purchasePrice: purchasePrice ?? null,
        purchaseDate: purchaseDateVal,
      },
      include: { weights: true },
    });
    return NextResponse.json({
      animal: serializeAnimals([animal])[0],
    });
  } catch {
    return NextResponse.json(
      { error: "Ya existe un animal con esa caravana" },
      { status: 409 },
    );
  }
}
