// Shared pickup-date helpers (Delivery & Pickup v2). Pickup dates are stored as
// ISO YYYY-MM-DD strings on shops/{id}.storeIdentity.pickupLocations[].dates and
// on the order's pickupLocation.date.

// Parse an ISO YYYY-MM-DD string into a LOCAL Date (no UTC off-by-one), or null.
const parseLocal = (iso) => {
  if (!iso || typeof iso !== 'string') return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

// Format an ISO YYYY-MM-DD pickup date for display (e.g. "fre 18 jul 2026").
// Parsed as a LOCAL date (no UTC off-by-one); falls back to the raw string.
export const formatPickupDate = (iso) => {
  const date = parseLocal(iso);
  if (!date) return iso || '';
  try {
    return date.toLocaleDateString('sv-SE', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
};

// Compact day+date label, capitalized Swedish weekday + d/m (e.g. "Onsdag 17/6").
// Used in the pickup location/date dropdown so each option is distinguishable.
export const formatPickupDayShort = (iso) => {
  const date = parseLocal(iso);
  if (!date) return iso || '';
  try {
    const weekday = date.toLocaleDateString('sv-SE', { weekday: 'long' });
    const cap = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    return `${cap} ${date.getDate()}/${date.getMonth() + 1}`;
  } catch {
    return iso;
  }
};

