// Constants shared across the claims module
export const WORKFLOW_STAGES = [
  { value: "intimated", label: "Claim Intimated", step: 1 },
  { value: "documents_pending", label: "Documents Pending", step: 2 },
  { value: "documents_submitted", label: "Documents Submitted", step: 3 },
  { value: "surveyor_assigned", label: "Surveyor Assigned", step: 4 },
  { value: "survey_completed", label: "Survey Completed", step: 5 },
  { value: "under_assessment", label: "Under Assessment", step: 6 },
  { value: "approval_pending", label: "Approval Pending", step: 7 },
  { value: "approved", label: "Approved", step: 8 },
  { value: "payment_processing", label: "Payment Processing", step: 9 },
  { value: "settled", label: "Settled", step: 10 },
  { value: "rejected", label: "Rejected", step: 0 },
  { value: "closed", label: "Closed", step: 0 },
];

export const SUB_CATEGORIES: Record<string, string[]> = {
  motor: ["Own Damage", "Third Party", "Theft", "Total Loss", "Windshield", "Engine Protection", "Roadside Assistance"],
  health: ["Cashless", "Reimbursement", "Critical Illness", "Accidental Hospitalization"],
  life: ["Death Claim", "Maturity Claim", "Survival Benefit", "Surrender Claim"],
  fire: ["Fire Damage", "Short Circuit", "Natural Disaster", "Property Damage"],
  marine: ["Transit Damage", "Cargo Loss", "Cargo Theft"],
};

export const POLICY_TYPES = ["motor", "health", "life", "fire", "marine"];

export const ESCALATION_LEVELS = [
  { level: 1, label: "L1 — Agent" },
  { level: 2, label: "L2 — Branch Manager" },
  { level: 3, label: "L3 — Insurance Company" },
  { level: 4, label: "L4 — Grievance Officer" },
];

export const COMM_PARTIES = ["customer", "surveyor", "insurance_company", "garage", "hospital", "authorized_person"];
export const FOLLOWUP_CHANNELS = ["call", "whatsapp", "email", "visit"];
export const EXPENSE_CATEGORIES = ["towing", "courier", "survey_fee", "legal", "misc"];

export const stageStep = (s: string) => WORKFLOW_STAGES.find((w) => w.value === s)?.step ?? 1;
export const stageLabel = (s: string) => WORKFLOW_STAGES.find((w) => w.value === s)?.label ?? s;

export const agingBucket = (intimationDate: string | null): string => {
  if (!intimationDate) return "—";
  const days = Math.floor((Date.now() - new Date(intimationDate).getTime()) / 86400000);
  if (days <= 7) return "0-7 Days";
  if (days <= 15) return "8-15 Days";
  if (days <= 30) return "16-30 Days";
  if (days <= 60) return "31-60 Days";
  return "60+ Days";
};

export const agingColor = (bucket: string): string => {
  if (bucket === "0-7 Days") return "bg-green-100 text-green-800";
  if (bucket === "8-15 Days") return "bg-blue-100 text-blue-800";
  if (bucket === "16-30 Days") return "bg-amber-100 text-amber-800";
  if (bucket === "31-60 Days") return "bg-orange-100 text-orange-800";
  if (bucket === "60+ Days") return "bg-red-100 text-red-800";
  return "bg-muted text-muted-foreground";
};
