import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signSessionToken, setSessionCookie } from "@/lib/auth";
import {
  inferErrorFromMessage,
  isAuthSecretError,
  prismaErrorMessage,
} from "@/lib/api-errors";

const schema = z.object({
  companyName: z.string().min(2).max(120),
  name: z.string().min(1).max(80).optional(),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { companyName, name, password } = parsed.data;
    const email = parsed.data.email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Ya existe una cuenta con ese correo" },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const company = await prisma.company.create({
      data: {
        name: companyName,
        users: {
          create: {
            email,
            passwordHash,
            name: name ?? null,
          },
        },
      },
      include: { users: true },
    });
    const user = company.users[0];
    const token = await signSessionToken({
      sub: user.id,
      companyId: company.id,
      email: user.email,
    });
    await setSessionCookie(token);

    return NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email, companyName: company.name },
    });
  } catch (e) {
    console.error(e);
    if (isAuthSecretError(e)) {
      return NextResponse.json(
        {
          error:
            "Falta AUTH_SECRET en el servidor (mínimo 32 caracteres). Revisá variables de entorno en Hostinger.",
        },
        { status: 500 },
      );
    }
    const prismaMsg =
      prismaErrorMessage(e) ?? inferErrorFromMessage(e);
    if (prismaMsg) {
      return NextResponse.json({ error: prismaMsg }, { status: 500 });
    }
    if (process.env.NODE_ENV === "development") {
      const m = e instanceof Error ? e.message : String(e);
      return NextResponse.json(
        { error: `Error al registrar (detalle dev): ${m}` },
        { status: 500 },
      );
    }
    return NextResponse.json({ error: "Error al registrar" }, { status: 500 });
  }
}
