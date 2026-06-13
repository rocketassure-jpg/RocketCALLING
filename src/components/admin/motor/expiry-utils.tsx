import { Badge } from "@/components/ui/badge";

export const daysUntil = (date: string | null | undefined): number | null => {
  if (!date) return null;
  const d = new Date(date + "T00:00:00");
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - t.getTime()) / (1000 * 60 * 60 * 24));
};

export const expiryBadge = (date: string | null | undefined) => {
  const d = daysUntil(date);
  if (d === null) return <Badge variant="outline">—</Badge>;
  if (d < 0) return <Badge variant="destructive">Expired {Math.abs(d)}d ago</Badge>;
  if (d <= 7) return <Badge className="bg-red-500 hover:bg-red-600 text-white">Due in {d}d</Badge>;
  if (d <= 15) return <Badge className="bg-orange-500 hover:bg-orange-600 text-white">Due in {d}d</Badge>;
  if (d <= 30) return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">{d}d left</Badge>;
  if (d <= 60) return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white">{d}d left</Badge>;
  return <Badge variant="secondary">{d}d left</Badge>;
};

export const expiryBucket = (date: string | null | undefined): "expired" | "7" | "15" | "30" | "60" | "ok" => {
  const d = daysUntil(date);
  if (d === null) return "ok";
  if (d < 0) return "expired";
  if (d <= 7) return "7";
  if (d <= 15) return "15";
  if (d <= 30) return "30";
  if (d <= 60) return "60";
  return "ok";
};
