## Aapke 8 requests ko 4 phases me todhta hoon

### Phase 1 — UI polish (Business Overview)
- `StatCard` component me **responsive + hover effect** add karunga:
  - Mobile: `grid-cols-2`, Tablet: `md:grid-cols-3`, Desktop: `lg:grid-cols-4` / `lg:grid-cols-5` (pipeline ke liye)
  - Hover: `hover:-translate-y-0.5 hover:shadow-lg hover:border-l-[5px] transition-all` + icon `group-hover:scale-110`
  - Numbers ke liye `text-xl md:text-2xl` (mobile pe bhi readable)
- Headings sticky-ish nahi, but better spacing on mobile

### Phase 2 — Admin sidebar IA cleanup
Combine + rename in `AdminSidebar.tsx`:
- **Statuses + CRM Fields** → ek tab "Fields & Statuses" (sub-tabs andar)
- **API Keys + API/Webhooks** → ek tab "API & Webhooks"
- **Reports + Performance** → ek tab "Reports & Performance" (sub-tabs)
- **Wavelength** → rename to **"Call Reports"**, aur is page me saari call details (call_logs full table: telecaller, lead, status, duration, recording link, called_at, area, dispo notes) — filterable by date / telecaller / status / area, with CSV export

### Phase 3 — Team management (edit/delete/designation)
`TeamManager` (existing list ke andar) per-row actions:
- **Edit** (name, phone, email, branch, manager)
- **Designation change** (telecaller/manager/admin/sub-agent — role swap via `user_roles`)
- **Delete** (soft: `is_active=false`)
- Naam type karte hi auto-trim/sanitize (block characters removal, no leading spaces, dedupe spaces)

### Phase 4 — Smart Import + Multi-category Dialer
**Import side** (`SmartCSVImporter`):
- Header detect karke auto-map: agar `policy_type` = Health → row goes to `health_policies` path; Motor → `motor_policies`/`vehicles`; Life → `life_policies`. Lead row har case me banegi.
- Upload form me **Branch dropdown** + **Telecaller dropdown** (kis telecaller ko assign hoga) compulsory dikhao before parse.
- Ek customer (same phone) ke 2 policy types → ek `customers` row, do `leads` rows (Health + Motor), aur dialer me dono lead dikhe (already works since dialer queries `leads`).

**Dialer side** (`CallingList.tsx`):
- Same phone ke multiple leads ko group karke ek customer card pe **dono category badges** dikhayenge ("Health" + "Motor"), tap karne se respective lead khulega.

---

### Order of execution
Main suggest karta hoon **Phase 1 + 2 pehle** (UI/IA — fast, low risk), phir **Phase 3** (team mgmt — medium), phir **Phase 4** (import + dialer multi-category — sabse bada, schema-touching).

### Confirmation chahiye
1. "Call Reports" me kya sab columns chahiye? (Main default daal raha hoon: Time, Telecaller, Customer, Phone, Status, Duration, Recording, Notes, Area)
2. "Designation change" me kaunse roles allow karu? (telecaller, manager, admin, sub_agent — sab?)
3. Multi-category dialer me dono leads alag rows me dikhe ya ek row + 2 badges?

Agar tum bolo "sab theek hai, shuru karo" — main Phase 1 → 4 ek-ek karke ship karunga.
