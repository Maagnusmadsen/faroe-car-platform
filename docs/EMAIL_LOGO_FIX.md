# Logo i Supabase bekræftelsesmail

Hvis logoet vises som ødelagt i "Confirm Your Signup"-mailen, kan det være fordi:

1. **`https://rentlocal.fo/logo-light.png` returnerer fejl** (f.eks. 500)
2. **Mailklienter blokerer eksterne billeder** som standard

## Løsning: Brug embedded logo (base64)

Så logoet altid vises uanset hosting og mailklient:

### Trin 1: Generer img-tag med logo

```bash
npm run logo:base64
```

eller

```bash
npx tsx scripts/logo-base64-for-email.ts
```

### Trin 2: Opdater Supabase-skabelon

1. Gå til **Supabase Dashboard** → **Authentication** → **Email Templates**
2. Vælg **Confirm signup**
3. Find den eksisterende `<img src="https://rentlocal.fo/logo-light.png" ...>`
4. Erstat den med output fra scriptet ovenfor (hele `<img src="data:image/png;base64,..." ...>` linjen)

### Trin 3: Gem

Klik **Save** i Supabase. Nye bekræftelsesmails vil nu vise logoet.

---

## Alternativ: Tjek at URL'en virker

Hvis du foretrækker at bruge den eksterne URL:

1. Åbn **https://rentlocal.fo/logo-light.png** i browseren
2. Hvis du får 404 eller 500: Kontrollér at `public/logo-light.png` er med i dit repo og at Vercel-deploy er færdigt
3. Sørg for at Supabase-skabelonen bruger den fulde URL: `https://rentlocal.fo/logo-light.png` (ikke relativ path som `/logo-light.png`)
