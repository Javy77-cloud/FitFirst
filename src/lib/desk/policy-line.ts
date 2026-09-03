import { homeLineKey, type HomeLineKey } from "@/lib/home/lines";

export type BookFamily = "pc" | "life" | "health";

export function bookFamily(lineOfBusiness: string): BookFamily {
  const key = homeLineKey(lineOfBusiness);
  if (key === "LIFE") return "life";
  if (key === "HEALTH") return "health";
  return "pc";
}

export function isPcSubLine(lineOfBusiness: string, sub: string): boolean {
  const key = homeLineKey(lineOfBusiness);
  if (sub === "all" || !sub) return true;
  if (sub === "home") return key === "HO";
  if (sub === "auto") return key === "AUTO";
  if (sub === "commercial") return key === "COMMERCIAL";
  if (sub === "flood") return key === "FLOOD";
  return key === (sub.toUpperCase() as HomeLineKey);
}
