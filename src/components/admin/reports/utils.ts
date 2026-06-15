export type Range = "7d" | "30d" | "90d" | "custom";

export const rangeStart = (r: Range, customFrom?: string): Date => {
  if (r === "custom" && customFrom) return new Date(customFrom);
  const d = new Date(); d.setHours(0, 0, 0, 0);
  if (r === "7d") d.setDate(d.getDate() - 6);
  else if (r === "30d") d.setDate(d.getDate() - 29);
  else if (r === "90d") d.setDate(d.getDate() - 89);
  return d;
};

export const rangeEnd = (r: Range, customTo?: string): Date => {
  if (r === "custom" && customTo) { const d = new Date(customTo); d.setHours(23, 59, 59, 999); return d; }
  const d = new Date(); d.setHours(23, 59, 59, 999); return d;
};

export const fmtINR = (n: number) =>
  `₹${(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export const downloadCSV = (filename: string, rows: any[]) => {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

export const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(142 71% 45%)",
  "hsl(45 93% 55%)",
  "hsl(217 91% 60%)",
  "hsl(280 70% 55%)",
  "hsl(0 84% 60%)",
  "hsl(180 65% 45%)",
];

export type DateRangeProps = {
  range: Range;
  customFrom?: string;
  customTo?: string;
};
