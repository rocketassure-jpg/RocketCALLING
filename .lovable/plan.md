
## Scope decision

Multi-tenant company_code system **skipped** (per your answer). App stays single-company. The "Company Code" idea will be reused as a simple **invite code** in the signup flow so randoms can't sign up — same protection, no DB refactor risk.

Work split into 3 batches. I'll do **Batch 1 + 2 in this turn**, then Batch 3 after you confirm Batch 1+2 looks good.

---

## Batch 1 — Lead Card UI (CallingList + LeadActions)

1. **Two-row action layout** in `LeadActions.tsx`:
   - Row 1: `[Dial ▾]` (split button) | `[Disposition ▾]`
   - Row 2: `[SMS]` `[WhatsApp]` `[Quote]` `[More …]`
   - WhatsApp moves from row 1 to row 2.

2. **Phone masking** (`98930 XXXXX`):
   - New helper `maskPhone(phone)` in `src/lib/utils.ts`.
   - `CallingList` lead row shows masked number by default.
   - Only the Dial button reveals/dials the real number (`tel:` link uses full number; UI text stays masked).
   - Copy action removed/disabled to keep masking effective.

3. **Pagination** in `CallingList.tsx`:
   - Replace infinite scroll with explicit pager: `‹ 1 2 3 … Next ›` + page-size selector `[20] [50] [100]`.
   - Label: `Page 1 of N · 10,531 total`.
   - Page + size persisted in URL query (`?page=2&size=50`) so back button works.
   - `useLeadsPaginated` gets `page`/`pageSize` inputs instead of cursor.

## Batch 2 — Revival Date Filter on Dashboard

4. New `RevivalDateFilter.tsx` widget on Telecaller/Manager/Admin dashboards (top of `CallingList`):
   - Quick chips: `Today | Tomorrow | This Week | Custom`.
   - Custom → shadcn Calendar popover (mobile-friendly, `pointer-events-auto`).
   - Filter applies on `leads.policy_expiry_date` (or `renewal_date` — I'll pick whichever exists in the schema).
   - Matched leads get a yellow/orange left border in the list (`border-l-4 border-warning`).
   - Clear button to reset.
   - URL param `?revival=YYYY-MM-DD`.

## Batch 3 — Admin Approval Flow (next turn, after you OK Batch 1+2)

5. DB migration:
   - `profiles`: add `is_approved boolean default false`, `is_active boolean default true`, `department text`, `rejection_reason text`.
   - RLS: block app data for non-approved users via a `is_approved(uid)` security-definer function used in existing policies.
   - Update `handle_new_user()` trigger to set `is_approved=false`.

6. Auth screen (`Auth.tsx`):
   - Signup adds: Role select, Department select, Invite Code field (validated against an `app_settings.invite_code` row).
   - After signup: success screen "Admin approval pending".
   - Login: if `!is_approved` → "Pending approval"; if `!is_active` → "Deactivated, contact admin".

7. Admin dashboard: new **Pending Approvals** panel with badge count, Approve / Reject (with reason) buttons. Approve sets `is_approved=true` and assigns the chosen role into `user_roles`.

8. (Optional, after you confirm) Edge function `notify-admin-approval` to email admin on signup and user on approve/reject — needs RESEND_API_KEY. I'll ask before scaffolding.

---

## Explicitly NOT in this scope (tell me if you want any of these later)

- Multi-tenant `companies` table + `company_id` on every table + RLS rewrite.
- Per-role permission matrix UI expansion (the existing `PermissionsMatrix.tsx` already exists; expanding it to the 6-feature grid is a separate task).
- Disposition-access checkboxes per user (needs new `user_disposition_access` table — separate task).
- Forgot password OTP screen (Supabase's built-in `resetPasswordForEmail` + `/reset-password` page is simpler; can do in Batch 3 if you confirm).
- Profile photo upload (needs storage bucket).

Confirm and I'll start with Batch 1 + 2.
