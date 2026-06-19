import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Product = any;

const CATEGORIES = [
  "motor","health","life","fire","marine","shopkeeper","liability","rto","finance"
];

export const ProductCatalogMaster = () => {
  const { companyId } = useAuth();
  const [rows, setRows] = useState<Product[]>([]);
  const [tab, setTab] = useState<string>("motor");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Product | null>(null);
  const [form, setForm] = useState<any>({ name: "", category: "motor", is_active: true });

  const load = async () => {
    const { data } = await supabase.from("product_catalog").select("*").order("name");
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name?.trim() || !companyId) return;
    if (edit) {
      const { error } = await supabase.from("product_catalog").update(form).eq("id", edit.id);
      if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    } else {
      const { error } = await supabase.from("product_catalog").insert({ ...form, company_id: companyId });
      if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    }
    setOpen(false); setEdit(null); setForm({ name: "", category: tab, is_active: true }); load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    await supabase.from("product_catalog").delete().eq("id", id); load();
  };

  const openAdd = () => { setEdit(null); setForm({ name: "", category: tab, is_active: true }); setOpen(true); };
  const openEdit = (p: Product) => { setEdit(p); setForm(p); setOpen(true); };

  const filtered = rows.filter((r) => r.category === tab);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Product Catalog</CardTitle>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEdit(null); }}>
            <DialogTrigger asChild><Button variant="hero" size="sm" onClick={openAdd}><Plus className="h-4 w-4" /> Add Product</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{edit ? "Edit" : "Add"} Product</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div className="space-y-1.5"><Label>Category *</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="flex items-center gap-2"><Switch checked={!!form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
              </div>
              <Button variant="hero" onClick={save}>{edit ? "Update" : "Create"}</Button>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setTab(c)}
              className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors ${tab === c ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"}`}>
              {c} ({rows.filter((r) => r.category === c).length})
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {filtered.map((p) => (
            <Badge key={p.id} variant={p.is_active ? "secondary" : "outline"} className="gap-2 px-3 py-1.5 text-sm">
              {p.name}
              <button onClick={() => openEdit(p)} aria-label="Edit"><Pencil className="h-3 w-3 text-muted-foreground" /></button>
              <button onClick={() => del(p.id)} aria-label="Delete"><Trash2 className="h-3 w-3 text-destructive" /></button>
            </Badge>
          ))}
          {!filtered.length && <p className="text-sm text-muted-foreground">No products in this category yet.</p>}
        </div>
      </CardContent>
    </Card>
  );
};
