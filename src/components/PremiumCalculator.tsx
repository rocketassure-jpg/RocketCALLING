import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Calculator, Download, MessageCircle, RotateCcw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* ────────── IRDAI 2026 reference rates (configurable) ────────── */
const TP_RATES = {
  PrivateCar: [
    { max: 1000, amt: 2094 },
    { max: 1500, amt: 3416 },
    { max: 99999, amt: 7897 },
  ],
  TwoWheeler: [
    { max: 75, amt: 538 },
    { max: 150, amt: 714 },
    { max: 350, amt: 1366 },
    { max: 99999, amt: 2804 },
  ],
  GCV: [{ max: 99999, amt: 14390 }],
  PCV: [{ max: 99999, amt: 8510 }],
  SchoolBus: [{ max: 99999, amt: 12500 }],
  Tractor: [{ max: 99999, amt: 1075 }],
};

// IDV depreciation as per IRDAI Motor Tariff
const depreciationByAge = (years: number) => {
  if (years <= 0.5) return 0.05;
  if (years <= 1) return 0.15;
  if (years <= 2) return 0.20;
  if (years <= 3) return 0.30;
  if (years <= 4) return 0.40;
  if (years <= 5) return 0.50;
  return 0.55;
};

const odRateByVehicle = (type: string, age: number) => {
  let base = 0.0285; // 2.85%
  if (type === "TwoWheeler") base = 0.0175;
  if (type === "GCV") base = 0.045;
  if (type === "PCV" || type === "SchoolBus") base = 0.038;
  if (type === "Tractor") base = 0.012;
  if (age > 5) base += 0.005;
  if (age > 10) base += 0.005;
  return base;
};

const ADDONS = [
  { id: "zero_dep", label: "Zero Depreciation", rate: 0.15 },
  { id: "engine", label: "Engine Protect", rate: 0.05 },
  { id: "rti", label: "Return to Invoice", rate: 0.10 },
  { id: "consumables", label: "Consumables", rate: 0.03 },
  { id: "rsa", label: "Roadside Assistance", rate: 0.005 },
];

const NCB_OPTIONS = [0, 20, 25, 35, 45, 50];

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

const initial = {
  customerName: "",
  customerPhone: "",
  vehicleType: "PrivateCar",
  make: "",
  model: "",
  variant: "",
  fuelType: "Petrol",
  cc: 1200,
  mfgYear: new Date().getFullYear() - 2,
  exShowroom: 700000,
  policyType: "Comprehensive",
  policyTerm: 1,
  ncb: 20,
  claimLastYear: false,
  zone: "B",
  voluntaryDeductible: 0,
  antiTheft: false,
  companyDiscount: 0,
  brokerName: "Shubham Gurjar (Oriental)",
  customerDiscount: 0,
  addons: [] as string[],
};

