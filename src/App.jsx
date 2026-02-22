import { useEffect, useRef, useState } from "react";
import { Timeline } from "vis-timeline/standalone";
import "vis-timeline/styles/vis-timeline-graph2d.min.css";
import {
  TASK_PASTEL_COLORS,
  getTheme,
  THEME_STORAGE_KEY,
  getNextThemeKey,
  loadStoredThemeKey
} from "./themesLogic";
import {
  appendLogLine,
  loadActorName,
  loadLoggingEnabled,
  loadLogs,
  saveLoggingEnabled,
  saveLogs,
  toTextLog
} from "./Logs";

const STORAGE_KEY = "personalGanttPlannerTasks";
const DURATION_OPTIONS = [
  { label: "1M", months: 1 },
  { label: "3M", months: 3 },
  { label: "4M", months: 4 },
  { label: "6M", months: 6 },
  { label: "1Y", months: 12 }
];
const HOVER_OPEN_DELAY_MS = 1000;
const POPOVER_WIDTH = 320;
const POPOVER_HEIGHT = 330;
const POPOVER_VIEWPORT_PADDING = 12;
const POPOVER_CURSOR_OFFSET = 2;

function dateToLocalISO(dateValue) {
  const date = new Date(dateValue);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(dateValue, days) {
  const date = new Date(dateValue);
  date.setDate(date.getDate() + days);
  return date;
}

function addMonthsToISODate(isoDate, monthsToAdd) {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = date.getMonth() + monthsToAdd;
  const day = date.getDate();
  const lastDayOfTargetMonth = new Date(year, month + 1, 0).getDate();
  const clampedDay = Math.min(day, lastDayOfTargetMonth);
  const targetDate = new Date(year, month, clampedDay);
  return dateToLocalISO(targetDate);
}

function isValidTask(task) {
  if (!task || typeof task !== "object") return false;
  if (!task.id || !task.title || !task.startDate || !task.endDate) return false;
  return task.endDate >= task.startDate;
}

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidTask);
  } catch {
    return [];
  }
}

function createEmptyForm(defaultColor) {
  return {
    title: "",
    startDate: "",
    endDate: "",
    color: defaultColor
  };
}

function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function hexToRgb(hex) {
  const cleaned = hex.replace("#", "").trim();
  if (cleaned.length === 3) {
    const r = parseInt(cleaned[0] + cleaned[0], 16);
    const g = parseInt(cleaned[1] + cleaned[1], 16);
    const b = parseInt(cleaned[2] + cleaned[2], 16);
    return { r, g, b };
  }
  if (cleaned.length === 6) {
    const r = parseInt(cleaned.slice(0, 2), 16);
    const g = parseInt(cleaned.slice(2, 4), 16);
    const b = parseInt(cleaned.slice(4, 6), 16);
    return { r, g, b };
  }
  return null;
}

function getReadableTextColor(backgroundColor) {
  const rgb = hexToRgb(backgroundColor);
  if (!rgb) return "#1f2937";
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.55 ? "#1f2937" : "#f9fafb";
}

function taskToTimelineItem(task, fallbackColor) {
  const start = new Date(`${task.startDate}T00:00:00`);
  const endInclusive = new Date(`${task.endDate}T00:00:00`);
  const endExclusive = addDays(endInclusive, 1);
  const taskColor = task.color || fallbackColor;
  const textColor = getReadableTextColor(taskColor);
  return {
    id: task.id,
    group: task.id,
    content: task.title,
    start,
    end: endExclusive,
    style: `background: ${taskColor}; border-color: ${taskColor}; color: ${textColor};`
  };
}

