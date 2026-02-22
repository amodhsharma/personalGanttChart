export const LOGS_STORAGE_KEY = "personalGanttPlannerLogs";
export const ACTOR_NAME_STORAGE_KEY = "personalGanttPlannerActorName";
export const LOGGING_ENABLED_STORAGE_KEY = "personalGanttPlannerLoggingEnabled";
export const DEFAULT_ACTOR_NAME = "user1";

export function formatLogTimestamp(dateValue) {
  const date = new Date(dateValue);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${day}-${month}-${year}::${hours}-${minutes}-${seconds}`;
}

export function loadLogs() {
  try {
    const raw = localStorage.getItem(LOGS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((line) => typeof line === "string");
  } catch {
    return [];
  }
}

export function saveLogs(logs) {
  localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(logs));
}

export function loadActorName() {
  try {
    const saved = localStorage.getItem(ACTOR_NAME_STORAGE_KEY);
    if (!saved || typeof saved !== "string") return DEFAULT_ACTOR_NAME;
    return saved.trim() || DEFAULT_ACTOR_NAME;
  } catch {
    return DEFAULT_ACTOR_NAME;
  }
}

export function saveActorName(actorName) {
  localStorage.setItem(ACTOR_NAME_STORAGE_KEY, actorName);
}

export function loadLoggingEnabled() {
  try {
    const saved = localStorage.getItem(LOGGING_ENABLED_STORAGE_KEY);
    if (saved === null) return true;
    return saved === "true";
  } catch {
    return true;
  }
}

export function saveLoggingEnabled(enabled) {
  localStorage.setItem(LOGGING_ENABLED_STORAGE_KEY, String(enabled));
}

export function buildLogLine({ actorName, action, eventName, at }) {
  const name = (actorName || DEFAULT_ACTOR_NAME).trim() || DEFAULT_ACTOR_NAME;
  const target = (eventName || "").trim() || "untitled";
  const timestamp = formatLogTimestamp(at || new Date());
  return `${timestamp} ${name} ${action} event name ${target}`;
}

export function appendLogLine(previousLogs, { actorName, action, eventName, enabled }) {
  if (!enabled) return previousLogs;
  const line = buildLogLine({ actorName, action, eventName, at: new Date() });
  return [line, ...previousLogs];
}

export function toTextLog(logs) {
  if (!Array.isArray(logs) || logs.length === 0) return "";
  return logs.join("\n");
}
