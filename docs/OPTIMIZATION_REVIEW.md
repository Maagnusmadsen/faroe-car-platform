# FaroeRent – Optimeringsgennemgang

Gennemgang af hele hjemmesiden med fokus på performance, brugeroplevelse, sikkerhed og vedligeholdelse.

---

## Handlingsliste (nummereret)

1. **Fjern hardcodede email/telefon på contact-siden** – Brug kun env; vis "ikke konfigureret" hvis ikke sat (ingen private oplysninger i koden).
2. **Tilføj global loading og fejlhåndtering** – `app/loading.tsx` (skeleton/spinner) og `app/error.tsx` (error boundary). Evt. `loading.tsx` på tunge routes (rent-a-car, bookings, owner/dashboard, admin, list-your-car).
3. **Udvid middleware med beskyttede routes** – Kræv login for `/bookings`, `/owner/dashboard` og `/admin` (samme Supabase-check som `/profile`), så der ikke vises flash eller unødvendige API-kald.
4. **Flyt booking- og admin-status-labels til locales** – "Pending", "Confirmed", "Cancelled" osv. i `locales/en.json` og brug `t()` overalt.
5. **Konverter statiske sider til server components** – About, FAQ, Contact, Terms, Cancellation, How it works (og evt. forsiden), så de sender mindre JS og loader hurtigere.
6. **Opret `.env.example`** – List alle nødvendige variabler (public og server) med korte beskrivelser og placeholder-værdier; nævn i README.
7. **Valider env ved opstart** – Fx `validateEnv()` i `config/env.ts` (eller Zod) så manglende variabler opdages tidligt med tydelig fejl.
8. **Saml hardcodede fejl- og loading-tekster i locales** – "Failed to load...", "Redirecting…", "Loading…" osv. i `locales/en.json` under fx `common.*` og brug `t()`.
9. **Vælg én API-tilgang** – Enten brug `lib/api/client.ts` overalt eller kun `fetch` med en lille wrapper, så fejlhåndtering og base URL er ensartet.
10. **Tilføj metadata/SEO på vigtige sider** – Unikke `metadata` eller `generateMetadata` på rent-a-car, list-your-car, about, contact, faq; evt. Open Graph og Twitter-card.
11. **Opdel store sider i komponenter og hooks** – Bookings og admin i mindre komponenter (BookingsTabs, AdminUsers osv.) og evt. useBookings/useAdminData.
12. **Fjern NextAuth** – Auth kører på Supabase; fjern `next-auth` og `@auth/prisma-adapter`, opdater `config/env.ts` (getBaseUrl m.m.), så bundle og config bliver simplere.
13. **Overvej request-deduping** – Fx SWR eller React Query til session og has-listings, så nav og dashboard ikke kalder samme API flere gange.
14. **Kort på sigt: vælg én kort-løsning** – Enten migrér CarMap til Mapbox og fjern Leaflet, eller omvendt, så der kun er ét kort-bibliotek.

---

## 1. Performance

### 1.1 Route-level loading og fejlhåndtering
- **Nu:** Ingen `loading.tsx` eller `error.tsx` på nogen route. Brugeren ser blank skærm eller fuld side indtil client-fetch er færdig.
- **Anbefaling:** Tilføj `app/loading.tsx` (global skeleton/spinner) og `app/error.tsx` (global error boundary). Overvej `loading.tsx` på tunge routes: `/rent-a-car`, `/rent-a-car/[id]`, `/bookings`, `/owner/dashboard`, `/admin`, `/list-your-car`.
- **Effekt:** Hurtigere oplevet respons og tydelig feedback ved fejl.

### 1.2 Alle sider er client components
- **Nu:** Næsten alle `app/**/page.tsx` er `"use client"` med client-side `fetch()` i `useEffect`. Ingen server components til statisk indhold eller initial data.
- **Anbefaling:** Konverter statiske/marketing-sider til server components hvor muligt: `/`, `/about`, `/how-it-works`, `/faq`, `/contact`, `/terms`, `/cancellation`. Behold kun interaktivitet (søgning, forms, auth) som client. Overvej server-side data til car detail (`/rent-a-car/[id]`) med `fetch` eller Prisma direkte, så første paint ikke venter på client.
- **Effekt:** Mindre JS, hurtigere FCP og bedre SEO.

