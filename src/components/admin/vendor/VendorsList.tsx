import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Pencil, Search, Star, FileText, Building2, MapPin, Briefcase, Award, Package } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export const VENDOR_TYPES = [
  { value: "insurance_company", label: "Insurance Company" },
  { value: "broker", label: "Broker" },
  { value: "posp", label: "POSP Network" },
  { value: "corporate_agent", label: "Corporate Agent" },
  { value: "aggregator", label: "Aggregator" },
  { value: "dsa", label: "DSA" },
  { value: "rto", label: "RTO Vendor" },
  { value: "finance_bank", label: "Bank" },
  { value: "finance_nbfc", label: "NBFC" },
  { value: "surveyor", label: "Surveyor" },
  { value: "tpa", label: "TPA" },
];

const STATUSES = ["active", "inactive", "suspended", "blacklisted"];
const PRODUCT_CATEGORIES = ["motor","health","life","fire","marine","shopkeeper","liability","rto","finance"];
const COMMISSION_TYPES = [
  { value: "percentage", label: "Percentage %" },
  { value: "fixed", label: "Fixed Amount" },
  { value: "slab", label: "Slab Based" },
  { value: "od_tp_split", label: "OD/TP Split" },
];
const DOC_TYPES = ["agreement","gst","pan","irda_license","commission_sheet","rate_card","other"];

const emptyVendor = {
  name: "", code: "", vendor_type: "broker", status: "active", commission_type: "percentage",
  contact_person: "", mobile: "", whatsapp: "", contact_email: "", website: "",
  gst_number: "", pan_number: "",
  country: "India", state: "", district: "", city: "", pincode: "", address: "",
  irda_license_no: "", irda_expiry_date: "", agreement_start_date: "", agreement_end_date: "",
  notes: "", is_active: true,
};

