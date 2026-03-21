# Faroe Car Platform – Production Readiness Audit Report

**Date:** March 2026  
**Scope:** Full codebase review (functionality, UI/UX, responsiveness, code quality, architecture, performance, accessibility, SEO, errors, consistency, cleanup)

---

## 1. CRITICAL ISSUES

### 1.1 Protected routes not middleware-protected
**What:** `/bookings`, `/owner/dashboard`, `/admin`, `/renter-approval` use client-side auth redirects only. Unauthenticated users can briefly see page content before redirect.

**Why it matters:** Security and UX: users may see a flash of private data; direct URL access bypasses server-side protection.

**Files:** `middleware.ts` (lines 9–13), `app/bookings/page.tsx`, `app/owner/dashboard/page.tsx`, `app/admin/page.tsx`, `app/renter-approval/page.tsx`

**Fix:** Add these paths to `PROTECTED_PREFIXES` in middleware. For `/admin`, APIs already enforce role; middleware would redirect unauthenticated users to login—admin role check remains client-side or add server-side check.

---

### 1.2 No error boundaries
**What:** No `app/error.tsx` or `app/not-found.tsx`. Uncaught React errors result in Next.js default error UI or blank screen.

**Why it matters:** Production errors can leave users with no recovery path.

**Files:** `app/` directory (missing error.tsx, not-found.tsx)

**Fix:** Add `app/error.tsx` with reset/retry UI. Add `app/not-found.tsx` for 404s. Optionally add `loading.tsx` for route-level loading states.

---

## 2. HIGH PRIORITY IMPROVEMENTS

### 2.1 No page-specific metadata/SEO
**What:** Only root layout has metadata. All 17+ pages share the same generic title/description. No Open Graph or Twitter cards.

**Why it matters:** Poor SEO; social shares show generic previews.

**Files:** `app/layout.tsx`, all `app/*/page.tsx`

**Fix:** Add `export const metadata` or `generateMetadata` to key pages: `/rent-a-car`, `/rent-a-car/[id]`, `/list-your-car`, `/about`, `/bookings`, etc.

---

### 2.2 Error handling hides failures
**What:** Many `fetch().catch(() => ({}))` and `.catch(() => {})` calls silently ignore errors. Users get no feedback when requests fail.

**Why it matters:** Failures are invisible; debugging and UX suffer.

**Files:** `components/CarDetailContent.tsx` (lines 53, 73, 87, 101, 124, 180), `components/Navbar.tsx`, `app/bookings/page.tsx`, `app/owner/dashboard/page.tsx`, etc.

**Fix:** Surface errors to users (toast, inline message). Log errors in dev. Avoid swallowing errors without at least setting an error state.

---

### 2.3 Duplicated STATUS_LABELS
**What:** `STATUS_LABELS` object duplicated in `app/admin/page.tsx` and `app/bookings/page.tsx`.

**Why it matters:** Inconsistent labels if one is updated; violates DRY.

**Files:** `app/admin/page.tsx` (lines 53–61), `app/bookings/page.tsx` (lines 39–47)

**Fix:** Extract to `constants/booking-status.ts` or `lib/constants.ts` and import.

---

### 2.4 Login/Signup pages missing Footer
**What:** `app/login/page.tsx` and `app/signup/page.tsx` render Navbar but no Footer.

**Why it matters:** Inconsistent layout; users may expect footer links (e.g. contact, terms).

**Files:** `app/login/page.tsx`, `app/signup/page.tsx`

**Fix:** Add Footer to both pages for consistency, or document as intentional for auth screens.

---

## 3. MEDIUM PRIORITY IMPROVEMENTS

### 3.1 Footer uses hardcoded color
**What:** Footer links use `hover:text-[#3F8F4F]` instead of `hover:text-brand`.

**Why it matters:** Brand color changes require manual updates; inconsistency.

**Files:** `components/Footer.tsx` (lines 32, 38, 44, 50, 56, 62)

**Fix:** Replace with `hover:text-brand`.

---

### 3.2 Unused ThemeToggle component
**What:** `ThemeToggle` exists but is never rendered. ThemeProvider and theme script run; users have no way to toggle theme.

**Why it matters:** Dead code; theme system is half-implemented.

**Files:** `components/ThemeToggle.tsx`, `components/Navbar.tsx`

**Fix:** Either add ThemeToggle back to Navbar (if dark mode is desired) or remove ThemeToggle and simplify ThemeContext if theme switching is not needed.

---

### 3.3 Unused imports in Footer
**What:** `components/Footer.tsx` imports `Image` from `next/image` but does not use it.