### 1.3 To kort-biblioteker
- **Nu:** Både **Leaflet** (rent-a-car kort) og **Mapbox** (listing wizard, owner map, preview) bruges. Begge loades (med `dynamic(..., { ssr: false })`), men begge er stadig i bundlen.
- **Anbefaling:** Langsigtet: vælg én kortløsning (fx kun Mapbox) og migrér `CarMap` til den, så du kan fjerne Leaflet. Kortsigtet: bekræft at map-komponenter kun loades on-demand (fx når brugeren åbner "Show map") og ikke på første render.

### 1.4 Ubrugt NextAuth
- **Nu:** `next-auth` og `@auth/prisma-adapter` står i `package.json`; auth kører på Supabase. `auth.ts` importerer NextAuth; `config/env.ts` læser `NEXTAUTH_URL` / `NEXTAUTH_SECRET`.
- **Anbefaling:** Fjern NextAuth helt: slett `auth.ts` (eller reducer til no-op), fjern `next-auth` og `@auth/prisma-adapter` fra dependencies, og erstat `getBaseUrl()` i `config/env.ts` med kun `VERCEL_URL` eller en anden base-URL kilde. Så falder bundle og forvirring.
- **Effekt:** Mindre bundle, simplere konfiguration.

### 1.5 Ingen request-deduping
- **Nu:** Flere komponenter kan kalde samme API (fx `GET /api/auth/me`, `GET /api/owner/has-listings`) uden fælles cache.
- **Anbefaling:** Overvej en let data-layer (fx SWR eller React Query) for session og has-listings, så nav og dashboard deler samme cache og undgår dobbelte kald.

---

## 2. Brugeroplevelse (UX)

### 2.1 Beskyttede routes kun i client
- **Nu:** `/bookings`, `/owner/dashboard` og `/admin` er ikke i middleware. Brugeren kan lande på siden, og først efter auth-check redirectes til login (eller admin får "Access denied"). Det kan give et kort "flash" eller ét API-kald før 403.
- **Anbefaling:** Udvid `middleware.ts` så `/bookings`, `/owner/dashboard` og `/admin` kræver login (samme Supabase-check som `/profile`). For `/admin` kan du enten tjekke role i middleware (hvis du har role i JWT/cookie) eller beholde client-side admin-check som ekstra lag. Så undgås unødvendig rendering og API-kald for uautoriserede.
- **Effekt:** Konsistent adfærd og mindre forvirring.

### 2.2 Store, tunge sider
- **Nu:** `app/bookings/page.tsx` og `app/admin/page.tsx` er store med mange `useState` og flere fetches.
- **Anbefaling:** Opdel i mindre komponenter (fx `BookingsTabs`, `BookingsList`, `AdminUsers`, `AdminListings`) og evt. custom hooks (`useBookings`, `useAdminData`). Det gør det lettere at tilføje loading/error per sektion og at teste.
- **Effekt:** Bedre læsbarhed og vedligeholdelse.

### 2.3 Hardcodede status-labels
- **Nu:** I bookings og admin bruges fx "Pending", "Confirmed", "Cancelled" direkte i koden i stedet for `t("bookings.statusPending")` osv.
- **Anbefaling:** Flyt alle status-tekster til `locales/en.json` (fx under `bookings.status*`) og brug `t()` overalt. Samme for admin-labels.
- **Effekt:** Konsistent sprog og klarhed ved evt. flersproget udvidelse.

### 2.4 Kontakt-side fallbacks
- **Nu:** `app/contact/page.tsx` har `SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "maagnusmadsen@gmail.com"` og tilsvarende for telefon. Hvis env ikke er sat, bliver disse værdier bundlet i koden.
- **Anbefaling:** Brug kun env; vis ingen mail/telefon-link hvis ikke sat, og vis i stedet `t("contact.emailNotConfigured")` / tilsvarende for telefon. Fjern hardcodede fallbacks fra koden.
- **Effekt:** Ingen private oplysninger i repo og tydelig opsætning ved manglende env.

