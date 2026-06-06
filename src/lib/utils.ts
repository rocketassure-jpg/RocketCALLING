import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Mask all but the first 5 digits of a phone number.
 * "9893012345" -> "98930 XXXXX"
 * "+919893012345" -> "+9198930 XXXXX" (preserves leading +country digits beyond 10)
 */
export function maskPhone(phone?: string | null): string {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 6) return phone;
  // keep leading prefix (country code) + first 5 of last 10
  const last10 = digits.slice(-10);
  const prefix = digits.slice(0, -10);
  const visible = last10.slice(0, 5);
  const masked = "X".repeat(last10.length - 5);
  const pretty = `${visible} ${masked}`;
  return prefix ? `+${prefix} ${pretty}` : pretty;
}

