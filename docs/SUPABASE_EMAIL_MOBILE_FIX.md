# Mobil-fix: E-mail-bekræftelse virker i alle browsere

## Problem

Når brugeren tilmelder sig på mobil og klikker på godkendelseslinket i mailen, åbnes linket ofte i mail-appens indbyggede browser (fx Gmail, Apple Mail). Denne browser har ikke adgang til den cookie, som PKCE-flowet kræver, så bekræftelsen fejler med "Something went wrong".

## Løsning

Brug **token_hash**-verifikation i stedet for standard PKCE-flow. Verifikationen sker server-side og kræver ingen cookies fra signup.

### Trin 1: Opdater Supabase e-mail-skabelon

1. Gå til **Supabase Dashboard** → **Authentication** → **Email Templates**
2. Vælg **Confirm signup**
3. Find godkendelseslinket (typisk en knap med `{{ .ConfirmationURL }}`)
4. **Erstat** `href="{{ .ConfirmationURL }}"` med:

   ```
   href="{{ .SiteURL }}/auth/verify?token_hash={{ .TokenHash }}&type=signup"
   ```

   Hvis du bruger din egen domæne, erstat `{{ .SiteURL }}` med f.eks. `https://rentlocal.fo`:

   ```
   href="https://rentlocal.fo/auth/verify?token_hash={{ .TokenHash }}&type=signup"
   ```

5. Gem skabelonen

### Trin 2: Tilføj Redirect URL i Supabase

1. Gå til **Authentication** → **URL Configuration**
2. Under **Redirect URLs**, tilføj:
   - `https://rentlocal.fo/auth/verify`
   - `https://rentlocal.fo/auth/verify?*` (hvis din Supabase-version understøtter wildcard)

3. Gem

### Trin 3: Verificer Site URL

Sørg for at **Site URL** i Supabase er `https://rentlocal.fo` (eller dit produktionsdomæne).

---

## Hvordan det virker

- **Før:** Linket gik til Supabase, som redirectede med en `code`. Udbytning af koden krævede `code_verifier` fra signup-cookien – som mangler i mail-appens browser.
- **Efter:** Linket går direkte til `/auth/verify?token_hash=...`. Serveren kalder `verifyOtp()` med token_hash, får sessionen og sætter cookies. Ingen PKCE, virker i alle browsere.
