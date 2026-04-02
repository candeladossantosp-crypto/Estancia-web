import { Prisma } from "@prisma/client";

/** Mensaje seguro para mostrar al usuario cuando Prisma falla. */
export function prismaErrorMessage(e: unknown): string | null {
  const msg = e instanceof Error ? e.message : "";
  if (
    msg.includes("does not exist") &&
    (msg.includes("table") || msg.includes("relation"))
  ) {
    return "La base de datos no tiene las tablas. En tu Mac ejecutá: npx prisma migrate deploy";
  }
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P1000" || e.code === "P1001") {
      return "No se pudo conectar a la base de datos. Revisá DATABASE_URL en Hostinger y la contraseña de Supabase.";
    }
    if (e.code === "P2021") {
      return "La base de datos no coincide con el esquema. En tu Mac ejecutá: npx prisma migrate deploy";
    }
  }
  if (e instanceof Prisma.PrismaClientInitializationError) {
    return "No se pudo conectar a la base de datos (revisá DATABASE_URL).";
  }
  return null;
}

export function isAuthSecretError(e: unknown): boolean {
  return e instanceof Error && e.message.includes("AUTH_SECRET");
}

/**
 * Detecta textos típicos de Prisma/Node aunque el error no sea una instancia tipada.
 */
export function inferErrorFromMessage(e: unknown): string | null {
  const msg = e instanceof Error ? e.message : "";
  if (!msg) return null;
  if (
    /P1000|Authentication failed|credentials are not valid|password authentication failed/i.test(
      msg,
    )
  ) {
    return "La base rechazó la conexión. Revisá DATABASE_URL: contraseña correcta y, si tiene ? o #, usá %3F y %23 en la URL. Misma cadena que en tu .env local.";
  }
  if (/P1001|Can't reach database server|ECONNREFUSED|ETIMEDOUT|ENOTFOUND/i.test(msg)) {
    return "No se llega a la base de datos. Revisá DATABASE_URL y el host (debe ser db....supabase.co).";
  }
  if (
    msg.includes("does not exist") &&
    (msg.includes("table") || msg.includes("relation"))
  ) {
    return "Faltan tablas en la base. En tu Mac: npx prisma migrate deploy";
  }
  if (/cookie|set-cookie|headers/i.test(msg) && /mutat|read-only|immutable/i.test(msg)) {
    return "Problema al guardar la sesión. Probá otro navegador o ventana de incógnito.";
  }
  return null;
}