**Why it matters:** Unnecessary bundle size; lint noise.

**Files:** `components/Footer.tsx` (line 4)

**Fix:** Remove unused `Image` import.

---

### 3.4 Inconsistent section backgrounds
**What:** Some pages use `bg-slate-50`, concept section uses `bg-slate-100`. About, How it works, FAQ, etc. use `bg-slate-50`.

**Why it matters:** Minor visual inconsistency across content sections.

**Files:** `app/about/page.tsx`, `app/how-it-works/page.tsx`, `app/page.tsx`, `app/faq/page.tsx`, etc.

**Fix:** Standardize on one background for content sections (e.g. `bg-slate-50` or `bg-slate-100`) via a shared layout or constant.

---

### 3.5 hooks/index.ts and services/index.ts are placeholders
**What:** Both files have all exports commented out. `useAuth` is imported directly from `@/hooks/useAuth`.

**Why it matters:** Dead/placeholder code; confusing for developers.

**Files:** `hooks/index.ts`, `services/index.ts`

**Fix:** Either enable exports and use barrel imports, or remove/simplify the barrel files.

---

## 4. LOW PRIORITY / POLISH

### 4.1 lib/api client unused
**What:** `lib/api/client.ts` and `lib/api/index.ts` define `apiGet`, `apiPost`, etc., but the app uses raw `fetch("/api/...")` everywhere.

**Why it matters:** Potential for centralized error handling and request logic; currently unused.

**Files:** `lib/api/client.ts`, `lib/api/index.ts`

**Fix:** Low priority. Either adopt the API client for new code or remove if not planned.

---

### 4.2 Alt text on listing thumbnails
**What:** `Step4Photos.tsx` uses `alt=""` for listing photo thumbnails.

**Why it matters:** Screen readers get no description. Acceptable if purely decorative; consider descriptive alt if meaningful.

**Files:** `components/listing-wizard/steps/Step4Photos.tsx` (line 176)

**Fix:** Use `alt="Listing photo 1"` etc., or `role="presentation"` if purely decorative.

---

### 4.3 auth.config.ts / NextAuth
**What:** `auth.config.ts` has empty providers; app uses Supabase Auth. NextAuth appears to be vestigial.

**Why it matters:** Confusion about auth stack; possible unused dependency.

**Files:** `auth.config.ts`, `auth.ts` (if exists)

**Fix:** Document that Supabase is the primary auth; consider removing NextAuth if fully unused.

---

## 5. CODE CLEANUP OPPORTUNITIES

| Item | Location | Action |
|------|----------|--------|
| Unused Image import | `components/Footer.tsx` | Remove |
| Unused ThemeToggle | `components/ThemeToggle.tsx` | Remove or integrate |
| Empty hooks barrel | `hooks/index.ts` | Add useAuth export or remove |
| Empty services barrel | `services/index.ts` | Add exports or remove |
| Duplicate STATUS_LABELS | admin + bookings | Extract to shared constant |
| request.json().catch(() => ({})) | API routes | Keep for robustness; ensure validation follows |

---

## 6. EXECUTION PLAN

### Phase 1: Critical fixes (do first)
1. Add `app/error.tsx` error boundary
2. Add `app/not-found.tsx` for 404s
3. Extend middleware to protect `/bookings`, `/owner/dashboard`, `/renter-approval` (and `/admin` if feasible with session)
4. Add `app/loading.tsx` for global loading state (optional)

### Phase 2: Code cleanup and structure
1. Extract `STATUS_LABELS` to shared constant
2. Fix Footer: remove unused Image import, use `hover:text-brand`
3. Remove or integrate ThemeToggle
4. Add page-specific metadata to key routes
5. Fix login/signup Footer (add for consistency)

### Phase 3: UI/UX polish and optimization
1. Improve error surfacing in CarDetailContent, Navbar, etc.
2. Standardize section backgrounds
3. Review and fix accessibility (alt text, aria)
4. Consider adopting API client for new fetch logic

---

## 7. SUMMARY TABLE

| Area | Severity | Count |
|------|----------|-------|
| Critical | 2 | Protected routes, error boundaries |
| High | 4 | SEO, error handling, STATUS_LABELS, login/signup Footer |
| Medium | 5 | Footer color, ThemeToggle, unused imports, backgrounds, barrel files |
| Low | 3 | API client, alt text, auth.config |
| Cleanup | 6 | Various |

---

*Report generated from systematic codebase review. Implement Phase 1 first, then Phase 2, then Phase 3.*