export default function App() {
  const [themeKey, setThemeKey] = useState(loadStoredThemeKey);
  const activeTheme = getTheme(themeKey);
  const taskPalette = TASK_PASTEL_COLORS;

  const [tasks, setTasks] = useState(loadTasks);
  const [logs, setLogs] = useState(loadLogs);
  const [loggingEnabled, setLoggingEnabled] = useState(loadLoggingEnabled);
  const [showLogs, setShowLogs] = useState(false);
  const [form, setForm] = useState(() => createEmptyForm(taskPalette[0]));
  const [popover, setPopover] = useState({
    visible: false,
    taskId: null,
    unlocked: false,
    x: 0,
    y: 0,
    draft: null
  });

  const timelineContainerRef = useRef(null);
  const timelineRef = useRef(null);
  const tasksRef = useRef(tasks);
  const hoverTimerRef = useRef(null);
  const closeTimerRef = useRef(null);
  const popoverHoverRef = useRef(false);
  const mousePositionRef = useRef({
    x: POPOVER_VIEWPORT_PADDING,
    y: POPOVER_VIEWPORT_PADDING
  });
  const startDateInputRef = useRef(null);
  const endDateInputRef = useRef(null);
  const popoverTitleRef = useRef(null);
  const popoverStartRef = useRef(null);
  const popoverEndRef = useRef(null);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    saveLogs(logs);
  }, [logs]);

  useEffect(() => {
    saveLoggingEnabled(loggingEnabled);
  }, [loggingEnabled]);

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, themeKey);
  }, [themeKey]);

  useEffect(() => {
    const root = document.documentElement;
    Object.entries(activeTheme.cssVars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }, [activeTheme]);

  useEffect(() => {
    setForm((current) => {
      if (taskPalette.includes(current.color)) return current;
      return { ...current, color: taskPalette[0] };
    });
  }, [taskPalette]);

  function appendLog(action, taskTitle) {
    setLogs((previous) =>
      appendLogLine(previous, {
        actorName: loadActorName(),
        action,
        eventName: taskTitle,
        enabled: loggingEnabled
      })
    );
  }

  function clearHoverTimer() {
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }

  function clearCloseTimer() {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function getPopoverPosition(clientX, clientY) {
    const fallback = {
      x: POPOVER_VIEWPORT_PADDING,
      y: POPOVER_VIEWPORT_PADDING
    };

    if (typeof window === "undefined") return fallback;

    const maxX = window.innerWidth - POPOVER_WIDTH - POPOVER_VIEWPORT_PADDING;
    const maxY = window.innerHeight - POPOVER_HEIGHT - POPOVER_VIEWPORT_PADDING;

    return {
      x: Math.max(POPOVER_VIEWPORT_PADDING, Math.min(clientX + POPOVER_CURSOR_OFFSET, maxX)),
      y: Math.max(POPOVER_VIEWPORT_PADDING, Math.min(clientY + POPOVER_CURSOR_OFFSET, maxY))
    };
  }

  function closePopover() {
    setPopover((current) => ({
      ...current,
      visible: false,
      taskId: null,
      unlocked: false,
      draft: null
    }));
  }

  function openPopoverForTask(taskId, clientX, clientY) {
    const task = tasksRef.current.find((entry) => String(entry.id) === String(taskId));
    if (!task) return;
    const position = getPopoverPosition(clientX, clientY);
    setPopover({
      visible: true,
      taskId: task.id,
      unlocked: false,
      x: position.x,
      y: position.y,
      draft: {
        title: task.title,
        startDate: task.startDate,
        endDate: task.endDate,
        color: task.color || taskPalette[0]
      }
    });
  }

  useEffect(() => {
    if (!timelineContainerRef.current) return;

    timelineRef.current = new Timeline(timelineContainerRef.current, [], {
      stack: true,
      groupOrder: "order",
      orientation: {
        axis: "top",
        item: "bottom"
      },
      horizontalScroll: true,
      verticalScroll: true,
      zoomKey: "ctrlKey",
      editable: {
        add: false,
        updateGroup: false,
        updateTime: true,
        remove: false
      },
      margin: {
        item: 10,
        axis: 8
      },
      onMove: (item, callback) => {
        const movedStart = dateToLocalISO(item.start);
        const movedEnd = item.end ? dateToLocalISO(addDays(item.end, -1)) : movedStart;
        const movedTask = tasksRef.current.find((task) => String(task.id) === String(item.id));
        if (movedTask) {
          appendLog("modified", movedTask.title);
        }
        setTasks((previous) =>
          previous.map((task) =>
            task.id === item.id
              ? {
                  ...task,
                  startDate: movedStart,
                  endDate: movedEnd
                }
              : task
          )
        );
        callback(item);
      }
    });

    const handleItemOver = (properties) => {
      clearCloseTimer();
      clearHoverTimer();
      closePopover();
      const clientX =
        properties?.event?.srcEvent?.clientX ??
        properties?.event?.clientX ??
        mousePositionRef.current.x;
      const clientY =
        properties?.event?.srcEvent?.clientY ??
        properties?.event?.clientY ??
        mousePositionRef.current.y;
      hoverTimerRef.current = window.setTimeout(() => {
        openPopoverForTask(properties.item, clientX, clientY);
      }, HOVER_OPEN_DELAY_MS);
    };

    const handleItemOut = () => {
      clearHoverTimer();
      clearCloseTimer();
      closeTimerRef.current = window.setTimeout(() => {
        if (!popoverHoverRef.current) {
          closePopover();
        }
      }, 160);
    };

    timelineRef.current.on("itemover", handleItemOver);
    timelineRef.current.on("itemout", handleItemOut);

    const handlePointerMove = (event) => {
      mousePositionRef.current = {
        x: event.clientX,
        y: event.clientY
      };
    };
    timelineContainerRef.current.addEventListener("mousemove", handlePointerMove);

    return () => {
      clearHoverTimer();
      clearCloseTimer();
      timelineRef.current?.off("itemover", handleItemOver);
      timelineRef.current?.off("itemout", handleItemOut);
      timelineContainerRef.current?.removeEventListener("mousemove", handlePointerMove);
      timelineRef.current?.destroy();
      timelineRef.current = null;
    };
  }, [taskPalette]);

  useEffect(() => {
    if (!timelineRef.current) return;
    const items = tasks.map((task) => taskToTimelineItem(task, taskPalette[0]));
    const groups = tasks.map((task, index) => ({
      id: task.id,
      content: "",
      order: index
    }));
    timelineRef.current.setGroups(groups);
    timelineRef.current.setItems(items);

    if (items.length > 0) {
      const starts = items.map((item) => item.start.getTime());
      const ends = items.map((item) => item.end.getTime());
      const min = addDays(new Date(Math.min(...starts)), -7);
      const max = addDays(new Date(Math.max(...ends)), 7);
      timelineRef.current.setWindow(min, max, { animation: false });
    } else {
      const now = new Date();
      timelineRef.current.setWindow(addDays(now, -15), addDays(now, 45), { animation: false });
    }
  }, [tasks, taskPalette]);

  useEffect(() => {
    if (!popover.visible || !popover.taskId) return;
    const task = tasks.find((entry) => entry.id === popover.taskId);
    if (!task) {
      closePopover();
      return;
    }

    if (!popover.unlocked) {
      const nextDraft = {
        title: task.title,
        startDate: task.startDate,
        endDate: task.endDate,
        color: task.color || taskPalette[0]
      };
      const currentDraft = popover.draft;
      const changed =
        !currentDraft ||
        currentDraft.title !== nextDraft.title ||
        currentDraft.startDate !== nextDraft.startDate ||
        currentDraft.endDate !== nextDraft.endDate ||
        currentDraft.color !== nextDraft.color;
      if (changed) {
        setPopover((current) => ({ ...current, draft: nextDraft }));
      }
    }
  }, [tasks, taskPalette, popover]);

  function onChangeField(event) {
    const { name, value } = event.target;
    event.target.setCustomValidity("");
    if (name === "startDate") {
      endDateInputRef.current?.setCustomValidity("");
    }
    setForm((current) => ({ ...current, [name]: value }));
  }

  function resetForm() {
    setForm(createEmptyForm(taskPalette[0]));
    startDateInputRef.current?.setCustomValidity("");
    endDateInputRef.current?.setCustomValidity("");
  }

  function onSubmit(event) {
    event.preventDefault();
    startDateInputRef.current?.setCustomValidity("");
    endDateInputRef.current?.setCustomValidity("");

    if (form.endDate < form.startDate) {
      endDateInputRef.current?.setCustomValidity("End date cannot be before start date.");
      endDateInputRef.current?.reportValidity();
      return;
    }

    const nextTask = {
      id: createId(),
      title: form.title.trim(),
      startDate: form.startDate,
      endDate: form.endDate,
      color: form.color
    };
    setTasks((previous) => [...previous, nextTask]);
    appendLog("added", nextTask.title);
    resetForm();
  }

  function onSetToday() {
    const today = dateToLocalISO(new Date());
    setForm((current) => ({
      ...current,
      startDate: today,
      endDate: current.endDate || today
    }));
  }

  function onPickColor(color) {
    setForm((current) => ({
      ...current,
      color
    }));
  }

  function onApplyDuration(months) {
    if (!form.startDate) {
      startDateInputRef.current?.setCustomValidity("Select a start date first.");
      startDateInputRef.current?.reportValidity();
      return;
    }

    startDateInputRef.current?.setCustomValidity("");
    const computedEndDate = addMonthsToISODate(form.startDate, months);
    setForm((current) => ({
      ...current,
      endDate: computedEndDate
    }));
  }

  function onPopoverFieldChange(event) {
    const { name, value } = event.target;
    event.target.setCustomValidity("");
    setPopover((current) => {
      if (!current.draft) return current;
      return {
        ...current,
        draft: { ...current.draft, [name]: value }
      };
    });
  }

  function onPopoverPickColor(color) {
    setPopover((current) => {
      if (!current.draft) return current;
      return {
        ...current,
        draft: { ...current.draft, color }
      };
    });
  }

  function onTogglePopoverUnlock() {
    setPopover((current) => ({
      ...current,
      unlocked: !current.unlocked
    }));
  }

  function onSavePopoverChanges() {
    if (!popover.draft || !popover.taskId) return;

    popoverTitleRef.current?.setCustomValidity("");
    popoverStartRef.current?.setCustomValidity("");
    popoverEndRef.current?.setCustomValidity("");

    if (!popover.draft.title.trim()) {
      popoverTitleRef.current?.setCustomValidity("Task title is required.");
      popoverTitleRef.current?.reportValidity();
      return;
    }

    if (!popover.draft.startDate || !popover.draft.endDate) {
      popoverEndRef.current?.setCustomValidity("Start and end date are required.");
      popoverEndRef.current?.reportValidity();
      return;
    }

    if (popover.draft.endDate < popover.draft.startDate) {
      popoverEndRef.current?.setCustomValidity("End date cannot be before start date.");
      popoverEndRef.current?.reportValidity();
      return;
    }

    setTasks((previous) =>
      previous.map((task) =>
        task.id === popover.taskId
          ? {
              ...task,
              title: popover.draft.title.trim(),
              startDate: popover.draft.startDate,
              endDate: popover.draft.endDate,
              color: popover.draft.color
            }
          : task
      )
    );
    appendLog("modified", popover.draft.title);

    setPopover((current) => ({ ...current, unlocked: false }));
  }

  function onDeleteFromPopover() {
    if (!popover.taskId) return;
    const task = tasksRef.current.find((entry) => entry.id === popover.taskId);
    setTasks((previous) => previous.filter((task) => task.id !== popover.taskId));
    appendLog("deleted", task?.title || "");
    closePopover();
  }

  function onCycleTheme() {
    setThemeKey((currentThemeKey) => getNextThemeKey(currentThemeKey));
  }

  return (
    <div className="app-shell">
      <div className="control-dock">
        <button type="button" className="theme-button" onClick={onCycleTheme}>
          {activeTheme.name}
        </button>
        <button type="button" className="logs-button secondary" onClick={() => setShowLogs((current) => !current)}>
          Logs
        </button>
      </div>
      <aside className="left-panel">
        <h1>Personal Gantt Planner</h1>
        <p className="subtle">Plan tasks over weeks, months, and years.</p>

        <form className="task-form" onSubmit={onSubmit}>
          <label>
            Task Title
            <input
              type="text"
              name="title"
              placeholder="Add a task to add it to Timeline"
              value={form.title}
              onChange={onChangeField}
              required
            />
          </label>

          <div className="date-range-row">
            <label className="date-field">
              Start Date
              <div className="start-with-today">
                <input
                  ref={startDateInputRef}
                  type="date"
                  name="startDate"
                  value={form.startDate}
                  onChange={onChangeField}
                  placeholder="dd/mm/yyyy"
                  required
                />
                <button type="button" className="secondary today-btn" onClick={onSetToday}>
                  Today
                </button>
              </div>
            </label>

            <label className="date-field">
              End Date
              <input
                ref={endDateInputRef}
                type="date"
                name="endDate"
                value={form.endDate}
                onChange={onChangeField}
                placeholder="dd/mm/yyyy"
                required
              />
            </label>

            <div className="duration-row">
              {DURATION_OPTIONS.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  className="duration-btn"
                  onClick={() => onApplyDuration(option.months)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="palette-row">
            {taskPalette.map((color) => (
              <button
                key={color}
                type="button"
                className={`swatch ${form.color === color ? "active" : ""}`}
                style={{ backgroundColor: color }}
                aria-label={`Select color ${color}`}
                onClick={() => onPickColor(color)}
              />
            ))}
          </div>

          <div className="form-actions">
            <button type="submit">Add Task</button>
            <button type="button" className="secondary" onClick={resetForm}>
              Clear
            </button>
          </div>
        </form>
      </aside>

      <main className="right-panel">
        <div className="timeline-header">
          <h2>Timeline</h2>
          <p>Hover a task for a second to open details.</p>
        </div>
        <div className="timeline-frame">
          <div ref={timelineContainerRef} className="timeline" />
        </div>
      </main>

      {popover.visible && popover.draft ? (
        <section
          className="task-popover"
          style={{ left: `${popover.x}px`, top: `${popover.y}px` }}
          onMouseEnter={() => {
            popoverHoverRef.current = true;
            clearCloseTimer();
          }}
          onMouseLeave={() => {
            popoverHoverRef.current = false;
            closePopover();
          }}
        >
          <h3>Task Details</h3>
          <label>
            Task Title
            <input
              ref={popoverTitleRef}
              type="text"
              name="title"
              value={popover.draft.title}
              onChange={onPopoverFieldChange}
              disabled={!popover.unlocked}
              required
            />
          </label>

          <div className="popover-date-row">
            <label>
              Start
              <input
                ref={popoverStartRef}
                type="date"
                name="startDate"
                value={popover.draft.startDate}
                onChange={onPopoverFieldChange}
                disabled={!popover.unlocked}
                required
              />
            </label>
            <label>
              End
              <input
                ref={popoverEndRef}
                type="date"
                name="endDate"
                value={popover.draft.endDate}
                onChange={onPopoverFieldChange}
                disabled={!popover.unlocked}
                required
              />
            </label>
          </div>

          <div className="popover-swatches">
            {taskPalette.map((color) => (
              <button
                key={`popover-${color}`}
                type="button"
                className={`swatch ${popover.draft.color === color ? "active" : ""}`}
                style={{ backgroundColor: color }}
                aria-label={`Select color ${color}`}
                onClick={() => onPopoverPickColor(color)}
                disabled={!popover.unlocked}
              />
            ))}
          </div>

          <div className="popover-actions">
            <button type="button" className="danger" onClick={onDeleteFromPopover}>
              Delete
            </button>
            <button type="button" className="secondary" onClick={onTogglePopoverUnlock}>
              {popover.unlocked ? "Lock Editing" : "Unlock for Editing"}
            </button>
            {popover.unlocked ? (
              <button type="button" onClick={onSavePopoverChanges}>
                Save
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      {showLogs ? (
        <section className="logs-panel">
          <div className="logs-head">
            <h3>Logs</h3>
            <div className="logs-head-actions">
              <button type="button" className="secondary" onClick={() => setShowLogs(false)}>
                Close
              </button>
              <button type="button" className="secondary" onClick={() => setLogs([])}>
                Clear Logs
              </button>
              <button
                type="button"
                className={loggingEnabled ? "secondary" : ""}
                onClick={() => setLoggingEnabled((current) => !current)}
              >
                {loggingEnabled ? "Stop Logs" : "Start Logs"}
              </button>
            </div>
          </div>

          <p className="logs-subtle">
            Logging is currently <strong>{loggingEnabled ? "ON" : "OFF"}</strong>.
          </p>
          {/* <p className="logs-subtle">Actor name is resolved from the active signed-in user context.</p> */}

          <div className="logs-list">
            {logs.length === 0 ? <p className="logs-empty">No logs yet.</p> : null}
            {logs.length > 0 ? <pre>{toTextLog(logs)}</pre> : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
