// AdminMyTaxData — the SELLER's view of their own DAC7 data (Slice E/F).
//
// DAC7 is the platform's obligation, but the seller has GDPR rights over their
// OWN record: TRANSPARENCY (see what is reported about them), ACCESS, and
// RECTIFICATION. A seller can directly correct CONTACT fields
// (legalName/vatNumber/address/country); the IDENTITY fields (personnummer/
// org.nr/DOB/type) are platform-owned, so the seller submits a CORRECTION
// REQUEST the platform approves. A seller NEVER sees another seller's data —
// all callables are scoped to the caller's own shop (useShopId + server guard).
import React, { useState, useEffect, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase/config';
import { useShopId } from '../../contexts/ShopContext';
import { Page, Card, CardSection, Button } from '../../components/admin/ui';
import toast from 'react-hot-toast';

const CONTACT_FIELDS = [
  { k: 'legalName', label: 'Juridiskt namn' },
  { k: 'vatNumber', label: 'VAT-nummer' },
  { k: 'address', label: 'Adress' },
  { k: 'countryOfResidence', label: 'Hemvistland (ISO, t.ex. SE)' },
];
const IDENTITY_FIELDS = [
  { k: 'sellerType', label: 'Säljartyp' },
  { k: 'taxId', label: 'Skatte-ID (personnr / org.nr)' },
  { k: 'dateOfBirth', label: 'Födelsedatum' },
];

const AdminMyTaxData = () => {
  const shopId = useShopId();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [contact, setContact] = useState({});
  const [saving, setSaving] = useState(false);
  const [reqField, setReqField] = useState('taxId');
  const [reqValue, setReqValue] = useState('');
  const [reqBusy, setReqBusy] = useState(false);

  const load = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const res = await httpsCallable(functions, 'getOwnDac7')({ shopId });
      const p = res.data?.profile || null;
      setProfile(p);
      setContact({
        legalName: p?.legalName || '', vatNumber: p?.vatNumber || '',
        address: p?.address || '', countryOfResidence: p?.countryOfResidence || '',
      });
    } catch (e) {
      toast.error(e.message || 'Kunde inte hämta uppgifter.');
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => { load(); }, [load]);

  const saveContact = async () => {
    setSaving(true);
    try {
      await httpsCallable(functions, 'correctOwnDac7Contact')({ shopId, contact });
      toast.success('Uppgifter uppdaterade.');
      await load();
    } catch (e) {
      toast.error(e.message || 'Kunde inte spara.');
    } finally {
      setSaving(false);
    }
  };

  const submitRequest = async () => {
    if (!reqValue.trim()) { toast.error('Ange önskat värde.'); return; }
    setReqBusy(true);
    try {
      await httpsCallable(functions, 'requestDac7Correction')({ shopId, field: reqField, requestedValue: reqValue });
      toast.success('Begäran skickad. Plattformen granskar ändringen.');
      setReqValue('');
    } catch (e) {
      toast.error(e.message || 'Kunde inte skicka begäran.');
    } finally {
      setReqBusy(false);
    }
  };

  if (loading) {
    return <Page title="Mina skatteuppgifter"><Card className="py-12 text-center text-[13px] text-admin-text-muted">Laddar…</Card></Page>;
  }

  return (
    <Page title="Mina skatteuppgifter" subtitle="Uppgifter som rapporteras om dig enligt DAC7">
      <div className="space-y-4">
        {/* Transparency notice (DAC7 art. requirement). */}
        <div className="rounded-md bg-sky-50 border-l-4 border-sky-400 p-3 text-[13px] text-sky-800">
          Enligt EU:s DAC7-regler rapporterar plattformen vissa uppgifter om dig och din försäljning
          till Skatteverket. Nedan ser du vilka uppgifter som finns registrerade. Du kan rätta dina
          kontaktuppgifter direkt; ändring av identitetsuppgifter (skatte-ID, födelsedatum, typ) begärs
          via plattformen.
        </div>

        {/* ACTIVE transparency notification — shown when this seller has
            actually been included in a report for a given year. */}
        {Array.isArray(profile?.reported) && profile.reported.length > 0 && (
          <div className="rounded-md bg-amber-50 border-l-4 border-amber-400 p-4 text-[13px] text-amber-900">
            <p className="font-semibold mb-2">Du har rapporterats till Skatteverket (DAC7)</p>
            <ul className="space-y-1">
              {profile.reported.map((r) => (
                <li key={r.year}>
                  <strong>{r.year}</strong>: rapporterad {r.reportedAt ? new Date(r.reportedAt).toLocaleDateString('sv-SE') : ''} —
                  {' '}{r.txCountReported} transaktioner, brutto {Number(r.grossReportedSek || 0).toLocaleString('sv-SE')} kr
                  {Number.isFinite(r.grossReportedEur) ? ` (${Number(r.grossReportedEur).toLocaleString('sv-SE')} EUR)` : ''}.
                </li>
              ))}
            </ul>
          </div>
        )}

        {!profile && (
          <Card className="py-8 text-center text-[13px] text-admin-text-muted">
            Inga DAC7-uppgifter registrerade ännu.
          </Card>
        )}

        {/* Identity fields — read-only for the seller. */}
        {profile && (
          <CardSection title="Identitetsuppgifter (hanteras av plattformen)">
            <dl className="space-y-1 text-[13px]">
              {IDENTITY_FIELDS.map(({ k, label }) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-admin-text-muted">{label}</dt>
                  <dd className="text-admin-text">{profile[k] || '—'}</dd>
                </div>
              ))}
            </dl>
          </CardSection>
        )}

        {/* Contact fields — seller-correctable (GDPR rectification). */}
        <CardSection title="Kontaktuppgifter (du kan rätta dessa)">
          <div className="space-y-3">
            {CONTACT_FIELDS.map(({ k, label }) => (
              <div key={k}>
                <label className="block text-[12px] font-semibold text-admin-text-muted mb-1">{label}</label>
                <input
                  value={contact[k] ?? ''}
                  onChange={(e) => setContact((c) => ({ ...c, [k]: e.target.value }))}
                  className="w-full rounded-md border border-admin-border bg-admin-surface px-3 py-1.5 text-[13px] text-admin-text"
                />
              </div>
            ))}
            <Button variant="primary" disabled={saving} onClick={saveContact}>
              {saving ? 'Sparar…' : 'Spara kontaktuppgifter'}
            </Button>
          </div>
        </CardSection>

        {/* Identity correction request. */}
        <CardSection title="Begär rättelse av identitetsuppgift">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-admin-text-muted mb-1">Fält</label>
              <select value={reqField} onChange={(e) => setReqField(e.target.value)} className="rounded-md border border-admin-border bg-admin-surface px-3 py-1.5 text-[13px]">
                <option value="taxId">Skatte-ID</option>
                <option value="dateOfBirth">Födelsedatum</option>
                <option value="sellerType">Säljartyp</option>
              </select>
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="block text-[12px] font-semibold text-admin-text-muted mb-1">Önskat värde</label>
              <input value={reqValue} onChange={(e) => setReqValue(e.target.value)} className="w-full rounded-md border border-admin-border bg-admin-surface px-3 py-1.5 text-[13px]" />
            </div>
            <Button variant="secondary" disabled={reqBusy} onClick={submitRequest}>
              {reqBusy ? 'Skickar…' : 'Skicka begäran'}
            </Button>
          </div>
        </CardSection>
      </div>
    </Page>
  );
};

export default AdminMyTaxData;
