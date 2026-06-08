# Batch: 6 Feature Additions

Since you've already chosen "skip multi-tenant" earlier, I will store **masking_config** and **brand_config** on the existing `app_settings` table (single-tenant) instead of creating a `companies` table. Per-user theme on `profiles`.

## 1. Dark / Light Mode
- Add `ui_theme` column on `profiles` ('light' | 'dark' | 'system', default 'system')
- New `ThemeProvider` (reads system pref, syncs from profile, writes back on toggle)
- Toggle in `HamburgerMenu` (☀️/🌙)
- `index.css` already has `.dark` tokens — just wire the class onto `<html>`

## 2. Phone Masking (Admin-controlled)
- `maskPhone()` change: last **4 visible**, rest `X` (e.g. `XXXXXX 7946`)
- New `app_settings.masking_config` JSONB:
  ```
  { manager:{masked,reveal_on_dial}, telecaller:{...}, agent:{...} }
  ```
- Admin → new "Privacy" card in GeneralSettings to edit per-role
- `useMaskingPolicy()` hook → `LeadActions` applies. "Reveal on dial" = flash full number 1s when Dial pressed
- Copy button copies masked text when role is masked

## 3. Dialer Dual View (Block / List)
- Toggle in `CallingList` header (`Grid3x3` / `List` icons)
- Persisted in `localStorage('callingViewMode')`
- **Block** = current card layout (no change)
- **List** = compact row: Name | masked phone | status badge | last called | Dial button
- Tap row → expand inline `LeadActions`

## 4. Company Branding
- `app_settings.brand_config` JSONB: `{primary, secondary, sidebar_bg, logo_url, company_name}`
- New `BrandingPanel` in admin settings: color pickers + logo URL + live preview + Reset
- `BrandProvider` injects `--primary`, `--secondary`, `--sidebar-background` CSS vars at runtime
- Header logo/name read from brand_config

## 5. Import Assignment (extend `CSVImporter`)
- Add Step-2 block above preview: Manager dropdown, Telecaller dropdown OR auto-distribute, Campaign Name, Deadline (date picker), Priority radio
- DB: `leads.campaign_name TEXT`, `leads.deadline DATE`, `leads.priority TEXT default 'normal'`, `leads.manager_id UUID`
- Round-robin distribution when "auto" picked
- Adds call_log entry "Imported by …"

## 6. Admin Dashboard Overview
- New `AdminOverviewPanel` component with the 5 stat rows you listed (team, calls, pipeline, campaigns, business summary) using `count` queries
- Date scope toggle: Today / Week / Month
- Charts: Recharts bar (calls per telecaller), line (30-day volume), pie (disposition)
- Leaderboard table
- Mounted as default tab on AdminDashboard

## What I'm intentionally NOT doing (tell me if you want any)
- Separate `companies` table / true multi-tenant isolation (you said skip)
- Realtime subscriptions on every stat card (will use React Query refetch every 30s instead — much lighter)
- Replacing Tailwind primary color tokens across the entire app (will only swap CSS vars at runtime so all `hsl(var(--primary))` consumers update automatically — components using hard-coded `text-red-500` etc. won't change. I'll audit a few hotspots but won't refactor every component)

Reply **"go"** and I'll ship all 6 in one pass (migration first, then code). If you want me to drop or trim any item, say which.
