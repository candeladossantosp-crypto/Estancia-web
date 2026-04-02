import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseCommand } from "@/lib/command-parser";
import { findEmployeeBySpokenName } from "@/lib/find-employee";
import { currentYearMonth } from "@/lib/format";
import { serializeAnimals } from "@/lib/serialize-animal";
import { analyzeWeightObjective } from "@/lib/livestock";

const schema = z.object({ text: z.string().min(1).max(2000) });

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Texto inválido" }, { status: 400 });
  }
  const text = parsed.data.text;
  const cmd = parseCommand(text);

  if (cmd.type === "unknown") {
    await prisma.commandLog.create({
      data: {
        companyId: session.companyId,
        rawText: text,
        result:
          "No se entendió el mensaje. Pruebe: «Carlos adelantó 200.000» o «Caravana 33 pesa 305 kg».",
        success: false,
      },
    });
    return NextResponse.json({
      success: false,
      message:
        "No se reconoció el comando. Ejemplos: «María adelantó 150.000» — «Caravana 12 pesa 420 kg hoy».",
    });
  }

  if (cmd.type === "employee_advance") {
    const employees = await prisma.employee.findMany({
      where: { companyId: session.companyId },
    });
    const emp = findEmployeeBySpokenName(employees, cmd.employeeName);
    if (!emp) {
      const msg = `No se encontró un empleado que coincida con «${cmd.employeeName}».`;
      await prisma.commandLog.create({
        data: {
          companyId: session.companyId,
          rawText: text,
          result: msg,
          success: false,
        },
      });
      return NextResponse.json({ success: false, message: msg });
    }
    const ym = currentYearMonth();
    let newAdvance = cmd.amount;
    if (emp.advanceYearMonth === ym) {
      newAdvance = emp.advanceAmount + cmd.amount;
    }
    await prisma.employee.update({
      where: { id: emp.id },
      data: { advanceAmount: newAdvance, advanceYearMonth: ym },
    });
    const msg = `Adelanto registrado para ${emp.fullName}: +${cmd.amount.toLocaleString("es-AR")} (total del mes: ${newAdvance.toLocaleString("es-AR")}).`;
    await prisma.commandLog.create({
      data: {
        companyId: session.companyId,
        rawText: text,
        result: msg,
        success: true,
      },
    });
    return NextResponse.json({ success: true, message: msg });
  }

  if (cmd.type === "animal_weight") {
    const animal = await prisma.animal.findFirst({
      where: {
        companyId: session.companyId,
        caravan: cmd.caravan,
      },
      include: { weights: true },
    });
    if (!animal) {
      const msg = `No hay animal con caravana ${cmd.caravan}. Cree el animal primero en la pestaña Animales.`;
      await prisma.commandLog.create({
        data: {
          companyId: session.companyId,
          rawText: text,
          result: msg,
          success: false,
        },
      });
      return NextResponse.json({ success: false, message: msg });
    }
    const when = new Date();
    when.setHours(12, 0, 0, 0);
    await prisma.animalWeight.create({
      data: {
        animalId: animal.id,
        weightKg: cmd.weightKg,
        date: when,
      },
    });
    const updated = await prisma.animal.findUniqueOrThrow({
      where: { id: animal.id },
      include: { weights: true },
    });
    const sorted = [...updated.weights].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    const analysis = analyzeWeightObjective(
      sorted.map((w) => ({ date: w.date, weightKg: w.weightKg })),
    );
    const msg = `Peso registrado: caravana ${cmd.caravan} → ${cmd.weightKg} kg. ${analysis.label}`;
    await prisma.commandLog.create({
      data: {
        companyId: session.companyId,
        rawText: text,
        result: msg,
        success: true,
      },
    });
    return NextResponse.json({
      success: true,
      message: msg,
      animal: serializeAnimals([updated])[0],
    });
  }

  return NextResponse.json({ success: false, message: "Comando no soportado" });
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const logs = await prisma.commandLog.findMany({
    where: { companyId: session.companyId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({
    logs: logs.map((l) => ({
      id: l.id,
      rawText: l.rawText,
      result: l.result,
      success: l.success,
      createdAt: l.createdAt.toISOString(),
    })),
  });
}
