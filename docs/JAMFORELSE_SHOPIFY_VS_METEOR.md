# Jämförelse: Shopify vs Meteor-plattformen

*Internt underlag, 2026-07-05. Rått och osminkat — inklusive där Shopify vinner. Shopify-fakta källbelagda per 2026-07-05 (shopify.com/se/pricing, help.shopify.com, apps.shopify.com). Uppdatera innan publikt bruk.*

## 1. Pris

| | Shopify Basic | Vi (standard) |
|---|---|---|
| Fast avgift | 359 kr/mån (269 kr/mån vid årsbetalning) | **0 kr** |
| Kortavgift (EU-kort) | 1,6 % + 1,85 kr | ingår i provisionen |
| Klarna | 2,99 % + 4 kr | ingår i provisionen |
| Provision till plattformen | 0 % | **5 % på allt** (förhandlingsbart per butik) |
| Kostnad vid 0 kr försäljning | ~4 300 kr/år | **0 kr** |
| Tema | 0 kr (24 gratis) eller 1 000–5 000 kr engångs | ingår |
| Egen domän | ~100 kr/år (köps separat) | ⚠️ stöds ej ännu (*.web.app-adress) |

**Brytpunkt:** vi är billigare för butiker upp till ca **135–250 tkr/år i omsättning** (lägre gränsen vid mest kortbetalningar, högre vid mycket Klarna). Under ~100 tkr är vi *dramatiskt* billigare. Över ~300 tkr är Shopify billigare — punkt. Vår modell är "gratis tills du är stor".

## 2. Vad ingår out-of-the-box (utan appar/plugins)?

| Funktion | Shopify Basic | Vi |
|---|---|---|
| Webbutik + hosting + SSL | ✅ | ✅ |
| Produkter med varianter (färg/storlek) | ✅ | ✅ |
| Orderhantering + återbetalningar | ✅ | ✅ |
| **Affiliate-/influencermodul** | ❌ app: UpPromote $29,99/mån + 2 % | ✅ **inbyggd** (add-on) |
| **Click & Collect med upphämtningsdatum** | ❌ app: Zapiet $29,99/mån | ✅ **inbyggd** |
| **Print-on-demand med lokalt tryckeri** | Printful/Printify (produktion utomlands, per-styck-kostnad) | 🔜 planerad — lokala tryckerier, unik modell |
| B2B/grossist | ✅ grundläggande sedan april 2026 (max 3 kataloger) | ⚠️ under avveckling/omarbetning |
| Produktrecensioner | ❌ app: Judge.me $15/mån | ❌ saknas |
| E-postmarknadsföring | ❌ app: Klaviyo ~$45/mån | ❌ saknas |
| Övergiven varukorg-påminnelse | ✅ | ❌ saknas |
| Rabattkoder | ✅ | ⚠️ endast via affiliate-koder |
| Presentkort | ✅ | ❌ saknas |
| Flerspråk/flervaluta | ✅ (Markets, 1,5 % växlingsavgift) | ❌ svenska/SEK |
| Kassa/POS i fysisk butik | ✅ grundläggande (POS Pro $89/mån) | ❌ |
| Ordermejl med butikens varumärke | ✅ | ✅ (logga, färger, per butik) |
| Ångerrätt/konsumenträtt (svensk lag) | ⚠️ gör-det-själv | ✅ **inbyggd** (ångerblankett, villkorsmallar, DAC7) |

**Typisk verklig Shopify-månadskostnad** för en liten butik som vill ha affiliate + pickup + recensioner: 359 + ~315 + ~315 + ~160 = **~1 150 kr/mån (~14 tkr/år) innan första kronan i försäljning.** Det är HÄR vi vinner — våra motsvarande moduler ingår.

## 3. Vad får man fixa själv?

| | Shopify | Vi |
|---|---|---|
| Uppsättning av butik | Själv (eller konsult 10–50 tkr) | **Vi gör det åt dig** |
| Design/tema | Själv välja, köpa, anpassa | Ingår, vi sätter upp |
| Juridiska sidor (köpvillkor, integritet, ångerrätt) | Själv/jurist | **Mallar ingår, förifyllda** |
| Appval, appkonflikter, appuppdateringar | Själv (6–12 appar är normalt) | Finns inga appar att underhålla |
| Support | Chatt (engelska först) | **Människa du känner, på svenska** |

Detta är vårt verkliga försäljningsargument mot Kents målgrupp (analoga verksamheter utan e-handelsvana): **Shopify är ett verktyg, vi är en tjänst.**

## 4. Betalsystem

| | Shopify (Sverige) | Vi |
|---|---|---|
| Kort (Visa/MC) | ✅ 1,6 % + 1,85 kr | ✅ (ingår i provision) |
| Klarna | ✅ 2,99 % + 4 kr | ✅ (ingår) |
| Apple Pay / Google Pay | ✅ | ✅ |
| **Swish** | ✅ **native** (QR/BankID) | ⚠️ endast via Klarna-flödet |
| Externt betalsystem | Straffavgift 2 % extra på Basic | ej aktuellt |

Ärligt: Shopify vinner på Swish. Native Swish hos oss = framtida Stripe-fråga.

## 5. Säkerhet

| | Shopify | Vi |
|---|---|---|
| PCI-DSS | Level 1-certifierad | Kortdata rör aldrig oss (Stripe, PCI Level 1) |
| SSL | ✅ automatiskt | ✅ automatiskt |
| GDPR | Verktyg finns, ansvaret ditt | Villkorsmallar + registerhantering inbyggt; ansvaret fortsatt butikens |
| Drifttid | 99,9 % (självrapporterad) | Google Cloud/Firebase-infrastruktur; ingen egen SLA publicerad |
| Tenant-isolering | — | Reviderad i 7-lagers säkerhetsaudit 2026 |

Jämnt. Ingen seriös skillnad att sälja på åt något håll — påstå inte annat.

## 6. Flexibilitet & inlåsning

**Shopify:** proprietärt temaspråk (Liquid), 6–12 appar vars data inte följer med vid flytt, 2 % straffavgift för externa betallösningar, historik av prishöjningar (+34 % på Basic 2023), långsam dataexport i skräpformat. Inlåsningen är affärsmodellen.

**Vi:** butikens data ligger hos oss (ingen självbetjäningsexport ännu — måste byggas och skrivas in i Plattformsvillkoren), men ingen fast avgift = inget som tickar när man vill tänka. Rå sanning: vi är också en inlåsning, bara en billigare. Bygg dataexport innan någon frågar.

## 7. Slutsats för säljet

- **Målgrupp där vi vinner allt:** analog verksamhet med bra omsättning som aldrig sålt online (Kents segment), plus småbutiker < ~200 tkr/år online. Argument: 0 kr fast, allt ingår som kostar 1 000+ kr/mån i appar hos Shopify, och **vi gör jobbet åt dem**.
- **Målgrupp vi ska lämna ifred:** etablerade butiker > 300 tkr/år online (Shopify är billigare) och säsongsoptimerare à la Sillmans (~2 % effektiv kostnad — under vårt kostnadsgolv).
- **Add-on-intäkter (Kents tes):** rätt tanke, men det finns idag **ingen betalmekanism för add-ons** — de är gratis funktionsflaggor. Prissätt modulerna i Plattformsvillkoren nu och ta betalt via provisionspåslag per butik (spaken finns redan), annars blir de gratis för alltid för de första kunderna.
- **Luckor att stänga innan tabellen används publikt:** egen domän, native Swish, produktrecensioner, dataexport, presentkort/rabattkoder.
