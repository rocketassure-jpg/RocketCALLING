import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Role = "admin" | "manager" | "telecaller" | "sub_agent" | null;

type ProfileStatus = {
  is_approved: boolean;
  is_active: boolean;
  rejection_reason: string | null;
} | null;

const pickRole = (roles: string[]): Role =>
  roles.includes("admin") ? "admin"
  : roles.includes("manager") ? "manager"
  : roles.includes("telecaller") ? "telecaller"
  : roles.includes("sub_agent") ? "sub_agent"
  : null;

interface AuthCtx {
  user: User | null;
  session: Session | null;
  role: Role;
  profileStatus: ProfileStatus;
  companyId: string | null;
  isSuperAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({} as AuthCtx);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadUserMeta = async (uid: string) => {
    const [rolesRes, profRes] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", uid),
      supabase.from("profiles").select("is_approved,is_active,rejection_reason,company_id,is_super_admin").eq("id", uid).maybeSingle(),
    ]);
    setRole(pickRole((rolesRes.data ?? []).map((r: any) => r.role)));
    const p: any = profRes.data;
    setProfileStatus(p ? {
      is_approved: !!p.is_approved,
      is_active: p.is_active !== false,
      rejection_reason: p.rejection_reason ?? null,
    } : null);
    setCompanyId(p?.company_id ?? null);
    setIsSuperAdmin(!!p?.is_super_admin);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(() => loadUserMeta(s.user.id), 0);
      } else {
        setRole(null);
        setProfileStatus(null);
        setCompanyId(null);
        setIsSuperAdmin(false);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) await loadUserMeta(s.user.id);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return <Ctx.Provider value={{ user, session, role, profileStatus, companyId, isSuperAdmin, loading, signOut }}>{children}</Ctx.Provider>;
};


export const useAuth = () => useContext(Ctx);