---

## 3. Sikkerhed og konfiguration

### 3.1 Ingen central validering af env
- **Nu:** `config/env.ts` læser variabler ved brug; manglende vars opdages først runtime.
- **Anbefaling:** Tilføj ved opstart (fx i `env.ts`) en `validateEnv()` som tjekker påkrævede variabler (DATABASE_URL, Supabase, Stripe, osv.) og kaster en klar fejl. Overvej Zod for at validere og typede env-objekter.
- **Effekt:** Hurtigere fejlfinding og sikrere deployment.

### 3.2 Manglende .env.example
- **Nu:** Der findes ikke et `.env.example` som lister alle variabler (public og server) med korte beskrivelser.
- **Anbefaling:** Opret `.env.example` med alle nødvendige keys og placeholder-værdier (uden rigtige secrets). Nævn den i README.
- **Effekt:** Nemmere onboarding og opsætning af nye miljøer.

---

## 4. i18n og tekster

### 4.1 Hardcodede fejl- og loading-tekster
- **Nu:** Tekster som "Failed to load...", "Redirecting…", "Loading…" forekommer direkte i komponenter.
- **Anbefaling:** Saml i `locales/en.json` (fx `common.loading`, `common.errorLoad`, `common.redirecting`) og brug `t()` overalt.
- **Effekt:** Ensartet tone og nem oversættelse senere.

### 4.2 Én locale
- **Nu:** Kun `en`; ingen locale-switcher. Strukturen med `LanguageContext` og `t()` er klar til flere sprog.
- **Anbefaling:** Behold som er; når I tilføjer sprog (fx da/fo), udvid locales og evt. en lille switcher i footer eller nav.

---

## 5. Kode og arkitektur

### 5.1 Inkonsistent API-brug
- **Nu:** Nogle steder bruges `lib/api/client.ts` (`apiGet`, `apiPost`), andre steder rå `fetch("/api/...")`.
- **Anbefaling:** Vælg én tilgang: enten brug API-klienten overalt (så base URL og fejlhåndtering er central), eller drop klienten og brug kun `fetch` med en lille wrapper. Det giver ens error-handling og evt. retry/logging.
- **Effekt:** Mere ensartet og forudsigelig kode.

### 5.2 Metadata og SEO
- **Nu:** Root layout har `title` og `description`; enkelte sider har muligvis ikke egne `metadata` eksporter.
- **Anbefaling:** Tilføj `export const metadata` (eller `generateMetadata`) på vigtige sider: `/rent-a-car`, `/list-your-car`, `/about`, `/contact`, `/faq`. Brug unikke titler og beskrivelser. Overvej Open Graph og Twitter-card tags i layout eller per side.
- **Effekt:** Bedre søgeresultater og deling på sociale medier.

---

## 6. Prioriteret handlingsliste

| Prioritet | Handling | Indsats |
|-----------|----------|---------|
| Høj | Fjern hardcodede email/telefon på contact-siden | Lav |
| Høj | Tilføj `app/loading.tsx` og `app/error.tsx` | Lav |
| Høj | Udvid middleware til `/bookings`, `/owner/dashboard`, `/admin` (login) | Medium |
| Medium | Flyt booking/admin-status-labels til locales | Lav |
| Medium | Konverter statiske sider (about, faq, contact, terms, cancellation) til server components | Medium |
| Medium | Opret `.env.example` og nævn i README | Lav |
| Medium | Valider env ved opstart (Zod eller manuel check) | Lav |
| Lav | Fjern NextAuth og relateret config | Medium |
| Lav | Overvej én kort-løsning (Leaflet vs Mapbox) på sigt | Stor |
| Lav | Tilføj SWR/React Query for session og has-listings | Medium |

---

*Gennemgangen dækker app-routes, komponenter, auth, data-fetch, performance, i18n og config. Revideret efter kodestruktur pr. marts 2026.*
