# Guide: Koble rentlocal.fo med Resend og hjemmesiden

Du har købt domænet `rentlocal.fo`. Denne guide beskriver hvordan du kobler det sammen med Resend (email) og hjemmesiden.

---

## Del 1: Resend + rentlocal.fo (Email)

### 1.1 Opret domænet i Resend (hvis ikke allerede gjort)

1. Gå til [Resend → Domains](https://resend.com/domains)
2. Klik **Add domain**
3. Indtast `rentlocal.fo`
4. Vælg region: **Ireland (eu-west-1)** eller **Stockholm** hvis tilgængelig
5. Klik **Add domain**
6. Sørg for at både **Enable Sending** og **Enable Receiving** er slået til (grøn)

### 1.2 Tilføj DNS-poster hos din domæneudbyder

Log ind hos den udbyder, hvor du købte `rentlocal.fo` (fx nic.fo, Gandi, Cloudflare, etc.). Find **DNS-indstillinger** / **DNS Management** / **Name servers**.

Tilføj disse poster (værdierne findes i Resend efter du har tilføjet domænet):

| Type | Name (Host) | Content / Value | TTL | Priority |
|------|-------------|-----------------|-----|----------|
| TXT | `resend._domainkey` | *(Den lange streng fra Resend – Domain Verification DKIM)* | Auto/3600 | - |
| MX | `send` | `feedback-smtp.xx.amazonses.com` *(Resend viser den præcise værdi)* | Auto | 10 |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` | Auto | - |
| TXT | `_dmarc` | `v=DMARC1; p=none;` | Auto | - |
| MX | `@` eller tom | `inbound.xx.aws.com` *(Resend viser den præcise værdi)* | Auto | 10 |

**Bemærk:** Hos nogle udbydere bruges `@` for root-domænet, hos andre skal feltet være tomt eller `rentlocal.fo`. Brug det, din udbyder kræver.

### 1.3 Verificer i Resend

1. Vent 5–60 minutter (DNS kan tage tid)
2. Gå tilbage til Resend → Domains → dit domæne
3. Klik **"I've added the records"** eller **"Verify"**
4. Resend tjekker DNS – når alt er grønt, er domænet verificeret

### 1.4 Miljøvariabler (allerede sat)

I din `.env.local` skal du have:

```
RESEND_API_KEY=re_xxx
EMAIL_FROM_ADDRESS=notifications@rentlocal.fo
EMAIL_FROM_NAME=RentLocal
EMAIL_REPLY_TO=support@rentlocal.fo
```

`EMAIL_REPLY_TO` sørger for, at når kunder svarer på en mail, går svaret til `support@rentlocal.fo`. Den adresse modtager du via Resend (Enable Receiving).

---

## Del 2: Hjemmesiden + rentlocal.fo

### 2.1 Point domænet til din hosting (Vercel)

Hvis din hjemmeside kører på Vercel:

1. Gå til [Vercel Dashboard](https://vercel.com) → dit projekt → **Settings** → **Domains**
2. Klik **Add** og indtast `rentlocal.fo`
3. Vercel viser, hvad du skal tilføje hos din domæneudbyder:
   - **A-record:** `@` → `76.76.21.21` (eller den IP Vercel angiver)
   - **CNAME:** `www` → `cname.vercel-dns.com` (hvis du vil bruge www.rentlocal.fo)

### 2.2 DNS-poster hos domæneudbyder (for hjemmesiden)

Tilføj disse **uden** at overskrive de Resend-poster du allerede har:

| Type | Name | Content | TTL |
|------|------|---------|-----|
| A | `@` | `76.76.21.21` | Auto |
| CNAME | `www` | `cname.vercel-dns.com` | Auto |

Hvis du allerede har en A-record for `@`, opdater den til Vercels IP. MX-, TXT- og CNAME-poster for `send`, `resend._domainkey` og `_dmarc` skal blive stående.

### 2.3 Vercel-project settings

- Sæt `rentlocal.fo` som **Primary Domain** i Vercel hvis det er dit hoveddomæne
- Vercel håndterer automatisk SSL (HTTPS)

---

## Del 3: Tjekliste

- [ ] DNS-poster for Resend tilføjet (DKIM, SPF, MX for send, MX for root)
- [ ] Domænet verificeret i Resend
- [ ] A-record og CNAME for Vercel tilføjet
- [ ] `rentlocal.fo` tilføjet som domæne i Vercel
- [ ] `.env.local` har `EMAIL_FROM_ADDRESS=notifications@rentlocal.fo` og `EMAIL_REPLY_TO=support@rentlocal.fo`
- [ ] Ved deploy: samme miljøvariabler i Vercel (Settings → Environment Variables)

---

## Oversigt over adresser

| Adresse | Formål |
|---------|--------|
| `notifications@rentlocal.fo` | Afsender af systemmails (bookinger, beskeder osv.) |
| `support@rentlocal.fo` | Modtager kundeforespørgsler og svar på mails |
| `rentlocal.fo` / `www.rentlocal.fo` | Hjemmeside (Vercel) |

---

## Fejlsøgning

**"Domain not verified" i Resend**  
- Vent længere – DNS kan tage op til 24–48 timer  
- Tjek at alle poster er korrekt indtastet (ingen ekstra mellemrum, korrekt type)

**Mails ryger i spam**  
- Sørg for at DKIM, SPF og DMARC er sat korrekt  
- Undgå spam-agtige formuleringer i emne/brødtekst  

**Hjemmesiden viser ikke rentlocal.fo**  
- Tjek at A-record og CNAME peger på Vercel  
- Tjek at domænet er tilføjet i Vercel og markeret som primary hvis ønsket  
