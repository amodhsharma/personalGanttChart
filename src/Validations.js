const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ONE_YEAR_MS = 365 * ONE_DAY_MS;

export const TIMELINE_ZOOM_MIN_MS = 10 * ONE_DAY_MS;
export const TIMELINE_ZOOM_MAX_MS = 10 * ONE_YEAR_MS;
export const END_DATE_IN_PAST_ERROR = "End date cannot be in the past.";
export const DATE_DD_MM_YYYY_ERROR = "Use dd-mm-yyyy format.";
export const DATE_DD_MM_YYYY_INPUT_PATTERN = "[0-9]{2}-[0-9]{2}-[0-9]{4}";

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

export function parseDdMmYyyyToDate(rawValue) {
  const value = (rawValue || "").trim();
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const parsed = new Date(year, month - 1, day);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

export function isValidDdMmYyyy(rawValue) {
  return Boolean(parseDdMmYyyyToDate(rawValue));
}