const Stars = ({ value, onChange, readOnly = false }: { value: number; onChange?: (v: number) => void; readOnly?: boolean }) => (
  <div className="flex gap-0.5">
    {[1,2,3,4,5].map((n) => (
      <button key={n} type="button" disabled={readOnly} onClick={() => onChange?.(n)}>
        <Star className={`h-4 w-4 ${n <= value ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
      </button>
    ))}
  </div>
);

export const VendorsList = ({ initialType }: { initialType?: string }) => {
  const { companyId, user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);
  const [form, setForm] = useState<any>(emptyVendor);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>(initialType ?? "all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [vp, setVp] = useState<any[]>([]);
  const [vc, setVc] = useState<any[]>([]);
  const [vd, setVd] = useState<any[]>([]);
  const [vr, setVr] = useState<any[]>([]);
  const [myRating, setMyRating] = useState<any>({ claim_support: 0, pricing: 0, service: 0, turnaround: 0, comment: "" });

  const load = async () => {
    const [{ data: v }, { data: pc }] = await Promise.all([
      supabase.from("vendors").select("*").order("vendor_type").order("name"),
      supabase.from("product_catalog").select("*").eq("is_active", true).order("name"),
    ]);
    setRows(v ?? []); setProducts(pc ?? []);
  };

  const loadVendorDetails = async (vendorId: string) => {
    const [p, c, d, r] = await Promise.all([
      supabase.from("vendor_products").select("*").eq("vendor_id", vendorId),
      supabase.from("vendor_commissions").select("*").eq("vendor_id", vendorId).order("product_category"),
      supabase.from("vendor_documents").select("*").eq("vendor_id", vendorId),
      supabase.from("vendor_ratings").select("*").eq("vendor_id", vendorId),
    ]);
    setVp(p.data ?? []); setVc(c.data ?? []); setVd(d.data ?? []); setVr(r.data ?? []);
    const mine = (r.data ?? []).find((x: any) => x.rated_by === user?.id);
    setMyRating(mine ?? { claim_support: 0, pricing: 0, service: 0, turnaround: 0, comment: "" });
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name?.trim() || !companyId) return;
    const payload: any = { ...form };
    ["irda_expiry_date","agreement_start_date","agreement_end_date"].forEach((k) => { if (!payload[k]) payload[k] = null; });
    if (edit) {
      const { error } = await supabase.from("vendors").update(payload).eq("id", edit.id);
      if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
      toast({ title: "Vendor updated" });
    } else {
      const { data, error } = await supabase.from("vendors").insert({ ...payload, company_id: companyId }).select().single();
      if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
      setEdit(data);
      toast({ title: "Vendor created — now add products & commissions" });
    }
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this vendor and all related products, commissions, documents and ratings?")) return;
    await supabase.from("vendors").delete().eq("id", id); load();
  };

  const openEdit = async (r: any) => { setEdit(r); setForm({ ...emptyVendor, ...r }); setOpen(true); await loadVendorDetails(r.id); };
  const openAdd = () => { setEdit(null); setForm(emptyVendor); setVp([]); setVc([]); setVd([]); setVr([]); setOpen(true); };

  const addProduct = async (cat: string, name: string, pct: number) => {
    if (!edit || !companyId) return;
    const { error } = await supabase.from("vendor_products").insert({ company_id: companyId, vendor_id: edit.id, product_category: cat, product_name: name, default_commission_pct: pct });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    loadVendorDetails(edit.id);
  };
  const removeProduct = async (id: string) => { await supabase.from("vendor_products").delete().eq("id", id); loadVendorDetails(edit.id); };

  const addCommission = async (payload: any) => {
    if (!edit || !companyId) return;
    const { error } = await supabase.from("vendor_commissions").insert({ ...payload, company_id: companyId, vendor_id: edit.id });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    loadVendorDetails(edit.id);
  };
  const removeCommission = async (id: string) => { await supabase.from("vendor_commissions").delete().eq("id", id); loadVendorDetails(edit.id); };

  const addDoc = async (payload: any) => {
    if (!edit || !companyId) return;
    const { error } = await supabase.from("vendor_documents").insert({ ...payload, company_id: companyId, vendor_id: edit.id, uploaded_by: user?.id });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    loadVendorDetails(edit.id);
  };
  const removeDoc = async (id: string) => { await supabase.from("vendor_documents").delete().eq("id", id); loadVendorDetails(edit.id); };

  const saveRating = async () => {
    if (!edit || !companyId || !user) return;
    const payload = { ...myRating, company_id: companyId, vendor_id: edit.id, rated_by: user.id };
    const { error } = await supabase.from("vendor_ratings").upsert(payload, { onConflict: "vendor_id,rated_by" });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Rating saved" });
    loadVendorDetails(edit.id);
  };

  const filtered = useMemo(() => rows.filter((r) =>
    (typeFilter === "all" || r.vendor_type === typeFilter) &&
    (statusFilter === "all" || r.status === statusFilter) &&
    (!q.trim() || (r.name + " " + (r.code ?? "")).toLowerCase().includes(q.toLowerCase()))
  ), [rows, q, typeFilter, statusFilter]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Vendors ({filtered.length})</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="h-9 w-44 pl-8" placeholder="Search name/code…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {VENDOR_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="hero" size="sm" onClick={openAdd}><Plus className="h-4 w-4" /> Add Vendor</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Name</TableHead><TableHead>Code</TableHead><TableHead>Type</TableHead>
            <TableHead>Contact</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.id} className="cursor-pointer" onClick={() => openEdit(r)}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="text-xs">{r.code || "—"}</TableCell>
                <TableCell><Badge variant="outline">{VENDOR_TYPES.find((t) => t.value === r.vendor_type)?.label || r.vendor_type}</Badge></TableCell>
                <TableCell className="text-xs">{r.contact_person} {r.mobile && `· ${r.mobile}`}</TableCell>
                <TableCell><Badge variant={r.status === "active" ? "default" : r.status === "blacklisted" ? "destructive" : "secondary"} className="capitalize">{r.status}</Badge></TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); openEdit(r); }}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); del(r.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {!filtered.length && <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No vendors match.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEdit(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{edit ? `Edit Vendor — ${form.name}` : "Add Vendor"}</DialogTitle></DialogHeader>
          <Tabs defaultValue="basic">
            <TabsList className="flex h-auto flex-wrap">
              <TabsTrigger value="basic"><Briefcase className="mr-1 h-4 w-4" /> Basic</TabsTrigger>
              <TabsTrigger value="address"><MapPin className="mr-1 h-4 w-4" /> Address</TabsTrigger>
              <TabsTrigger value="business"><Building2 className="mr-1 h-4 w-4" /> Business</TabsTrigger>
              <TabsTrigger value="products" disabled={!edit}><Package className="mr-1 h-4 w-4" /> Products</TabsTrigger>
              <TabsTrigger value="commissions" disabled={!edit}><Award className="mr-1 h-4 w-4" /> Commissions</TabsTrigger>
              <TabsTrigger value="docs" disabled={!edit}><FileText className="mr-1 h-4 w-4" /> Documents</TabsTrigger>
              <TabsTrigger value="rating" disabled={!edit}><Star className="mr-1 h-4 w-4" /> Rating</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-3 pt-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5 md:col-span-2"><Label>Vendor Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Vendor Code</Label><Input value={form.code || ""} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Vendor Type *</Label>
                  <Select value={form.vendor_type} onValueChange={(v) => setForm({ ...form, vendor_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{VENDOR_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Contact Person</Label><Input value={form.contact_person || ""} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Mobile</Label><Input value={form.mobile || ""} onChange={(e) => setForm({ ...form, mobile: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>WhatsApp</Label><Input value={form.whatsapp || ""} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Email</Label><Input value={form.contact_email || ""} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></div>
                <div className="space-y-1.5 md:col-span-2"><Label>Website</Label><Input value={form.website || ""} onChange={(e) => setForm({ ...form, website: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>GST Number</Label><Input value={form.gst_number || ""} onChange={(e) => setForm({ ...form, gst_number: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>PAN Number</Label><Input value={form.pan_number || ""} onChange={(e) => setForm({ ...form, pan_number: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Default Commission Type</Label>
                  <Select value={form.commission_type} onValueChange={(v) => setForm({ ...form, commission_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{COMMISSION_TYPES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="address" className="space-y-3 pt-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5"><Label>Country</Label><Input value={form.country || ""} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>State</Label><Input value={form.state || ""} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>District</Label><Input value={form.district || ""} onChange={(e) => setForm({ ...form, district: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>City</Label><Input value={form.city || ""} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>PIN Code</Label><Input value={form.pincode || ""} onChange={(e) => setForm({ ...form, pincode: e.target.value })} /></div>
                <div className="space-y-1.5 md:col-span-2"><Label>Full Address</Label><Textarea value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              </div>
            </TabsContent>

            <TabsContent value="business" className="space-y-3 pt-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5"><Label>IRDA License Number</Label><Input value={form.irda_license_no || ""} onChange={(e) => setForm({ ...form, irda_license_no: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>License Expiry</Label><Input type="date" value={form.irda_expiry_date || ""} onChange={(e) => setForm({ ...form, irda_expiry_date: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Agreement Start</Label><Input type="date" value={form.agreement_start_date || ""} onChange={(e) => setForm({ ...form, agreement_start_date: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Agreement End</Label><Input type="date" value={form.agreement_end_date || ""} onChange={(e) => setForm({ ...form, agreement_end_date: e.target.value })} /></div>
                <div className="space-y-1.5 md:col-span-2"><Label>Notes</Label><Textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              </div>
            </TabsContent>

            <TabsContent value="products" className="space-y-3 pt-4">
              <AddProductRow products={products} onAdd={addProduct} />
              <div className="space-y-2">
                {vp.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div><Badge variant="outline" className="mr-2 capitalize">{p.product_category}</Badge><span className="font-medium">{p.product_name}</span></div>
                    <div className="flex items-center gap-2"><Badge>{p.default_commission_pct}%</Badge>
                      <Button size="icon" variant="ghost" onClick={() => removeProduct(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </div>
                ))}
                {!vp.length && <p className="py-4 text-center text-sm text-muted-foreground">No products mapped yet.</p>}
              </div>
            </TabsContent>

            <TabsContent value="commissions" className="space-y-3 pt-4">
              <AddCommissionRow onAdd={addCommission} />
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Category</TableHead><TableHead>Product</TableHead><TableHead>Type</TableHead><TableHead>Rate / Amount</TableHead><TableHead></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {vc.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="capitalize">{c.product_category}</TableCell>
                        <TableCell>{c.product_name || "—"}</TableCell>
                        <TableCell>{COMMISSION_TYPES.find((t) => t.value === c.commission_type)?.label}</TableCell>
                        <TableCell className="text-xs">
                          {c.commission_type === "percentage" && `${c.rate}%`}
                          {c.commission_type === "fixed" && `₹${c.fixed_amount}`}
                          {c.commission_type === "slab" && `${c.rate}% (₹${c.slab_min}-${c.slab_max || "∞"})`}
                          {c.commission_type === "od_tp_split" && `OD ${c.od_rate}% / TP ${c.tp_rate}%`}
                        </TableCell>
                        <TableCell className="text-right"><Button size="icon" variant="ghost" onClick={() => removeCommission(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                      </TableRow>
                    ))}
                    {!vc.length && <TableRow><TableCell colSpan={5} className="py-4 text-center text-muted-foreground">No commission rules yet.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="docs" className="space-y-3 pt-4">
              <AddDocRow onAdd={addDoc} />
              <div className="space-y-2">
                {vd.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">{d.doc_type.replace("_", " ")}</Badge>
                      <span>{d.doc_name || "Document"}</span>
                      {d.expiry_date && <span className="text-xs text-muted-foreground">exp {d.expiry_date}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      {d.file_url && <a className="text-xs text-primary underline" href={d.file_url} target="_blank" rel="noreferrer">Open</a>}
                      <Button size="icon" variant="ghost" onClick={() => removeDoc(d.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </div>
                ))}
                {!vd.length && <p className="py-4 text-center text-sm text-muted-foreground">No documents uploaded.</p>}
              </div>
            </TabsContent>

            <TabsContent value="rating" className="space-y-4 pt-4">
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  ["claim_support", "Claim Support"],
                  ["pricing", "Pricing"],
                  ["service", "Service"],
                  ["turnaround", "Turnaround Time"],
                ].map(([k, label]) => (
                  <div key={k} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <span className="text-sm">{label}</span>
                    <Stars value={myRating[k as string] || 0} onChange={(v) => setMyRating({ ...myRating, [k as string]: v })} />
                  </div>
                ))}
              </div>
              <Textarea placeholder="Comment (optional)" value={myRating.comment || ""} onChange={(e) => setMyRating({ ...myRating, comment: e.target.value })} />
              <Button variant="hero" size="sm" onClick={saveRating}>Save my rating</Button>

              {vr.length > 0 && (
                <div className="space-y-2 pt-4">
                  <h4 className="text-sm font-medium">All ratings ({vr.length})</h4>
                  {vr.map((r) => (
                    <div key={r.id} className="rounded-md border px-3 py-2 text-sm">
                      <div className="flex items-center justify-between"><Stars value={Math.round(r.overall || 0)} readOnly /><span className="text-xs text-muted-foreground">avg {Number(r.overall || 0).toFixed(1)}</span></div>
                      {r.comment && <p className="mt-1 text-xs text-muted-foreground">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
            <Button variant="hero" onClick={save}>{edit ? "Update" : "Create"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

const AddProductRow = ({ products, onAdd }: { products: any[]; onAdd: (cat: string, name: string, pct: number) => void }) => {
  const [cat, setCat] = useState("motor");
  const [name, setName] = useState("");
  const [pct, setPct] = useState(0);
  const filtered = products.filter((p) => p.category === cat);
  return (
    <div className="grid gap-2 md:grid-cols-[1fr_2fr_120px_auto]">
      <Select value={cat} onValueChange={(v) => { setCat(v); setName(""); }}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>{PRODUCT_CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={name} onValueChange={setName}>
        <SelectTrigger><SelectValue placeholder="Pick product…" /></SelectTrigger>
        <SelectContent>{filtered.map((p) => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}</SelectContent>
      </Select>
      <Input type="number" placeholder="% comm." value={pct} onChange={(e) => setPct(Number(e.target.value))} />
      <Button onClick={() => { if (name) { onAdd(cat, name, pct); setName(""); setPct(0); } }}><Plus className="h-4 w-4" /></Button>
    </div>
  );
};

const AddCommissionRow = ({ onAdd }: { onAdd: (p: any) => void }) => {
  const [f, setF] = useState<any>({ product_category: "motor", product_name: "", commission_type: "percentage", rate: 0, fixed_amount: 0, slab_min: 0, slab_max: null, od_rate: 0, tp_rate: 0 });
  return (
    <div className="grid gap-2 rounded-md border p-3 md:grid-cols-6">
      <Select value={f.product_category} onValueChange={(v) => setF({ ...f, product_category: v })}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>{PRODUCT_CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
      </Select>
      <Input placeholder="Product (opt)" value={f.product_name || ""} onChange={(e) => setF({ ...f, product_name: e.target.value })} />
      <Select value={f.commission_type} onValueChange={(v) => setF({ ...f, commission_type: v })}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>{COMMISSION_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
      </Select>
      {f.commission_type === "fixed" ? (
        <Input type="number" placeholder="Amount" value={f.fixed_amount} onChange={(e) => setF({ ...f, fixed_amount: Number(e.target.value) })} />
      ) : f.commission_type === "od_tp_split" ? (
        <>
          <Input type="number" placeholder="OD %" value={f.od_rate} onChange={(e) => setF({ ...f, od_rate: Number(e.target.value) })} />
          <Input type="number" placeholder="TP %" value={f.tp_rate} onChange={(e) => setF({ ...f, tp_rate: Number(e.target.value) })} />
        </>
      ) : (
        <Input type="number" placeholder="Rate %" value={f.rate} onChange={(e) => setF({ ...f, rate: Number(e.target.value) })} />
      )}
      {f.commission_type === "slab" && (
        <>
          <Input type="number" placeholder="Min ₹" value={f.slab_min} onChange={(e) => setF({ ...f, slab_min: Number(e.target.value) })} />
          <Input type="number" placeholder="Max ₹" value={f.slab_max ?? ""} onChange={(e) => setF({ ...f, slab_max: e.target.value ? Number(e.target.value) : null })} />
        </>
      )}
      <Button onClick={() => onAdd(f)} className="md:col-start-6"><Plus className="h-4 w-4" /> Add rule</Button>
    </div>
  );
};

const AddDocRow = ({ onAdd }: { onAdd: (p: any) => void }) => {
  const [f, setF] = useState<any>({ doc_type: "agreement", doc_name: "", file_url: "", expiry_date: "" });
  return (
    <div className="grid gap-2 md:grid-cols-[160px_1fr_1fr_160px_auto]">
      <Select value={f.doc_type} onValueChange={(v) => setF({ ...f, doc_type: v })}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>{DOC_TYPES.map((d) => <SelectItem key={d} value={d} className="capitalize">{d.replace("_", " ")}</SelectItem>)}</SelectContent>
      </Select>
      <Input placeholder="Name" value={f.doc_name} onChange={(e) => setF({ ...f, doc_name: e.target.value })} />
      <Input placeholder="File URL" value={f.file_url} onChange={(e) => setF({ ...f, file_url: e.target.value })} />
      <Input type="date" value={f.expiry_date} onChange={(e) => setF({ ...f, expiry_date: e.target.value })} />
      <Button onClick={() => { onAdd({ ...f, expiry_date: f.expiry_date || null }); setF({ doc_type: "agreement", doc_name: "", file_url: "", expiry_date: "" }); }}><Plus className="h-4 w-4" /></Button>
    </div>
  );
};
