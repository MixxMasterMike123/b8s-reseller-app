/**
 * DAC7 per-seller per-calendar-year aggregation (pure, unit-tested).
 *
 * DAC7 (EU Council Directive 2021/514) requires a platform to report, per
 * reportable seller per calendar year: the GROSS consideration and the NUMBER
 * of relevant transactions (activities). A seller is EXCLUDED from reporting
 * under the de-minimis test when they had FEWER THAN 30 sales AND received
 * ≤ EUR 2,000 in the year — but the figures are still computed (the platform
 * must apply the test, not assume exclusion).
 *
 * This module is the pure decision logic: given a seller's orders for a year,
 * it returns the gross + count + the de-minimis verdict. No I/O — the caller
 * loads orders (Admin SDK) and supplies a SEK→EUR rate (documented source;
 * orders are priced in SEK, the threshold is in EUR).
 */

// De-minimis thresholds (DAC7).
export const DAC7_MIN_TRANSACTIONS = 30;     // "fewer than 30" → < 30
export const DAC7_MAX_CONSIDERATION_EUR = 2000;

// Order statuses that do NOT count toward gross consideration: a refunded or
// cancelled sale did not result in consideration retained by the seller.
const NON_COUNTING_STATUSES = new Set(['refunded', 'cancelled']);

export interface Dac7Order {
  total?: number;             // gross order total in SEK
  status?: string;            // order status
  createdAt?: any;            // Firestore Timestamp | Date | ISO string | ms
  source?: string;            // 'b2c' | 'b2b' (both are the seller's sales)
}

export interface Dac7YearAggregate {
  year: number;
  transactionCount: number;
  grossConsiderationSek: number;
  grossConsiderationEur: number;
  sekToEurRate: number;
  belowDeMinimis: boolean;     // true → excluded from reporting (still computed)
  reportable: boolean;         // convenience: !belowDeMinimis
}

/** Normalise a variety of timestamp shapes to a JS Date (or null). */
export function toDate(ts: any): Date | null {
  if (!ts) return null;
  if (ts instanceof Date) return ts;
  if (typeof ts?.toDate === 'function') return ts.toDate();           // Firestore Timestamp
  if (typeof ts === 'number') return new Date(ts);                    // epoch ms
  if (typeof ts?.seconds === 'number') return new Date(ts.seconds * 1000); // {seconds,nanoseconds}
  if (typeof ts === 'string') { const d = new Date(ts); return isNaN(d.getTime()) ? null : d; }
  return null;
}

/**
 * Aggregate a seller's orders for one calendar year.
 *
 * @param orders      the seller's orders (any year; filtered here by createdAt)
 * @param year        the calendar year (e.g. 2026)
 * @param sekToEurRate  SEK→EUR conversion (e.g. 0.087). Documented rate source;
 *                    used only to apply the EUR de-minimis threshold.
 */
export function aggregateSellerYear(
  orders: Dac7Order[],
  year: number,
  sekToEurRate: number
): Dac7YearAggregate {
  const rate = Number.isFinite(sekToEurRate) && sekToEurRate > 0 ? sekToEurRate : 0;
  let count = 0;
  let grossSek = 0;

  for (const o of Array.isArray(orders) ? orders : []) {
    const d = toDate(o?.createdAt);
    if (!d || d.getUTCFullYear() !== year) continue;          // only this calendar year
    const status = (o?.status || '').toLowerCase();
    if (NON_COUNTING_STATUSES.has(status)) continue;          // refunded/cancelled don't count
    const total = Number(o?.total);
    if (!Number.isFinite(total) || total <= 0) continue;      // skip non-positive/garbage
    count += 1;
    grossSek += total;
  }

  // Round SEK to ören-free krona for reporting; EUR to cents.
  const grossConsiderationSek = Math.round(grossSek * 100) / 100;
  const grossConsiderationEur = Math.round(grossSek * rate * 100) / 100;

  // De-minimis: FEWER THAN 30 sales AND ≤ EUR 2,000 → excluded.
  const belowDeMinimis =
    count < DAC7_MIN_TRANSACTIONS && grossConsiderationEur <= DAC7_MAX_CONSIDERATION_EUR;

  return {
    year,
    transactionCount: count,
    grossConsiderationSek,
    grossConsiderationEur,
    sekToEurRate: rate,
    belowDeMinimis,
    reportable: !belowDeMinimis,
  };
}
