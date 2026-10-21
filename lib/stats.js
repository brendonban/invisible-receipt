// Start date for the "receipts printed since …" counter (Malaysia time).
// Change with the COUNTER_SINCE env var, e.g. 2026-10-20.
export const COUNTER_SINCE = /^\d{4}-\d{2}-\d{2}$/.test(process.env.COUNTER_SINCE ?? '')
  ? process.env.COUNTER_SINCE
  : '2026-10-20';

export const TZ = 'Asia/Kuala_Lumpur';

// SQL fragment: "$n as a Malaysia-local date, start of day".
export const localDayStart = n => `(($${n})::date)::timestamp AT TIME ZONE '${TZ}'`;
