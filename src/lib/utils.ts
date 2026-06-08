import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Mask all digits except the last 4.
 * "9893037946" -> "XXXXXX 7946"
 * "+919893037946" -> "+91 XXXXXX 7946"
 */
export function maskPhone(phone?: string | null): string {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 5) return phone;
  const last10 = digits.slice(-10);
  const prefix = digits.slice(0, -10);
  const visible = last10.slice(-4);
  const masked = "X".repeat(last10.length - 4);
  const pretty = `${masked} ${visible}`;
  return prefix ? `+${prefix} ${pretty}` : pretty;
}

export function formatPhone(phone?: string | null): string {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  if (digits.length > 10) {
    const last10 = digits.slice(-10);
    return `+${digits.slice(0, -10)} ${last10.slice(0, 5)} ${last10.slice(5)}`;
  }
  return phone;
}
