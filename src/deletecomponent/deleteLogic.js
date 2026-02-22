export const TRASH_STORAGE_KEY = "personalGanttPlannerTrashEvents";

export function isValidTrashEvent(event) {
  if (!event || typeof event !== "object") return false;
  if (!event.id || !event.title || !event.startDate || !event.endDate) return false;
  if (event.endDate < event.startDate) return false;
  if (!event.deletedAt || typeof event.deletedAt !== "string") return false;
  return !Number.isNaN(new Date(event.deletedAt).getTime());
}

export function loadTrashEvents() {
  try {
    const raw = localStorage.getItem(TRASH_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidTrashEvent);
  } catch {
    return [];
  }
}

export function createTrashedEvent(event) {
  return {
    ...event,
    deletedAt: new Date().toISOString()
  };
}

export function upsertTrashEvent(previousTrash, trashedEvent) {
  return [trashedEvent, ...previousTrash.filter((entry) => entry.id !== trashedEvent.id)];
}

export function restoreEventFromTrash(trashedEvent) {
  return {
    id: trashedEvent.id,
    title: trashedEvent.title,
    startDate: trashedEvent.startDate,
    endDate: trashedEvent.endDate,
    color: trashedEvent.color
  };
}

export function removeTrashEventById(previousTrash, eventId) {
  return previousTrash.filter((event) => event.id !== eventId);
}

export function formatIsoToDdMmYyyy(isoDate) {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());
  return `${day}-${month}-${year}`;
}

export function formatDeletedAt(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}-${month}-${year} ${hours}:${minutes}`;
}
