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
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    const email = parsed.data.email.trim().toLowerCase();
    const { password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { company: true },
    });
    if (!user) {
      return NextResponse.json(
        { error: "Correo o contraseña incorrectos" },
        { status: 401 },
      );
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json(
        { error: "Correo o contraseña incorrectos" },
        { status: 401 },
      );
    }

    const token = await signSessionToken({
      sub: user.id,
      companyId: user.companyId,
      email: user.email,
    });
    await setSessionCookie(token);

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        companyName: user.company.name,
      },
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
        { error: `Error al iniciar sesión (detalle dev): ${m}` },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { error: "Error al iniciar sesión" },
      { status: 500 },
    );
  }
}
