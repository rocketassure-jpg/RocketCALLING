import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import {
  WORKFLOW_STAGES, SUB_CATEGORIES, ESCALATION_LEVELS, COMM_PARTIES,
  FOLLOWUP_CHANNELS, EXPENSE_CATEGORIES, stageStep, stageLabel, agingBucket, agingColor,
} from "./claims-utils";
import {
  FileText, Clock, Activity, MapPin, User, MessageCircle, Receipt, CalendarClock,
  Wallet, ShieldAlert, Plus, Trash2, Check, Hospital, Wrench,
} from "lucide-react";

const Progress = ({ step }: { step: number }) => {
  const pct = step ? Math.round((step / 10) * 100) : 0;
  const milestones = [
    { label: "Intimation", at: 1 }, { label: "Survey", at: 5 },
    { label: "Approval", at: 8 }, { label: "Settlement", at: 10 },
  ];
  return (
    <div className="space-y-2">
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-gradient-to-r from-primary to-accent transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        {milestones.map((m) => (
          <span key={m.label} className={step >= m.at ? "font-semibold text-primary" : ""}>
            {step >= m.at ? "✓ " : ""}{m.label}
          </span>
        ))}
      </div>
    </div>
  );
};

export const Claim360Dialog = ({ claimId, open, onOpenChange, onSaved }: {
  claimId: string | null; open: boolean; onOpenChange: (v: boolean) => void; onSaved: () => void;
}) => {
  const { companyId, user } = useAuth();
  const [claim, setClaim] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [followups, setFollowups] = useState<any[]>([]);
  const [comms, setComms] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [insurers, setInsurers] = useState<any[]>([]);
  const [newNote, setNewNote] = useState("");
  const [newFu, setNewFu] = useState<any>({ followup_date: new Date().toISOString().slice(0, 16), channel: "call", remarks: "", next_followup_date: "" });
  const [newComm, setNewComm] = useState<any>({ party_type: "customer", party_name: "", discussion: "", next_action: "" });
  const [newExp, setNewExp] = useState<any>({ category: "towing", amount: 0, notes: "", expense_date: new Date().toISOString().slice(0, 10) });
  const [newDoc, setNewDoc] = useState<any>({ document_name: "", file_url: "" });

  const reload = async () => {
    if (!claimId) return;
    const [c, n, f, cm, ex, dc, h, ins] = await Promise.all([
      supabase.from("claims").select("*").eq("id", claimId).single(),
      supabase.from("claim_notes").select("*").eq("claim_id", claimId).order("created_at", { ascending: false }),
      supabase.from("claim_followups").select("*").eq("claim_id", claimId).order("followup_date", { ascending: false }),
      supabase.from("claim_communications").select("*").eq("claim_id", claimId).order("comm_at", { ascending: false }),
      supabase.from("claim_expenses").select("*").eq("claim_id", claimId).order("expense_date", { ascending: false }),
      supabase.from("claim_documents").select("*").eq("claim_id", claimId),
      supabase.from("claim_status_history").select("*").eq("claim_id", claimId).order("created_at"),
      supabase.from("insurers").select("id,name").order("name"),
    ]);
    setClaim(c.data); setNotes(n.data ?? []); setFollowups(f.data ?? []);
    setComms(cm.data ?? []); setExpenses(ex.data ?? []); setDocs(dc.data ?? []);
    setHistory(h.data ?? []); setInsurers(ins.data ?? []);
  };

  useEffect(() => { if (open && claimId) reload(); }, [open, claimId]);

  const saveClaim = async (patch: any) => {
    if (!claim) return;
    const { error } = await supabase.from("claims").update(patch).eq("id", claim.id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Updated" });
    reload(); onSaved();
  };

  const addNote = async () => {
    if (!newNote.trim() || !claim || !companyId) return;
    await supabase.from("claim_notes").insert({ company_id: companyId, claim_id: claim.id, note: newNote, created_by: user?.id });
    setNewNote(""); reload();
  };
  const addFollowup = async () => {
    if (!claim || !companyId) return;
    await supabase.from("claim_followups").insert({ ...newFu, company_id: companyId, claim_id: claim.id, created_by: user?.id, next_followup_date: newFu.next_followup_date || null });
    setNewFu({ followup_date: new Date().toISOString().slice(0, 16), channel: "call", remarks: "", next_followup_date: "" }); reload();
  };
  const toggleFu = async (id: string, done: boolean) => { await supabase.from("claim_followups").update({ is_done: done }).eq("id", id); reload(); };
  const delFu = async (id: string) => { await supabase.from("claim_followups").delete().eq("id", id); reload(); };
  const addComm = async () => {
    if (!claim || !companyId || !newComm.discussion.trim()) return;
    await supabase.from("claim_communications").insert({ ...newComm, company_id: companyId, claim_id: claim.id, created_by: user?.id });
    setNewComm({ party_type: "customer", party_name: "", discussion: "", next_action: "" }); reload();
  };
  const addExp = async () => {
    if (!claim || !companyId) return;
    await supabase.from("claim_expenses").insert({ ...newExp, amount: Number(newExp.amount), company_id: companyId, claim_id: claim.id, created_by: user?.id });
    setNewExp({ category: "towing", amount: 0, notes: "", expense_date: new Date().toISOString().slice(0, 10) }); reload();
  };
  const delExp = async (id: string) => { await supabase.from("claim_expenses").delete().eq("id", id); reload(); };
  const addDoc = async () => {
    if (!claim || !companyId || !newDoc.document_name.trim()) return;
    await supabase.from("claim_documents").insert({ ...newDoc, company_id: companyId, claim_id: claim.id });
    setNewDoc({ document_name: "", file_url: "" }); reload();
  };
  const delDoc = async (id: string) => { await supabase.from("claim_documents").delete().eq("id", id); reload(); };

  if (!claim) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl"><DialogHeader><DialogTitle>Loading…</DialogTitle></DialogHeader></DialogContent>
      </Dialog>
    );
  }

  const step = stageStep(claim.status);
  const bucket = agingBucket(claim.intimation_date);
  const totalExp = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const subCats = SUB_CATEGORIES[claim.policy_type] || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span>Claim #{claim.claim_number}</span>
            <Badge variant="outline" className="capitalize">{claim.policy_type}</Badge>
            <Badge>{stageLabel(claim.status)}</Badge>
            <span className={`rounded px-2 py-0.5 text-xs ${agingColor(bucket)}`}>Aging: {bucket}</span>
            {claim.sla_breached && <Badge variant="destructive">SLA Breached</Badge>}
            <Badge variant="secondary">Escalation L{claim.escalation_level || 1}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Progress step={step} />
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Label className="text-xs">Stage:</Label>
            <Select value={claim.status} onValueChange={(v) => saveClaim({ status: v })}>
              <SelectTrigger className="h-8 w-56"><SelectValue /></SelectTrigger>
              <SelectContent>{WORKFLOW_STAGES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
            <Label className="ml-3 text-xs">Escalation:</Label>
            <Select value={String(claim.escalation_level || 1)} onValueChange={(v) => saveClaim({ escalation_level: Number(v) })}>
              <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
              <SelectContent>{ESCALATION_LEVELS.map((e) => <SelectItem key={e.level} value={String(e.level)}>{e.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="flex h-auto flex-wrap">
            <TabsTrigger value="overview"><FileText className="mr-1 h-4 w-4" /> Overview</TabsTrigger>
            <TabsTrigger value="timeline"><Clock className="mr-1 h-4 w-4" /> Timeline</TabsTrigger>
            <TabsTrigger value="docs"><FileText className="mr-1 h-4 w-4" /> Documents</TabsTrigger>
            <TabsTrigger value="surveyor"><Activity className="mr-1 h-4 w-4" /> Surveyor</TabsTrigger>
            <TabsTrigger value="venue">{claim.policy_type === "health" ? <Hospital className="mr-1 h-4 w-4" /> : <Wrench className="mr-1 h-4 w-4" />} {claim.policy_type === "health" ? "Hospital" : "Garage/Tow"}</TabsTrigger>
            <TabsTrigger value="auth"><User className="mr-1 h-4 w-4" /> Authorized Person</TabsTrigger>
            <TabsTrigger value="comm"><MessageCircle className="mr-1 h-4 w-4" /> Communication</TabsTrigger>
            <TabsTrigger value="expenses"><Receipt className="mr-1 h-4 w-4" /> Expenses</TabsTrigger>
            <TabsTrigger value="followups"><CalendarClock className="mr-1 h-4 w-4" /> Followups</TabsTrigger>
            <TabsTrigger value="settlement"><Wallet className="mr-1 h-4 w-4" /> Settlement</TabsTrigger>
          </TabsList>

          {/* OVERVIEW */}
          <TabsContent value="overview" className="space-y-3 pt-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Claim Number"><Input value={claim.claim_number || ""} onChange={(e) => setClaim({ ...claim, claim_number: e.target.value })} onBlur={() => saveClaim({ claim_number: claim.claim_number })} /></Field>
              <Field label="Claim Type"><Input value={claim.claim_type || ""} onChange={(e) => setClaim({ ...claim, claim_type: e.target.value })} onBlur={() => saveClaim({ claim_type: claim.claim_type })} /></Field>
              <Field label="Sub Category">
                <Select value={claim.sub_category || ""} onValueChange={(v) => saveClaim({ sub_category: v })}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>{subCats.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Insurance Company">
                <Select value={claim.insurer_id || ""} onValueChange={(v) => saveClaim({ insurer_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>{insurers.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Date of Loss"><Input type="date" value={claim.incident_date || ""} onChange={(e) => setClaim({ ...claim, incident_date: e.target.value })} onBlur={() => saveClaim({ incident_date: claim.incident_date || null })} /></Field>
              <Field label="Date of Intimation"><Input type="date" value={claim.intimation_date || ""} onChange={(e) => setClaim({ ...claim, intimation_date: e.target.value })} onBlur={() => saveClaim({ intimation_date: claim.intimation_date || null })} /></Field>
              <Field label="Claim Amount"><Input type="number" value={claim.claim_amount || 0} onChange={(e) => setClaim({ ...claim, claim_amount: e.target.value })} onBlur={() => saveClaim({ claim_amount: Number(claim.claim_amount) || 0 })} /></Field>
              <Field label="Remarks"><Textarea value={claim.remarks || ""} onChange={(e) => setClaim({ ...claim, remarks: e.target.value })} onBlur={() => saveClaim({ remarks: claim.remarks })} /></Field>
              <Field label="Escalation Notes" wide><Textarea value={claim.escalation_notes || ""} onChange={(e) => setClaim({ ...claim, escalation_notes: e.target.value })} onBlur={() => saveClaim({ escalation_notes: claim.escalation_notes })} /></Field>
            </div>
          </TabsContent>

          {/* TIMELINE */}
          <TabsContent value="timeline" className="space-y-3 pt-4">
            <div className="flex gap-2">
              <Input placeholder="Add a timeline note…" value={newNote} onChange={(e) => setNewNote(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addNote()} />
              <Button onClick={addNote}><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-2">
              {history.map((h) => (
                <div key={h.id} className="rounded-md border-l-2 border-blue-400 bg-blue-50/50 px-3 py-2 text-sm dark:bg-blue-950/20">
                  <div className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString()}</div>
                  <div className="font-medium">Status: {stageLabel(h.from_status || "—")} → {stageLabel(h.to_status)}</div>
                </div>
              ))}
              {notes.map((n) => (
                <div key={n.id} className="rounded-md border-l-2 border-primary bg-muted/30 px-3 py-2 text-sm">
                  <div className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</div>
                  <div>{n.note}</div>
                </div>
              ))}
              {!notes.length && !history.length && <p className="py-4 text-center text-sm text-muted-foreground">No activity yet.</p>}
            </div>
          </TabsContent>

          {/* DOCUMENTS */}
          <TabsContent value="docs" className="space-y-3 pt-4">
            <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
              <Input placeholder="Document name (Aadhaar, FIR, Estimate…)" value={newDoc.document_name} onChange={(e) => setNewDoc({ ...newDoc, document_name: e.target.value })} />
              <Input placeholder="File URL" value={newDoc.file_url} onChange={(e) => setNewDoc({ ...newDoc, file_url: e.target.value })} />
              <Button onClick={addDoc}><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-2">
              {docs.map((d) => (
                <div key={d.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" /><span>{d.document_name}</span></div>
                  <div className="flex items-center gap-2">
                    {d.file_url && <a href={d.file_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">Open</a>}
                    <Button size="icon" variant="ghost" onClick={() => delDoc(d.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              ))}
              {!docs.length && <p className="py-4 text-center text-sm text-muted-foreground">No documents.</p>}
            </div>
          </TabsContent>

          {/* SURVEYOR */}
          <TabsContent value="surveyor" className="space-y-3 pt-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Surveyor Name"><Input value={claim.surveyor_name || ""} onChange={(e) => setClaim({ ...claim, surveyor_name: e.target.value })} onBlur={() => saveClaim({ surveyor_name: claim.surveyor_name })} /></Field>
              <Field label="Mobile"><Input value={claim.surveyor_contact || ""} onChange={(e) => setClaim({ ...claim, surveyor_contact: e.target.value })} onBlur={() => saveClaim({ surveyor_contact: claim.surveyor_contact })} /></Field>
              <Field label="Email"><Input value={claim.surveyor_email || ""} onChange={(e) => setClaim({ ...claim, surveyor_email: e.target.value })} onBlur={() => saveClaim({ surveyor_email: claim.surveyor_email })} /></Field>
              <Field label="License Number"><Input value={claim.surveyor_license || ""} onChange={(e) => setClaim({ ...claim, surveyor_license: e.target.value })} onBlur={() => saveClaim({ surveyor_license: claim.surveyor_license })} /></Field>
              <Field label="Survey Date"><Input type="date" value={claim.survey_date || ""} onChange={(e) => setClaim({ ...claim, survey_date: e.target.value })} onBlur={() => saveClaim({ survey_date: claim.survey_date || null })} /></Field>
              <Field label="Survey Report URL"><Input value={claim.survey_report_url || ""} onChange={(e) => setClaim({ ...claim, survey_report_url: e.target.value })} onBlur={() => saveClaim({ survey_report_url: claim.survey_report_url })} /></Field>
              <Field label="Survey Remarks" wide><Textarea value={claim.survey_remarks || ""} onChange={(e) => setClaim({ ...claim, survey_remarks: e.target.value })} onBlur={() => saveClaim({ survey_remarks: claim.survey_remarks })} /></Field>
            </div>
          </TabsContent>

          {/* GARAGE / HOSPITAL */}
          <TabsContent value="venue" className="space-y-4 pt-4">
            {claim.policy_type === "health" ? (
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Hospital Name"><Input value={claim.hospital_name || ""} onChange={(e) => setClaim({ ...claim, hospital_name: e.target.value })} onBlur={() => saveClaim({ hospital_name: claim.hospital_name })} /></Field>
                <Field label="Doctor"><Input value={claim.hospital_doctor || ""} onChange={(e) => setClaim({ ...claim, hospital_doctor: e.target.value })} onBlur={() => saveClaim({ hospital_doctor: claim.hospital_doctor })} /></Field>
                <Field label="Admission Date"><Input type="date" value={claim.admission_date || ""} onChange={(e) => setClaim({ ...claim, admission_date: e.target.value })} onBlur={() => saveClaim({ admission_date: claim.admission_date || null })} /></Field>
                <Field label="Discharge Date"><Input type="date" value={claim.discharge_date || ""} onChange={(e) => setClaim({ ...claim, discharge_date: e.target.value })} onBlur={() => saveClaim({ discharge_date: claim.discharge_date || null })} /></Field>
                <Field label="Bill Amount"><Input type="number" value={claim.hospital_bill || 0} onChange={(e) => setClaim({ ...claim, hospital_bill: e.target.value })} onBlur={() => saveClaim({ hospital_bill: Number(claim.hospital_bill) || 0 })} /></Field>
              </div>
            ) : (
              <>
                <h4 className="text-sm font-semibold">Garage</h4>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Garage Name"><Input value={claim.garage_name || ""} onChange={(e) => setClaim({ ...claim, garage_name: e.target.value })} onBlur={() => saveClaim({ garage_name: claim.garage_name })} /></Field>
                  <Field label="Contact Person/Phone"><Input value={claim.garage_contact || ""} onChange={(e) => setClaim({ ...claim, garage_contact: e.target.value })} onBlur={() => saveClaim({ garage_contact: claim.garage_contact })} /></Field>
                  <Field label="Address" wide><Textarea value={claim.garage_address || ""} onChange={(e) => setClaim({ ...claim, garage_address: e.target.value })} onBlur={() => saveClaim({ garage_address: claim.garage_address })} /></Field>
                  <div className="flex items-center gap-2"><Checkbox checked={!!claim.garage_cashless} onCheckedChange={(v) => saveClaim({ garage_cashless: !!v })} /><Label>Cashless Available</Label></div>
                  <Field label="Estimate Amount"><Input type="number" value={claim.garage_estimate || 0} onChange={(e) => setClaim({ ...claim, garage_estimate: e.target.value })} onBlur={() => saveClaim({ garage_estimate: Number(claim.garage_estimate) || 0 })} /></Field>
                  <Field label="Final Bill"><Input type="number" value={claim.garage_final_bill || 0} onChange={(e) => setClaim({ ...claim, garage_final_bill: e.target.value })} onBlur={() => saveClaim({ garage_final_bill: Number(claim.garage_final_bill) || 0 })} /></Field>
                </div>
                <h4 className="pt-4 text-sm font-semibold">Towing</h4>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Towing Provider"><Input value={claim.towing_provider || ""} onChange={(e) => setClaim({ ...claim, towing_provider: e.target.value })} onBlur={() => saveClaim({ towing_provider: claim.towing_provider })} /></Field>
                  <Field label="Cost"><Input type="number" value={claim.towing_cost || 0} onChange={(e) => setClaim({ ...claim, towing_cost: e.target.value })} onBlur={() => saveClaim({ towing_cost: Number(claim.towing_cost) || 0 })} /></Field>
                  <Field label="Pickup Location"><Input value={claim.towing_pickup || ""} onChange={(e) => setClaim({ ...claim, towing_pickup: e.target.value })} onBlur={() => saveClaim({ towing_pickup: claim.towing_pickup })} /></Field>
                  <Field label="Drop Location"><Input value={claim.towing_drop || ""} onChange={(e) => setClaim({ ...claim, towing_drop: e.target.value })} onBlur={() => saveClaim({ towing_drop: claim.towing_drop })} /></Field>
                  <Field label="Invoice URL" wide><Input value={claim.towing_invoice_url || ""} onChange={(e) => setClaim({ ...claim, towing_invoice_url: e.target.value })} onBlur={() => saveClaim({ towing_invoice_url: claim.towing_invoice_url })} /></Field>
                </div>
              </>
            )}
          </TabsContent>

          {/* AUTHORIZED PERSON */}
          <TabsContent value="auth" className="space-y-3 pt-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Name"><Input value={claim.authorized_person_name || ""} onChange={(e) => setClaim({ ...claim, authorized_person_name: e.target.value })} onBlur={() => saveClaim({ authorized_person_name: claim.authorized_person_name })} /></Field>
              <Field label="Relation"><Input value={claim.authorized_relation || ""} onChange={(e) => setClaim({ ...claim, authorized_relation: e.target.value })} onBlur={() => saveClaim({ authorized_relation: claim.authorized_relation })} /></Field>
              <Field label="Mobile"><Input value={claim.authorized_mobile || ""} onChange={(e) => setClaim({ ...claim, authorized_mobile: e.target.value })} onBlur={() => saveClaim({ authorized_mobile: claim.authorized_mobile })} /></Field>
              <Field label="Email"><Input value={claim.authorized_email || ""} onChange={(e) => setClaim({ ...claim, authorized_email: e.target.value })} onBlur={() => saveClaim({ authorized_email: claim.authorized_email })} /></Field>
              <Field label="ID Proof URL"><Input value={claim.authorized_id_proof_url || ""} onChange={(e) => setClaim({ ...claim, authorized_id_proof_url: e.target.value })} onBlur={() => saveClaim({ authorized_id_proof_url: claim.authorized_id_proof_url })} /></Field>
              <Field label="Authorization Letter URL"><Input value={claim.authorization_letter_url || ""} onChange={(e) => setClaim({ ...claim, authorization_letter_url: e.target.value })} onBlur={() => saveClaim({ authorization_letter_url: claim.authorization_letter_url })} /></Field>
            </div>
          </TabsContent>

          {/* COMMUNICATION */}
          <TabsContent value="comm" className="space-y-3 pt-4">
            <div className="grid gap-2 rounded-md border p-3 md:grid-cols-5">
              <Select value={newComm.party_type} onValueChange={(v) => setNewComm({ ...newComm, party_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{COMM_PARTIES.map((p) => <SelectItem key={p} value={p} className="capitalize">{p.replace("_", " ")}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder="Person name" value={newComm.party_name} onChange={(e) => setNewComm({ ...newComm, party_name: e.target.value })} />
              <Input placeholder="Discussion" value={newComm.discussion} onChange={(e) => setNewComm({ ...newComm, discussion: e.target.value })} className="md:col-span-2" />
              <Input placeholder="Next action" value={newComm.next_action} onChange={(e) => setNewComm({ ...newComm, next_action: e.target.value })} />
              <Button onClick={addComm} className="md:col-span-5"><Plus className="h-4 w-4" /> Log conversation</Button>
            </div>
            <div className="space-y-2">
              {comms.map((c) => (
                <div key={c.id} className="rounded-md border px-3 py-2 text-sm">
                  <div className="flex justify-between text-xs text-muted-foreground"><span><Badge variant="outline" className="capitalize mr-1">{c.party_type.replace("_", " ")}</Badge>{c.party_name}</span><span>{new Date(c.comm_at).toLocaleString()}</span></div>
                  <div className="mt-1">{c.discussion}</div>
                  {c.next_action && <div className="mt-1 text-xs text-primary">Next: {c.next_action}</div>}
                </div>
              ))}
              {!comms.length && <p className="py-4 text-center text-sm text-muted-foreground">No communications logged.</p>}
            </div>
          </TabsContent>

          {/* EXPENSES */}
          <TabsContent value="expenses" className="space-y-3 pt-4">
            <div className="grid gap-2 rounded-md border p-3 md:grid-cols-5">
              <Select value={newExp.category} onValueChange={(v) => setNewExp({ ...newExp, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c.replace("_", " ")}</SelectItem>)}</SelectContent>
              </Select>
              <Input type="number" placeholder="Amount" value={newExp.amount} onChange={(e) => setNewExp({ ...newExp, amount: e.target.value })} />
              <Input type="date" value={newExp.expense_date} onChange={(e) => setNewExp({ ...newExp, expense_date: e.target.value })} />
              <Input placeholder="Notes" value={newExp.notes} onChange={(e) => setNewExp({ ...newExp, notes: e.target.value })} />
              <Button onClick={addExp}><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="rounded-md border p-3 text-sm">
              <div className="mb-2 flex justify-between font-semibold"><span>Total Spent</span><span>₹{totalExp.toLocaleString()}</span></div>
              {expenses.map((e) => (
                <div key={e.id} className="flex items-center justify-between border-t py-2">
                  <div><Badge variant="outline" className="capitalize mr-2">{e.category.replace("_", " ")}</Badge>{e.notes}</div>
                  <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">{e.expense_date}</span><span className="font-medium">₹{Number(e.amount).toLocaleString()}</span>
                    <Button size="icon" variant="ghost" onClick={() => delExp(e.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              ))}
              {!expenses.length && <p className="py-4 text-center text-muted-foreground">No expenses tracked.</p>}
            </div>
          </TabsContent>

          {/* FOLLOWUPS */}
          <TabsContent value="followups" className="space-y-3 pt-4">
            <div className="grid gap-2 rounded-md border p-3 md:grid-cols-5">
              <Input type="datetime-local" value={newFu.followup_date} onChange={(e) => setNewFu({ ...newFu, followup_date: e.target.value })} />
              <Select value={newFu.channel} onValueChange={(v) => setNewFu({ ...newFu, channel: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FOLLOWUP_CHANNELS.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder="Remarks" value={newFu.remarks} onChange={(e) => setNewFu({ ...newFu, remarks: e.target.value })} className="md:col-span-2" />
              <Input type="datetime-local" placeholder="Next" value={newFu.next_followup_date} onChange={(e) => setNewFu({ ...newFu, next_followup_date: e.target.value })} />
              <Button onClick={addFollowup} className="md:col-span-5"><Plus className="h-4 w-4" /> Schedule followup</Button>
            </div>
            <div className="space-y-2">
              {followups.map((f) => (
                <div key={f.id} className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${f.is_done ? "opacity-60" : ""}`}>
                  <div className="flex items-center gap-3">
                    <Checkbox checked={f.is_done} onCheckedChange={(v) => toggleFu(f.id, !!v)} />
                    <Badge variant="outline" className="capitalize">{f.channel}</Badge>
                    <div>
                      <div className="font-medium">{new Date(f.followup_date).toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">{f.remarks}{f.next_followup_date && ` · next ${new Date(f.next_followup_date).toLocaleString()}`}</div>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => delFu(f.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              ))}
              {!followups.length && <p className="py-4 text-center text-sm text-muted-foreground">No followups scheduled.</p>}
            </div>
          </TabsContent>

          {/* SETTLEMENT */}
          <TabsContent value="settlement" className="space-y-3 pt-4">
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Claim Amount"><Input type="number" value={claim.claim_amount || 0} onChange={(e) => setClaim({ ...claim, claim_amount: e.target.value })} onBlur={() => saveClaim({ claim_amount: Number(claim.claim_amount) || 0 })} /></Field>
              <Field label="Approved Amount"><Input type="number" value={claim.approved_amount || 0} onChange={(e) => setClaim({ ...claim, approved_amount: e.target.value })} onBlur={() => saveClaim({ approved_amount: Number(claim.approved_amount) || 0 })} /></Field>
              <Field label="Settled Amount"><Input type="number" value={claim.settled_amount || 0} onChange={(e) => setClaim({ ...claim, settled_amount: e.target.value })} onBlur={() => saveClaim({ settled_amount: Number(claim.settled_amount) || 0 })} /></Field>
            </div>
            <div className="grid gap-3 rounded-md border p-3 md:grid-cols-3 text-sm">
              <div><div className="text-xs text-muted-foreground">Claimed</div><div className="text-lg font-bold">₹{Number(claim.claim_amount || 0).toLocaleString()}</div></div>
              <div><div className="text-xs text-muted-foreground">Approved</div><div className="text-lg font-bold text-amber-600">₹{Number(claim.approved_amount || 0).toLocaleString()}</div></div>
              <div><div className="text-xs text-muted-foreground">Settled</div><div className="text-lg font-bold text-emerald-600">₹{Number(claim.settled_amount || 0).toLocaleString()}</div></div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

const Field = ({ label, children, wide }: { label: string; children: any; wide?: boolean }) => (
  <div className={`space-y-1.5 ${wide ? "md:col-span-2" : ""}`}>
    <Label className="text-xs">{label}</Label>
    {children}
  </div>
);
