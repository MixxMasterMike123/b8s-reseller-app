// Shared pickup-date helpers (Delivery & Pickup v2). Pickup dates are stored as
// ISO YYYY-MM-DD strings on shops/{id}.storeIdentity.pickupLocations[].dates and
// on the order's pickupLocation.date.

// Format an ISO YYYY-MM-DD pickup date for display (e.g. "fre 18 jul 2026").
// Parsed as a LOCAL date (no UTC off-by-one); falls back to the raw string.
export const formatPickupDate = (iso) => {
  if (!iso || typeof iso !== 'string') return iso || '';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  try {
    return new Date(y, m - 1, d).toLocaleDateString('sv-SE', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
};
