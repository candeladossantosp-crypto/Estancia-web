import { parseAmount } from "@/lib/format";

export type ParsedCommand =
  | { type: "employee_advance"; employeeName: string; amount: number }
  | { type: "animal_weight"; caravan: string; weightKg: number }
  | { type: "unknown" };

export function parseCommand(text: string): ParsedCommand {
  const t = text.trim();

  const cw = t.match(
    /caravana\s*[#:]?\s*(\d+)[^\d]{0,50}?(\d+(?:[.,]\d+)?)\s*(?:kg|kilos?)/i,
  );
  if (cw) {
    return {
      type: "animal_weight",
      caravan: cw[1],
      weightKg: parseFloat(cw[2].replace(",", ".")),
    };
  }

  const cw2 = t.match(
    /(\d+(?:[.,]\d+)?)\s*(?:kg|kilos?)[^\d]{0,50}?caravana\s*[#:]?\s*(\d+)/i,
  );
  if (cw2) {
    return {
      type: "animal_weight",
      caravan: cw2[2],
      weightKg: parseFloat(cw2[1].replace(",", ".")),
    };
  }

  const adv = t.match(/^(.+?)\s+adelant[oó]\s+([\d.\s,]+)$/i);
  if (adv) {
    return {
      type: "employee_advance",
      employeeName: adv[1].trim(),
      amount: parseAmount(adv[2]),
    };
  }

  const adv2 = t.match(
    /^(.+?)\s+(?:sac[oó]|tom[oó])\s+(?:un\s+)?adelanto\s+(?:de\s+)?([\d.\s,]+)$/i,
  );
  if (adv2) {
    return {
      type: "employee_advance",
      employeeName: adv2[1].trim(),
      amount: parseAmount(adv2[2]),
    };
  }

  const adv3 = t.match(/^adelanto\s+(?:de\s+)?(.+?)\s+([\d.\s,]+)$/i);
  if (adv3) {
    return {
      type: "employee_advance",
      employeeName: adv3[1].trim(),
      amount: parseAmount(adv3[2]),
    };
  }

  return { type: "unknown" };
}
