import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

type Category =
  | "motor" | "health" | "life" | "term" | "travel" | "property"
  | "fire" | "marine" | "shopkeeper" | "engineering" | "liability"
  | "rto" | "finance"
  | "sip" | "mutual_fund" | "fd" | "credit_card" | "fastag" | "rsa";

const CATEGORIES: { value: Category; label: string; group: string }[] = [
  { value: "motor", label: "Motor Insurance", group: "Insurance" },
  { value: "health", label: "Health Insurance", group: "Insurance" },
  { value: "life", label: "Life Insurance", group: "Insurance" },
  { value: "term", label: "Term Insurance", group: "Insurance" },
  { value: "travel", label: "Travel Insurance", group: "Insurance" },
  { value: "property", label: "Property Insurance", group: "Insurance" },
  { value: "fire", label: "Fire Insurance", group: "Insurance" },
  { value: "marine", label: "Marine Insurance", group: "Insurance" },
  { value: "shopkeeper", label: "Shopkeeper Insurance", group: "Insurance" },
  { value: "engineering", label: "Engineering Insurance", group: "Insurance" },
  { value: "liability", label: "Liability Insurance", group: "Insurance" },
  { value: "rto", label: "RTO Services", group: "Services" },
  { value: "finance", label: "Loan / Finance", group: "Financial" },
  { value: "sip", label: "SIP", group: "Financial" },
  { value: "mutual_fund", label: "Mutual Fund", group: "Financial" },
  { value: "fd", label: "Fixed Deposit", group: "Financial" },
  { value: "credit_card", label: "Credit Card", group: "Financial" },
  { value: "fastag", label: "FASTag", group: "Services" },
  { value: "rsa", label: "RSA / Extended Warranty", group: "Services" },
];

const SUBS: Record<Category, string[]> = {
  motor: ["Private Car", "Two Wheeler", "Commercial Vehicle", "Taxi", "Bus", "Tractor", "Ambulance", "Electric Vehicle"],
  health: ["Individual", "Family Floater", "Senior Citizen", "Group Health", "Critical Illness", "Top Up"],
  life: ["ULIP", "Endowment", "Money Back", "Child Plan", "Pension", "Whole Life"],
  term: ["Pure Term", "Return of Premium", "Increasing Cover"],
  travel: ["Domestic", "International", "Student", "Senior Citizen"],
  property: ["Home Structure", "Home Contents", "Bharat Griha Raksha"],
  fire: ["Residential", "Commercial", "Industrial"],
  marine: ["Marine Cargo", "Marine Transit", "Marine Hull", "Import Export"],
  shopkeeper: ["Retail Shop", "Medical Store", "Mobile Shop", "Grocery", "Restaurant", "Showroom"],
  engineering: ["Contractors All Risk", "Erection All Risk", "Machinery Breakdown", "Electronic Equipment"],
  liability: ["Professional", "Public", "Directors", "Cyber"],
  rto: ["New Registration", "RC Transfer", "Duplicate RC", "NOC", "Fitness", "Permit", "Hypothecation", "Address Change"],
  finance: ["Car Loan", "Bike Loan", "Used Car Loan", "Commercial Vehicle Loan", "Business Loan", "Personal Loan", "Home Loan", "Loan Against Property"],
  sip: ["Equity", "Debt", "Hybrid", "ELSS"],
  mutual_fund: ["Equity", "Debt", "Hybrid", "Index", "ELSS"],
  fd: ["Bank FD", "Corporate FD", "Senior Citizen FD", "Tax Saver"],
  credit_card: ["Travel", "Cashback", "Rewards", "Fuel", "Business"],
  fastag: ["New Tag", "Recharge"],
  rsa: ["RSA Standalone", "Extended Warranty"],
};

type DynField = { key: string; label: string; type?: string };