export const PremiumCalculator = ({ embedded = false }: { embedded?: boolean }) => {
  const [f, setF] = useState(initial);
  const set = (k: keyof typeof initial, v: any) => setF((p) => ({ ...p, [k]: v }));
  const toggleAddon = (id: string) =>
    setF((p) => ({ ...p, addons: p.addons.includes(id) ? p.addons.filter((x) => x !== id) : [...p.addons, id] }));

  const calc = useMemo(() => {
    const age = Math.max(0, new Date().getFullYear() - Number(f.mfgYear));
    const dep = depreciationByAge(age);
    const idv = Math.max(0, Number(f.exShowroom) * (1 - dep));

    const odRate = odRateByVehicle(f.vehicleType, age);
    const baseOD = idv * odRate;

    // TP premium lookup
    const tpTable = (TP_RATES as any)[f.vehicleType] ?? TP_RATES.PrivateCar;
    const slab = tpTable.find((s: any) => Number(f.cc) <= s.max) ?? tpTable[tpTable.length - 1];
    const tp = f.policyType === "ThirdParty" ? slab.amt : f.policyType === "Comprehensive" ? slab.amt : slab.amt;

    // Discounts on OD
    const ncbPct = f.claimLastYear ? 0 : Number(f.ncb);
    const ncbDisc = (f.policyType === "ThirdParty" ? 0 : baseOD * (ncbPct / 100));
    const afterNcb = baseOD - ncbDisc;
    const compDisc = afterNcb * (Number(f.companyDiscount) / 100);
    const vdMap: Record<number, number> = { 0: 0, 2500: 750, 5000: 1500, 7500: 2250 };
    const vdDisc = f.policyType === "ThirdParty" ? 0 : (vdMap[Number(f.voluntaryDeductible)] || 0);
    const atDisc = f.antiTheft ? Math.min(500, baseOD * 0.025) : 0;
    const netOD = f.policyType === "ThirdParty" ? 0 : Math.max(0, baseOD - ncbDisc - compDisc - vdDisc - atDisc);

    // Add-ons (only if comprehensive)
    const addonItems = f.policyType === "ThirdParty" ? [] : ADDONS.filter((a) => f.addons.includes(a.id));
    const addonTotal = addonItems.reduce((s, a) => s + idv * a.rate * 0.01 * 100 * 0.01, 0); // simplified: rate% of IDV/year
    const addonsCalc = addonItems.map((a) => ({ ...a, amt: idv * a.rate * 0.01 }));
    const addonsSum = addonsCalc.reduce((s, a) => s + a.amt, 0);

    const netPremium = netOD + tp + addonsSum;
    const gst = netPremium * 0.18;
    const grossPremium = netPremium + gst;

    // Broker commission (sample grid)
    const odPayout = 0.275; // 27.5%
    const tpPayout = 0.0; // TP usually 0 post Sept 2018
    const addonPayout = 0.20;
    const odCommission = netOD * odPayout;
    const tpCommission = tp * tpPayout;
    const addonCommission = addonsSum * addonPayout;
    const grossCommission = odCommission + tpCommission + addonCommission;

    const customerPays = Math.max(0, grossPremium - Number(f.customerDiscount));
    const netInPocket = Math.max(0, grossCommission - Number(f.customerDiscount));
    const margin = netPremium > 0 ? (netInPocket / netPremium) * 100 : 0;

    return {
      age, dep, idv, odRate, baseOD, ncbPct, ncbDisc, compDisc, vdDisc, atDisc, netOD,
      tp, addonsCalc, addonsSum, netPremium, gst, grossPremium,
      odCommission, tpCommission, addonCommission, grossCommission, customerPays, netInPocket, margin,
    };
  }, [f]);

  const downloadPDF = () => {
    const doc = new jsPDF();
    // jsPDF default font (Helvetica) doesn't support ₹ glyph — use "Rs." for PDF
    const inrPdf = (n: number) => `Rs. ${Math.round(n).toLocaleString("en-IN")}`;
    doc.setFontSize(16);
    doc.text("Motor Insurance Premium Quote", 14, 16);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Date: ${new Date().toLocaleDateString("en-IN")}    IRDAI 2026 | GST 18%`, 14, 22);

    autoTable(doc, {
      startY: 28,
      head: [["Customer Details", ""]],
      body: [
        ["Name", f.customerName || "-"],
        ["Phone", f.customerPhone || "-"],
        ["Vehicle", `${f.make} ${f.model} ${f.variant}`],
        ["Type / Fuel / CC", `${f.vehicleType} / ${f.fuelType} / ${f.cc}`],
        ["Mfg Year / Age", `${f.mfgYear} (${calc.age} yrs)`],
        ["Ex-Showroom", inrPdf(f.exShowroom)],
        ["Policy Type / Term", `${f.policyType} / ${f.policyTerm}Y`],
      ],
      theme: "striped",
      headStyles: { fillColor: [37, 99, 235] },
    });

    autoTable(doc, {
      head: [["Premium Breakdown", "Amount"]],
      body: [
        ["IDV (after depreciation " + (calc.dep * 100).toFixed(0) + "%)", inrPdf(calc.idv)],
        ["Base OD Premium (" + (calc.odRate * 100).toFixed(2) + "%)", inrPdf(calc.baseOD)],
        [`NCB Discount (${calc.ncbPct}%)`, "- " + inrPdf(calc.ncbDisc)],
        [`Company Discount (${f.companyDiscount}%)`, "- " + inrPdf(calc.compDisc)],
        ["Voluntary Deductible Discount", "- " + inrPdf(calc.vdDisc)],
        ["Anti-Theft Discount", "- " + inrPdf(calc.atDisc)],
        ["Net OD Premium", inrPdf(calc.netOD)],
        ["Third Party (IRDAI)", inrPdf(calc.tp)],
        ["Add-ons Total", inrPdf(calc.addonsSum)],
        ["Net Premium", inrPdf(calc.netPremium)],
        ["GST 18%", inrPdf(calc.gst)],
        ["GROSS PREMIUM", inrPdf(calc.grossPremium)],
        ["Customer Discount", "- " + inrPdf(f.customerDiscount)],
        ["TOTAL CUSTOMER PAYS", inrPdf(calc.customerPays)],
      ],
      theme: "grid",
      headStyles: { fillColor: [37, 99, 235] },
    });

    if (calc.addonsCalc.length) {
      autoTable(doc, {
        head: [["Add-on", "Amount"]],
        body: calc.addonsCalc.map((a) => [a.label, inrPdf(a.amt)]),
        theme: "striped",
        headStyles: { fillColor: [16, 185, 129] },
      });
    }

    doc.setFontSize(9);
    doc.setTextColor(120);
    const pageH = doc.internal.pageSize.getHeight();
    doc.text("Rocket Services • Disclaimer: Indicative quote as per IRDAI 2026 reference rates. Final premium may vary.", 14, pageH - 8);

    const fname = `Quote_${(f.customerName || "Customer").replace(/\s+/g, "_")}_${Date.now()}.pdf`;
    doc.save(fname);
    toast({ title: "PDF download ho gaya ✅", description: fname });
  };

  const shareWhatsApp = () => {
    if (!f.customerPhone) {
      toast({ title: "Customer phone daalo", variant: "destructive" });
      return;
    }
    const text =
      `*Motor Insurance Quote*\n` +
      `${f.make} ${f.model} ${f.variant} (${f.mfgYear})\n` +
      `IDV: ${inr(calc.idv)}\n` +
      `Net Premium: ${inr(calc.netPremium)}\n` +
      `GST: ${inr(calc.gst)}\n` +
      `*Total: ${inr(calc.customerPays)}*\n\n— Rocket Services`;
    const phone = f.customerPhone.replace(/\D/g, "");
    window.open(`https://wa.me/${phone.startsWith("91") ? phone : "91" + phone}?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className={embedded ? "" : "space-y-4"}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Motor Insurance Premium Calculator</h2>
          <Badge variant="secondary">IRDAI 2026</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setF(initial)}><RotateCcw className="h-4 w-4" /> Reset</Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* INPUTS */}
        <Card>
          <CardHeader><CardTitle className="text-base">Vehicle & Customer Details</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Field label="Customer Name"><Input value={f.customerName} onChange={(e) => set("customerName", e.target.value)} /></Field>
            <Field label="Phone"><Input value={f.customerPhone} onChange={(e) => set("customerPhone", e.target.value)} placeholder="98xxxxxxxx" /></Field>

            <Field label="Vehicle Type">
              <Select value={f.vehicleType} onValueChange={(v) => set("vehicleType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PrivateCar">Private Car</SelectItem>
                  <SelectItem value="TwoWheeler">Two Wheeler</SelectItem>
                  <SelectItem value="GCV">GCV (Goods)</SelectItem>
                  <SelectItem value="PCV">PCV (Passenger)</SelectItem>
                  <SelectItem value="SchoolBus">School Bus</SelectItem>
                  <SelectItem value="Tractor">Tractor</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Fuel Type">
              <Select value={f.fuelType} onValueChange={(v) => set("fuelType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Petrol", "Diesel", "CNG", "EV"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Make"><Input value={f.make} onChange={(e) => set("make", e.target.value)} placeholder="Maruti" /></Field>
            <Field label="Model"><Input value={f.model} onChange={(e) => set("model", e.target.value)} placeholder="Swift" /></Field>
            <Field label="Variant"><Input value={f.variant} onChange={(e) => set("variant", e.target.value)} placeholder="VXI" /></Field>
            <Field label="Engine CC / GVW"><Input type="number" value={f.cc} onChange={(e) => set("cc", Number(e.target.value))} /></Field>

            <Field label="Mfg Year"><Input type="number" value={f.mfgYear} onChange={(e) => set("mfgYear", Number(e.target.value))} /></Field>
            <Field label="Ex-Showroom (₹)"><Input type="number" value={f.exShowroom} onChange={(e) => set("exShowroom", Number(e.target.value))} /></Field>

            <Field label="Policy Type">
              <Select value={f.policyType} onValueChange={(v) => set("policyType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Comprehensive">Comprehensive</SelectItem>
                  <SelectItem value="ThirdParty">Third Party Only</SelectItem>
                  <SelectItem value="Package">Package (1+3 / 1+5)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Policy Term (Years)">
              <Select value={String(f.policyTerm)} onValueChange={(v) => set("policyTerm", Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{[1, 3, 5].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
              </Select>
            </Field>

            <Field label="Previous NCB (%)">
              <Select value={String(f.ncb)} onValueChange={(v) => set("ncb", Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{NCB_OPTIONS.map((n) => <SelectItem key={n} value={String(n)}>{n}%</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Voluntary Deductible (₹)">
              <Select value={String(f.voluntaryDeductible)} onValueChange={(v) => set("voluntaryDeductible", Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{[0, 2500, 5000, 7500].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
              </Select>
            </Field>

            <Field label="Company OD Discount (%)"><Input type="number" value={f.companyDiscount} onChange={(e) => set("companyDiscount", Number(e.target.value))} /></Field>
            <Field label="Customer Discount Offered (₹)"><Input type="number" value={f.customerDiscount} onChange={(e) => set("customerDiscount", Number(e.target.value))} /></Field>

            <div className="flex items-center gap-2 sm:col-span-2">
              <Checkbox id="anti" checked={f.antiTheft} onCheckedChange={(v) => set("antiTheft", !!v)} />
              <Label htmlFor="anti" className="cursor-pointer">Anti-Theft Device (ARAI) — 2.5% OD discount</Label>
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <Checkbox id="claim" checked={f.claimLastYear} onCheckedChange={(v) => set("claimLastYear", !!v)} />
              <Label htmlFor="claim" className="cursor-pointer">Claim in last year (NCB resets to 0)</Label>
            </div>

            <div className="sm:col-span-2">
              <Label className="mb-2 block">Add-ons</Label>
              <div className="flex flex-wrap gap-3">
                {ADDONS.map((a) => (
                  <label key={a.id} className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
                    <Checkbox checked={f.addons.includes(a.id)} onCheckedChange={() => toggleAddon(a.id)} />
                    {a.label}
                  </label>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* OUTPUT */}
        <Card>
          <CardHeader><CardTitle className="text-base">Premium Breakdown</CardTitle></CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <Row label={`IDV (Depreciation ${(calc.dep * 100).toFixed(0)}%)`} value={inr(calc.idv)} />
            <Row label={`Base OD (${(calc.odRate * 100).toFixed(2)}%)`} value={inr(calc.baseOD)} />
            <Row label={`NCB Discount (${calc.ncbPct}%)`} value={"- " + inr(calc.ncbDisc)} muted />
            <Row label={`Company OD Discount`} value={"- " + inr(calc.compDisc)} muted />
            <Row label={`Voluntary Deductible`} value={"- " + inr(calc.vdDisc)} muted />
            <Row label={`Anti-Theft Discount`} value={"- " + inr(calc.atDisc)} muted />
            <Row label="Net OD Premium" value={inr(calc.netOD)} bold />
            <Row label="Third Party (IRDAI)" value={inr(calc.tp)} />
            {calc.addonsCalc.map((a) => <Row key={a.id} label={`+ ${a.label}`} value={inr(a.amt)} muted />)}
            <Row label="Add-ons Total" value={inr(calc.addonsSum)} />
            <div className="my-2 border-t" />
            <Row label="Net Premium" value={inr(calc.netPremium)} bold />
            <Row label="GST 18%" value={inr(calc.gst)} muted />
            <Row label="Gross Premium" value={inr(calc.grossPremium)} bold />
            <Row label="Customer Discount" value={"- " + inr(f.customerDiscount)} muted />
            <div className="mt-2 rounded-md bg-primary/10 p-3">
              <Row label="TOTAL CUSTOMER PAYS" value={inr(calc.customerPays)} bold large />
            </div>

            <div className="mt-3 rounded-md border bg-muted/30 p-3 text-xs">
              <div className="font-semibold text-foreground">Broker / Internal</div>
              <Row label="Gross Commission" value={inr(calc.grossCommission)} />
              <Row label="Net In Pocket" value={inr(calc.netInPocket)} />
              <Row label="Margin %" value={calc.margin.toFixed(2) + "%"} />
            </div>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Button variant="hero" className="flex-1" onClick={downloadPDF}><Download className="h-4 w-4" /> Download PDF</Button>
              <Button variant="success" className="flex-1" onClick={shareWhatsApp}><MessageCircle className="h-4 w-4" /> Share WhatsApp</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-xs">{label}</Label>
    {children}
  </div>
);

const Row = ({ label, value, muted, bold, large }: { label: string; value: string; muted?: boolean; bold?: boolean; large?: boolean }) => (
  <div className={`flex items-center justify-between ${muted ? "text-muted-foreground" : ""}`}>
    <span className={bold ? "font-semibold" : ""}>{label}</span>
    <span className={`${bold ? "font-bold" : ""} ${large ? "text-lg text-primary" : ""}`}>{value}</span>
  </div>
);

export default PremiumCalculator;
