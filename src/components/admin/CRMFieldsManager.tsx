import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";

type Field = { id: string; name: string; field_type: string; mandatory: boolean; sort_order: number };

export const CRMFieldsManager = () => {
  const [fields, setFields] = useState<Field[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState("text");
  const [mandatory, setMandatory] = useState(false);

  const load = () => supabase.from("crm_fields").select("*").order("sort_order").then(({ data }) => setFields((data as any) ?? []));
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!name.trim()) return;
    const { error } = await supabase.from("crm_fields").insert({ name: name.trim(), field_type: type, mandatory, sort_order: fields.length });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    setName(""); setType("text"); setMandatory(false); load();
  };

  const del = async (id: string) => { await supabase.from("crm_fields").delete().eq("id", id); load(); };

  const updateField = async (id: string, patch: Partial<Field>) => {
    await supabase.from("crm_fields").update(patch).eq("id", id);
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">CRM Fields</h1>
        <p className="text-sm text-muted-foreground">Define custom fields that auto-render in agent forms</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Add new field</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <Input placeholder="Field name" value={name} onChange={(e) => setName(e.target.value)} />
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="number">Number</SelectItem>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="select">Select</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2"><Switch checked={mandatory} onCheckedChange={setMandatory} /><span className="text-sm">Mandatory</span></div>
          <Button variant="hero" onClick={add}><Plus className="h-4 w-4" /> Add Field</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Fields ({fields.length})</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Field Name</th>
                <th className="px-4 py-3 text-left font-medium">Property (Type)</th>
                <th className="px-4 py-3 text-center font-medium">Mandatory</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {fields.map((f) => (
                <tr key={f.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{f.name}</td>
                  <td className="px-4 py-3">
                    <Select value={f.field_type} onValueChange={(v) => updateField(f.id, { field_type: v })}>
                      <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="select">Select</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Switch checked={f.mandatory} onCheckedChange={(v) => updateField(f.id, { mandatory: v })} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="icon" onClick={() => del(f.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </td>
                </tr>
              ))}
              {!fields.length && <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No fields yet. Add one above.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};
