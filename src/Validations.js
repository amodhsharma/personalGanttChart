const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ONE_YEAR_MS = 365 * ONE_DAY_MS;

export const TIMELINE_ZOOM_MIN_MS = 10 * ONE_DAY_MS;
export const TIMELINE_ZOOM_MAX_MS = 10 * ONE_YEAR_MS;
export const END_DATE_IN_PAST_ERROR = "End date cannot be in the past.";

export const TIMELINE_VIEW_OPTIONS = [
  { key: "default", label: "Default", type: "default", months: 24 },
  { key: "1M", label: "1M", type: "range", months: 1 },
  { key: "3M", label: "3M", type: "range", months: 3 },
  { key: "4M", label: "4M", type: "range", months: 4 },
  { key: "6M", label: "6M", type: "range", months: 6 },
  { key: "1Y", label: "1Y", type: "range", months: 12 },
  { key: "5Y", label: "5Y", type: "range", months: 60 }
];

export function isIsoDateInPast(isoDate) {
  if (!isoDate) return false;
  const candidate = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(candidate.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return candidate.getTime() < today.getTime();
}