const DYNAMIC: Record<Category, DynField[]> = {
  motor: [
    { key: "vehicle_no", label: "Vehicle Number" },
    { key: "make", label: "Make" },
    { key: "model", label: "Model" },
    { key: "engine_no", label: "Engine Number" },
    { key: "chassis_no", label: "Chassis Number" },
    { key: "idv", label: "IDV ₹", type: "number" },
  ],
  health: [
    { key: "sum_insured", label: "Sum Insured ₹", type: "number" },
    { key: "members_covered", label: "Members Covered", type: "number" },
    { key: "ped_details", label: "PED Details" },
  ],
  life: [
    { key: "sum_assured", label: "Sum Assured ₹", type: "number" },
    { key: "term_years", label: "Policy Term (years)", type: "number" },
    { key: "nominee", label: "Nominee" },
  ],
  term: [
    { key: "sum_assured", label: "Sum Assured ₹", type: "number" },
    { key: "term_years", label: "Term (years)", type: "number" },
    { key: "nominee", label: "Nominee" },
  ],
  travel: [
    { key: "destination", label: "Destination" },
    { key: "trip_start", label: "Trip Start", type: "date" },
    { key: "trip_end", label: "Trip End", type: "date" },
    { key: "sum_insured", label: "Sum Insured ₹", type: "number" },
  ],
  property: [
    { key: "property_address", label: "Property Address" },
    { key: "sum_insured", label: "Sum Insured ₹", type: "number" },
  ],
  fire: [
    { key: "sum_insured", label: "Sum Insured ₹", type: "number" },
    { key: "property_address", label: "Property Address" },
  ],
  marine: [
    { key: "consignment", label: "Consignment" },
    { key: "voyage", label: "Voyage / Route" },
    { key: "sum_insured", label: "Sum Insured ₹", type: "number" },
  ],
  shopkeeper: [
    { key: "shop_name", label: "Shop Name" },
    { key: "shop_address", label: "Shop Address" },
    { key: "stock_value", label: "Stock Value ₹", type: "number" },
  ],
  engineering: [
    { key: "project_name", label: "Project Name" },
    { key: "sum_insured", label: "Sum Insured ₹", type: "number" },
  ],
  liability: [
    { key: "limit_of_indemnity", label: "Limit of Indemnity ₹", type: "number" },
  ],
  rto: [
    { key: "vehicle_no", label: "Vehicle Number" },
    { key: "rto_office", label: "RTO Office" },
  ],
  finance: [
    { key: "loan_amount", label: "Loan Amount ₹", type: "number" },
    { key: "tenure_months", label: "Tenure (months)", type: "number" },
    { key: "interest_rate", label: "Interest Rate %", type: "number" },
    { key: "lender", label: "Lender / Bank" },
  ],
  sip: [
    { key: "scheme_name", label: "Scheme Name" },
    { key: "monthly_amount", label: "Monthly SIP ₹", type: "number" },
    { key: "folio_no", label: "Folio No" },
  ],
  mutual_fund: [
    { key: "scheme_name", label: "Scheme Name" },
    { key: "invested_amount", label: "Invested Amount ₹", type: "number" },
    { key: "folio_no", label: "Folio No" },
  ],
  fd: [
    { key: "principal", label: "Principal ₹", type: "number" },
    { key: "interest_rate", label: "Interest Rate %", type: "number" },
    { key: "tenure_months", label: "Tenure (months)", type: "number" },
    { key: "maturity_date", label: "Maturity Date", type: "date" },
  ],
  credit_card: [
    { key: "card_last4", label: "Card Last 4" },
    { key: "card_limit", label: "Credit Limit ₹", type: "number" },
    { key: "issuer", label: "Issuer" },
  ],
  fastag: [
    { key: "vehicle_no", label: "Vehicle Number" },
    { key: "tag_id", label: "FASTag ID" },
  ],
  rsa: [
    { key: "vehicle_no", label: "Vehicle Number" },
    { key: "validity_months", label: "Validity (months)", type: "number" },
  ],
};

