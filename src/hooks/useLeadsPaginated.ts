import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";

const PAGE_SIZE = 50;

export type LeadBucket =
  | "all"
  | "today"
  | "overdue"
  | "interested"
  | "followup"
  | "cold"
  | "untouched";

export type LeadsStats = {
  to_call: number;
  interested: number;
  follow_up: number;
  overdue: number;
  untouched: number;
  cold: number;
  converted: number;
  total_leads: number;
};

const todayISO = () => new Date().toISOString().slice(0, 10);

type Args = {
  role?: "admin" | "manager" | "telecaller";
  userId?: string;
  filterAssigned?: boolean;
};

export const useLeadsPaginated = ({ role, userId, filterAssigned }: Args) => {
  const [leads, setLeads] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
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

      // Hide done/unsubscribed/not interested from active lists
      q = q.not("status", "in", "(Unsubscribed,Done,Not Interested)");

      if (filterAssigned && userId) {
        q = q.or(`assigned_telecaller.eq.${userId},assigned_telecaller.is.null`);
      }

      const t = todayISO();
      switch (bucket) {
        case "today":
          q = q.lte("call_date", t);
          break;
        case "overdue":
          q = q.lt("call_date", t).not("status", "in", "(Interested)");
          break;
        case "interested":
          q = q.eq("status", "Interested");
          break;
        case "followup":
          q = q.eq("status", "Follow-up");
          break;
        case "cold":
          q = q.in("status", ["New", "Not Picked"]);
          break;
        case "untouched":
          q = q.is("last_called_at", null);
          break;
      }


      const s = debouncedSearch.trim();
      if (s) {
        if (/^\d+$/.test(s)) q = q.ilike("phone_number", `%${s}%`);
        else q = q.ilike("customer_name", `%${s}%`);
      }
      return q;
    },
    [bucket, debouncedSearch, filterAssigned, userId]
  );

  const loadPage = useCallback(
    async (reset: boolean) => {
      const myReq = ++reqIdRef.current;
      const currentPage = reset ? 0 : page;
      if (reset) setLoading(true);
      else setLoadingMore(true);

      const from = currentPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, count, error } = await buildQuery(from, to);

      // Stale response guard
      if (myReq !== reqIdRef.current) return;

      if (error) {
        setLoading(false);
        setLoadingMore(false);
        return;
      }
      const rows = data ?? [];
      setLeads((prev) => (reset ? rows : [...prev, ...rows]));
      setTotalCount(count ?? 0);
      setHasMore(rows.length === PAGE_SIZE);
      if (reset) setPage(0);
      setLoading(false);
      setLoadingMore(false);
    },
    [page, buildQuery]
  );

  const loadStats = useCallback(async () => {
    const { data } = await supabase.from("leads_stats").select("*").maybeSingle();
    if (data) setStats(data as LeadsStats);
  }, []);

  // Reset + reload when filters change
  useEffect(() => {
    loadPage(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, bucket, filterAssigned, userId]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Load more on page bump
  useEffect(() => {
    if (page > 0) loadPage(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const loadMore = useCallback(() => {
    if (loadingMore || loading || !hasMore) return;
    setPage((p) => p + 1);
  }, [loadingMore, loading, hasMore]);

  const reload = useCallback(() => {
    loadPage(true);
    loadStats();
  }, [loadPage, loadStats]);

  const patchLead = useCallback((id: string, patch: Partial<any>) => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }, []);

  const removeLead = useCallback((id: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== id));
    setTotalCount((c) => Math.max(0, c - 1));
  }, []);

  return {
    leads,
    totalCount,
    loading,
    loadingMore,
    hasMore,
    search,
    setSearch,
    bucket,
    setBucket,
    stats,
    loadMore,
    reload,
    patchLead,
    removeLead,
  };
};
