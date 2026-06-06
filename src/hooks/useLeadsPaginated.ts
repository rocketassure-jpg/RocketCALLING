import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";

export type LeadBucket =
  | "all"
  | "today"
  | "overdue"
  | "interested"
  | "followup"
  | "cold"
  | "untouched"
  | "not_picked"
  | "quote_sent"
  | "premium_quoted"
  | "negotiation"
  | "converted"
  | "transfer_to_senior"
  | "not_interested"
  | "done";

export type LeadsStats = {
  to_call: number;
  overdue: number;
  untouched: number;
  interested: number;
  follow_up: number;
  cold: number;
  not_picked: number;
  quote_sent: number;
  premium_quoted: number;
  negotiation: number;
  converted: number;
  transfer_to_senior: number;
  not_interested: number;
  done: number;
  total_leads: number;
};

const todayISO = () => new Date().toISOString().slice(0, 10);

type Args = {
  role?: "admin" | "manager" | "telecaller";
  userId?: string;
  filterAssigned?: boolean;
  page?: number;
  pageSize?: number;
  revivalFrom?: string | null;
  revivalTo?: string | null;
};

// Statuses that count as "completed disposition" — leads with these are hidden from active calling list
const COMPLETED_STATUSES = ["Unsubscribed", "Done", "Not Interested", "Converted"];

export const useLeadsPaginated = ({
  role, userId, filterAssigned,
  page = 0, pageSize = 50,
  revivalFrom = null, revivalTo = null,
}: Args) => {
  const [leads, setLeads] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [bucket, setBucket] = useState<LeadBucket>("today");
  const [stats, setStats] = useState<LeadsStats | null>(null);

  const debouncedSearch = useDebounce(search, 350);
  const reqIdRef = useRef(0);

  const buildQuery = useCallback(
    (from: number, to: number) => {
      let q = supabase
        .from("leads")
        .select(
          `id, customer_name, phone_number, status, policy_type,
           call_date, premium_amount, area_id, assigned_telecaller,
           last_called_at, policy_expiry_date, created_at,
           areas(name)`,
          { count: "exact" }
        )
        .range(from, to)
        .order("call_date", { ascending: true })
        .order("created_at", { ascending: false });

      if (filterAssigned && userId) {
        q = q.or(`assigned_telecaller.eq.${userId},assigned_telecaller.is.null`);
      }

      const t = todayISO();
      switch (bucket) {
        case "today":
          q = q.lte("call_date", t).not("status", "in", `(${COMPLETED_STATUSES.join(",")})`).is("last_called_at", null);
          break;
        case "overdue":
          q = q.lt("call_date", t).not("status", "in", `(Interested,${COMPLETED_STATUSES.join(",")})`);
          break;
        case "untouched":
          q = q.is("last_called_at", null).not("status", "in", `(${COMPLETED_STATUSES.join(",")})`);
          break;
        case "interested": q = q.eq("status", "Interested"); break;
        case "followup": q = q.eq("status", "Follow-up"); break;
        case "cold": q = q.in("status", ["New", "Not Picked"]); break;
        case "not_picked": q = q.eq("status", "Not Picked"); break;
        case "quote_sent": q = q.eq("status", "Quote Sent"); break;
        case "premium_quoted": q = q.eq("status", "Premium Quoted"); break;
        case "negotiation": q = q.eq("status", "Negotiation"); break;
        case "converted": q = q.eq("status", "Converted"); break;
        case "transfer_to_senior": q = q.eq("status", "Transfer to Senior"); break;
        case "not_interested": q = q.eq("status", "Not Interested"); break;
        case "done": q = q.eq("status", "Done"); break;
        case "all": break;
      }

      if (revivalFrom && revivalTo) {
        q = q.gte("policy_expiry_date", revivalFrom).lte("policy_expiry_date", revivalTo);
      }

      const s = debouncedSearch.trim();
      if (s) {
        if (/^\d+$/.test(s)) q = q.ilike("phone_number", `%${s}%`);
        else q = q.ilike("customer_name", `%${s}%`);
      }
      return q;
    },
    [bucket, debouncedSearch, filterAssigned, userId, revivalFrom, revivalTo]
  );

  const loadPage = useCallback(async () => {
    const myReq = ++reqIdRef.current;
    setLoading(true);
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const { data, count, error } = await buildQuery(from, to);
    if (myReq !== reqIdRef.current) return;
    if (error) {
      setLoading(false);
      return;
    }
    setLeads(data ?? []);
    setTotalCount(count ?? 0);
    setLoading(false);
  }, [page, pageSize, buildQuery]);

  const loadStats = useCallback(async () => {
    const { data } = await supabase.from("leads_stats").select("*").maybeSingle();
    if (data) setStats(data as LeadsStats);
  }, []);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  useEffect(() => { loadStats(); }, [loadStats]);

  const reload = useCallback(() => {
    loadPage();
    loadStats();
  }, [loadPage, loadStats]);

  const patchLead = useCallback((id: string, patch: Partial<any>) => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }, []);

  const removeLead = useCallback((id: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== id));
    setTotalCount((c) => Math.max(0, c - 1));
  }, []);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return {
    leads, totalCount, loading,
    search, setSearch, bucket, setBucket, stats,
    reload, patchLead, removeLead,
    totalPages,
  };
};