export const AddProductDialog = ({
  customerId, customerName, open, onOpenChange, onSaved,
}: {
  customerId: string;
  customerName: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved?: () => void;
}) => {
  const { companyId, user } = useAuth();
  const [category, setCategory] = useState<Category>("motor");
  const [sub, setSub] = useState<string>("");
  const [insurers, setInsurers] = useState<{ id: string; name: string }[]>([]);
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({
    insurer_or_vendor: "",
    policy_no: "",
    premium: "",
    customer_price: "",
    govt_or_cost_fee: "",
    start_date: "",
    expiry_date: "",
    commission_rate: "",
    agent_share_pct: "60",
    branch_share_pct: "20",
    admin_share_pct: "20",
  });
  const [details, setDetails] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    (async () => {
      const [{ data: ins }, { data: vds }] = await Promise.all([
        (supabase as any).from("insurers").select("id,name").eq("is_active", true).order("name"),
        (supabase as any).from("vendors").select("id,name").eq("is_active", true).order("name"),
      ]);
      setInsurers(ins ?? []);
      setVendors(vds ?? []);
    })();
  }, [open]);

  useEffect(() => {
    setSub(SUBS[category]?.[0] ?? "");
    setDetails({});
  }, [category]);

  const isService = ["rto", "finance", "fastag", "rsa"].includes(category);
  const isFinancial = ["sip", "mutual_fund", "fd", "credit_card"].includes(category);
  const list = isService ? vendors : insurers;

  const save = async () => {
    if (!companyId) return;
    if (!isService && !isFinancial && !form.premium) return toast({ title: "Premium required", variant: "destructive" });
    if (isService && !form.customer_price) return toast({ title: "Customer price required", variant: "destructive" });

    setSaving(true);
    const payload: any = {
      company_id: companyId,
      customer_id: customerId,
      category,
      sub_category: sub || null,
      product_name: sub || category,
      insurer_or_vendor: form.insurer_or_vendor || null,
      policy_no: form.policy_no || null,
      premium: Number(form.premium || 0),
      customer_price: Number(form.customer_price || 0),
      govt_or_cost_fee: Number(form.govt_or_cost_fee || 0),
      start_date: form.start_date || null,
      expiry_date: form.expiry_date || null,
      commission_rate: Number(form.commission_rate || 0),
      agent_share_pct: Number(form.agent_share_pct || 0),
      branch_share_pct: Number(form.branch_share_pct || 0),
      admin_share_pct: Number(form.admin_share_pct || 0),
      details,
      agent_id: user?.id ?? null,
      created_by: user?.id ?? null,
      status: "active",
    };
    const { error } = await (supabase as any).from("customer_products").insert(payload);
    setSaving(false);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Product added ✅ Payout auto-calculated" });
    onOpenChange(false);
    setForm({ insurer_or_vendor: "", policy_no: "", premium: "", customer_price: "", govt_or_cost_fee: "", start_date: "", expiry_date: "", commission_rate: "", agent_share_pct: "60", branch_share_pct: "20", admin_share_pct: "20" });
    setDetails({});
    onSaved?.();
  };

  const dyn = DYNAMIC[category] ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Product — {customerName}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Category *</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Sub Category</Label>
            <Select value={sub} onValueChange={setSub}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {SUBS[category].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2">
            <Label>{isService ? "Vendor" : "Insurance Company"}</Label>
            <Select value={form.insurer_or_vendor || undefined} onValueChange={(v) => setForm({ ...form, insurer_or_vendor: v })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {list.map((x) => <SelectItem key={x.id} value={x.name}>{x.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {!isService && (
            <>
              <div><Label>Policy Number</Label><Input value={form.policy_no} onChange={(e) => setForm({ ...form, policy_no: e.target.value })} /></div>
              <div><Label>Premium ₹ *</Label><Input type="number" value={form.premium} onChange={(e) => setForm({ ...form, premium: e.target.value })} /></div>
              <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
              <div><Label>Expiry Date</Label><Input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} /></div>
              <div><Label>Commission % (rule)</Label><Input type="number" step="0.01" placeholder="e.g. 18" value={form.commission_rate} onChange={(e) => setForm({ ...form, commission_rate: e.target.value })} /></div>
            </>
          )}

          {isService && (
            <>
              <div><Label>Case / Reference No</Label><Input value={form.policy_no} onChange={(e) => setForm({ ...form, policy_no: e.target.value })} /></div>
              <div><Label>Customer Price ₹ *</Label><Input type="number" value={form.customer_price} onChange={(e) => setForm({ ...form, customer_price: e.target.value })} /></div>
              <div><Label>{category === "rto" ? "Govt Fee ₹" : "Lender Cost ₹"}</Label><Input type="number" value={form.govt_or_cost_fee} onChange={(e) => setForm({ ...form, govt_or_cost_fee: e.target.value })} /></div>
              <div><Label>Date</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
            </>
          )}

          {dyn.map((f) => (
            <div key={f.key} className={f.key.includes("address") ? "md:col-span-2" : ""}>
              <Label>{f.label}</Label>
              <Input
                type={f.type || "text"}
                value={details[f.key] || ""}
                onChange={(e) => setDetails({ ...details, [f.key]: e.target.value })}
              />
            </div>
          ))}

          <div className="md:col-span-2 mt-2 rounded border border-dashed p-3">
            <Label className="text-xs uppercase text-muted-foreground">Payout Split (auto)</Label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <div><Label className="text-xs">Agent %</Label><Input type="number" value={form.agent_share_pct} onChange={(e) => setForm({ ...form, agent_share_pct: e.target.value })} /></div>
              <div><Label className="text-xs">Branch %</Label><Input type="number" value={form.branch_share_pct} onChange={(e) => setForm({ ...form, branch_share_pct: e.target.value })} /></div>
              <div><Label className="text-xs">Admin %</Label><Input type="number" value={form.admin_share_pct} onChange={(e) => setForm({ ...form, admin_share_pct: e.target.value })} /></div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Commission, GST (18%), TDS (5%), agent / branch / admin shares are auto-calculated on save.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Product
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
