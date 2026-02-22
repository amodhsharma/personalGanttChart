export const TRASH_STORAGE_KEY = "personalGanttPlannerTrashTasks";

export function isValidTrashTask(task) {
  if (!task || typeof task !== "object") return false;
  if (!task.id || !task.title || !task.startDate || !task.endDate) return false;
  if (task.endDate < task.startDate) return false;
  if (!task.deletedAt || typeof task.deletedAt !== "string") return false;
  return !Number.isNaN(new Date(task.deletedAt).getTime());
}

export function loadTrashTasks() {
  try {
    const raw = localStorage.getItem(TRASH_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidTrashTask);
  } catch {
    return [];
  }
}

export function createTrashedTask(task) {
  return {
    ...task,
    deletedAt: new Date().toISOString()
  };
}

export function upsertTrashTask(previousTrash, trashedTask) {
  return [trashedTask, ...previousTrash.filter((entry) => entry.id !== trashedTask.id)];
}

export function restoreTaskFromTrash(trashedTask) {
  return {
    id: trashedTask.id,
    title: trashedTask.title,
    startDate: trashedTask.startDate,
    endDate: trashedTask.endDate,
    color: trashedTask.color
  };
}

export function removeTrashTaskById(previousTrash, taskId) {
  return previousTrash.filter((task) => task.id !== taskId);
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
