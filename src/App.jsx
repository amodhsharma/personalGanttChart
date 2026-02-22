import { useEffect, useRef, useState } from "react";
import { Timeline } from "vis-timeline/standalone";
import "vis-timeline/styles/vis-timeline-graph2d.min.css";
import {
  TASK_PASTEL_COLORS,
  getTheme,
  THEME_STORAGE_KEY,
  getNextThemeKey,
  loadStoredThemeKey
} from "./themesComponent/themesLogic";
import {
  appendLogLine,
  loadActorName,
  loadLoggingEnabled,
  loadLogs,
  saveLoggingEnabled,
  saveLogs,
  toTextLog
} from "./components/Logs";
import {
  END_DATE_IN_PAST_ERROR,
  isIsoDateInPast,
  TIMELINE_VIEW_OPTIONS,
  TIMELINE_ZOOM_MAX_MS,
  TIMELINE_ZOOM_MIN_MS
} from "./Validations";
import {
  TRASH_STORAGE_KEY,
  createTrashedTask,
  loadTrashTasks,
  removeTrashTaskById,
  restoreTaskFromTrash,
  upsertTrashTask
} from "./deletecomponent/deleteLogic";
import { useGoToLogic } from "./goToComponent/goToLogic";
import LeftPanel from "./LeftPanelComponent/LeftPanel";
import RightPanel from "./RightPanelComponent/RightPanel";

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

function addMonthsToDate(dateValue, monthsToAdd) {
  const date = new Date(dateValue);
  const year = date.getFullYear();
  const month = date.getMonth() + monthsToAdd;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const milliseconds = date.getMilliseconds();
  const lastDayOfTargetMonth = new Date(year, month + 1, 0).getDate();
  const clampedDay = Math.min(day, lastDayOfTargetMonth);
  return new Date(year, month, clampedDay, hours, minutes, seconds, milliseconds);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function mixRgb(baseColor, targetColor, ratio) {
  return {
    r: Math.round(baseColor.r + (targetColor.r - baseColor.r) * ratio),
    g: Math.round(baseColor.g + (targetColor.g - baseColor.g) * ratio),
    b: Math.round(baseColor.b + (targetColor.b - baseColor.b) * ratio)
  };
}

function toRgba(color, alpha) {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
}

function buildTimelineAxisGradient(windowStartMs, windowEndMs, themeVars) {
  if (!windowStartMs || !windowEndMs || windowEndMs <= windowStartMs) return "none";
  const totalRange = windowEndMs - windowStartMs;
  const windowStart = new Date(windowStartMs);
  const windowEnd = new Date(windowEndMs);

  let cursor = new Date(windowStart.getFullYear(), windowStart.getMonth(), 1);
  if (cursor.getTime() > windowStartMs) {
    cursor = new Date(windowStart.getFullYear(), windowStart.getMonth() - 1, 1);
  }

  const stops = [];

  while (cursor < windowEnd) {
    const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    const segmentStart = Math.max(monthStart.getTime(), windowStartMs);
    const segmentEnd = Math.min(monthEnd.getTime(), windowEndMs);

    if (segmentEnd > segmentStart) {
      const left = ((segmentStart - windowStartMs) / totalRange) * 100;
      const right = ((segmentEnd - windowStartMs) / totalRange) * 100;
      const bandColor = (() => {
        const fallbackPrimary = "#5b3676";
        const fallbackSecondary = "#fc9398";
        const primary =
          hexToRgb(themeVars["--btn-primary-bg"] || fallbackPrimary) || hexToRgb(fallbackPrimary);
        const secondary =
          hexToRgb(themeVars["--btn-secondary-bg"] || fallbackSecondary) || hexToRgb(fallbackSecondary);
        const base = monthStart.getFullYear() % 2 === 0 ? primary : secondary;
        const lightTarget = monthStart.getMonth() % 2 === 0 ? { r: 255, g: 255, b: 255 } : { r: 244, g: 245, b: 247 };
        const mixRatio = monthStart.getFullYear() % 2 === 0 ? 0.72 : 0.62;
        const alpha = 0.5;
        return toRgba(mixRgb(base, lightTarget, mixRatio), alpha);
      })();
      stops.push(`${bandColor} ${left.toFixed(3)}% ${right.toFixed(3)}%`);
    }

    cursor = monthEnd;
  }

  if (stops.length === 0) return "none";
  return `linear-gradient(to right, ${stops.join(", ")})`;
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

function getDarkerBorderColor(baseColor, amount = 0.24) {
  const rgb = hexToRgb(baseColor);
  if (!rgb) return baseColor;
  const factor = 1 - amount;
  const r = Math.max(0, Math.round(rgb.r * factor));
  const g = Math.max(0, Math.round(rgb.g * factor));
  const b = Math.max(0, Math.round(rgb.b * factor));
  return `rgb(${r}, ${g}, ${b})`;
}

function taskToTimelineItem(task, fallbackColor) {
  const start = new Date(`${task.startDate}T00:00:00`);
  const endInclusive = new Date(`${task.endDate}T00:00:00`);
  const endExclusive = addDays(endInclusive, 1);
  const taskColor = task.color || fallbackColor;
  const borderColor = getDarkerBorderColor(taskColor);
  const textColor = getReadableTextColor(taskColor);
  return {
    id: task.id,
    group: task.id,
    content: task.title,
    start,
    end: endExclusive,
    style: `background: ${taskColor}; border-color: ${borderColor}; border-width: 2px; color: ${textColor};`
  };
}

export default function App() {
  const [themeKey, setThemeKey] = useState(loadStoredThemeKey);
  const activeTheme = getTheme(themeKey);
  const taskPalette = TASK_PASTEL_COLORS;
  const todayISO = dateToLocalISO(new Date());

  const [tasks, setTasks] = useState(loadTasks);
  const [trashedTasks, setTrashedTasks] = useState(loadTrashTasks);
  const [logs, setLogs] = useState(loadLogs);
  const [loggingEnabled, setLoggingEnabled] = useState(loadLoggingEnabled);
  const [showTrash, setShowTrash] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [timelineViewKey, setTimelineViewKey] = useState("default");
  const [timelineWindow, setTimelineWindow] = useState(null);
  const [form, setForm] = useState(() => createEmptyForm(taskPalette[0]));
  const [popover, setPopover] = useState({
    visible: false,
    taskId: null,
    unlocked: false,
    deleteArmed: false,
    x: 0,
    y: 0,
    draft: null
  });

  const timelineContainerRef = useRef(null);
  const timelineCanvasRef = useRef(null);
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

  const goToControls = useGoToLogic({
    timelineRef,
    timelineContainerRef,
    setTimelineViewKey
  });
  const onGoToTimelineRangeChanged = goToControls.onTimelineRangeChanged;

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(trashedTasks));
  }, [trashedTasks]);

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
      deleteArmed: false,
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
      deleteArmed: false,
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
      showCurrentTime: true,
      zoomMin: TIMELINE_ZOOM_MIN_MS,
      zoomMax: TIMELINE_ZOOM_MAX_MS,
      orientation: {
        axis: "top",
        item: "top"
      },
      format: {
        minorLabels: {
          millisecond: "",
          second: "",
          minute: "",
          hour: "",
          weekday: "D",
          day: "D",
          week: "w",
          month: "MMM",
          year: "YYYY"
        },
        majorLabels: {
          millisecond: "",
          second: "",
          minute: "",
          hour: "",
          weekday: "MMM YYYY",
          day: "MMM YYYY",
          week: "MMM YYYY",
          month: "YYYY",
          year: ""
        }
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
        if (isIsoDateInPast(movedEnd)) {
          window.alert(END_DATE_IN_PAST_ERROR);
          callback(null);
          return;
        }
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

    const handleRangeChanged = (properties) => {
      const startMs = properties?.start ? new Date(properties.start).getTime() : null;
      const endMs = properties?.end ? new Date(properties.end).getTime() : null;
      if (startMs && endMs) {
        setTimelineWindow({ startMs, endMs });
      }
      if (properties?.byUser) {
        setTimelineViewKey(null);
      }
      onGoToTimelineRangeChanged();
    };

    timelineRef.current.on("itemover", handleItemOver);
    timelineRef.current.on("itemout", handleItemOut);
    timelineRef.current.on("rangechanged", handleRangeChanged);

    const gestureScopeElement = timelineCanvasRef.current || timelineContainerRef.current;

    const applyWindow = (startMs, endMs) => {
      if (!timelineRef.current) return;
      timelineRef.current.setWindow(new Date(startMs), new Date(endMs), { animation: false });
      setTimelineWindow({ startMs, endMs });
      setTimelineViewKey(null);
    };

    const handleWheelGesture = (event) => {
      if (!timelineRef.current || !gestureScopeElement) return;

      const targetElement = event.target instanceof Element ? event.target : null;
      const isInsideVisTimeline = Boolean(targetElement?.closest(".vis-timeline"));
      const shouldBlockBrowserGesture = event.ctrlKey || Math.abs(event.deltaX) > 0;

      if (isInsideVisTimeline) {
        if (shouldBlockBrowserGesture) {
          event.preventDefault();
        }
        return;
      }

      const activeWindow = timelineRef.current.getWindow();
      const currentStartMs = activeWindow.start.getTime();
      const currentEndMs = activeWindow.end.getTime();
      const currentRangeMs = currentEndMs - currentStartMs;
      if (!Number.isFinite(currentRangeMs) || currentRangeMs <= 0) {
        event.preventDefault();
        return;
      }

      const scopeRect = gestureScopeElement.getBoundingClientRect();
      const scopeWidth = scopeRect.width || gestureScopeElement.clientWidth || 1;
      const pointerRatio = clamp((event.clientX - scopeRect.left) / scopeWidth, 0, 1);

      if (event.ctrlKey) {
        const zoomFactor = Math.exp(event.deltaY * 0.0015);
        const nextRangeMs = clamp(
          currentRangeMs * zoomFactor,
          TIMELINE_ZOOM_MIN_MS,
          TIMELINE_ZOOM_MAX_MS
        );
        const pointerTime = currentStartMs + currentRangeMs * pointerRatio;
        const nextStartMs = pointerTime - nextRangeMs * pointerRatio;
        const nextEndMs = nextStartMs + nextRangeMs;
        event.preventDefault();
        applyWindow(nextStartMs, nextEndMs);
        return;
      }

      const horizontalDeltaPx = Math.abs(event.deltaX) > 0 ? event.deltaX : event.shiftKey ? event.deltaY : 0;
      if (horizontalDeltaPx === 0) return;

      const panRatioPerPixel = currentRangeMs / scopeWidth;
      const panMs = horizontalDeltaPx * panRatioPerPixel;
      event.preventDefault();
      applyWindow(currentStartMs + panMs, currentEndMs + panMs);
    };

    const handleTouchMove = (event) => {
      event.preventDefault();
    };

    const handleGestureEvent = (event) => {
      event.preventDefault();
    };

    const handlePointerMove = (event) => {
      mousePositionRef.current = {
        x: event.clientX,
        y: event.clientY
      };
    };
    gestureScopeElement?.addEventListener("mousemove", handlePointerMove);
    gestureScopeElement?.addEventListener("wheel", handleWheelGesture, { passive: false });
    gestureScopeElement?.addEventListener("touchmove", handleTouchMove, { passive: false });
    gestureScopeElement?.addEventListener("gesturestart", handleGestureEvent, { passive: false });
    gestureScopeElement?.addEventListener("gesturechange", handleGestureEvent, { passive: false });
    gestureScopeElement?.addEventListener("gestureend", handleGestureEvent, { passive: false });

    return () => {
      clearHoverTimer();
      clearCloseTimer();
      timelineRef.current?.off("itemover", handleItemOver);
      timelineRef.current?.off("itemout", handleItemOut);
      timelineRef.current?.off("rangechanged", handleRangeChanged);
      gestureScopeElement?.removeEventListener("mousemove", handlePointerMove);
      gestureScopeElement?.removeEventListener("wheel", handleWheelGesture);
      gestureScopeElement?.removeEventListener("touchmove", handleTouchMove);
      gestureScopeElement?.removeEventListener("gesturestart", handleGestureEvent);
      gestureScopeElement?.removeEventListener("gesturechange", handleGestureEvent);
      gestureScopeElement?.removeEventListener("gestureend", handleGestureEvent);
      timelineRef.current?.destroy();
      timelineRef.current = null;
    };
  }, [onGoToTimelineRangeChanged, taskPalette]);

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

    if (timelineViewKey === null) {
      return;
    }

    const selectedView = TIMELINE_VIEW_OPTIONS.find((entry) => entry.key === timelineViewKey);
    if (!selectedView) {
      return;
    }

    if (selectedView.type === "default" || selectedView.type === "range") {
      const now = new Date();
      const rightBound = addMonthsToDate(now, selectedView.months || 1);
      timelineRef.current.setWindow(now, rightBound, { animation: false });
      setTimelineWindow({ startMs: now.getTime(), endMs: rightBound.getTime() });
    }
  }, [tasks, taskPalette, timelineViewKey]);

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

  useEffect(() => {
    if (!timelineContainerRef.current) return;
    if (!timelineWindow) {
      timelineContainerRef.current.style.removeProperty("--axis-month-gradient");
      return;
    }

    const gradient = buildTimelineAxisGradient(timelineWindow.startMs, timelineWindow.endMs, activeTheme.cssVars);
    timelineContainerRef.current.style.setProperty("--axis-month-gradient", gradient);
  }, [timelineWindow, activeTheme]);

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

    if (isIsoDateInPast(form.endDate)) {
      endDateInputRef.current?.setCustomValidity(END_DATE_IN_PAST_ERROR);
      endDateInputRef.current?.reportValidity();
      return;
    }

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
        deleteArmed: false,
        draft: { ...current.draft, [name]: value }
      };
    });
  }

  function onPopoverPickColor(color) {
    setPopover((current) => {
      if (!current.draft) return current;
      return {
        ...current,
        deleteArmed: false,
        draft: { ...current.draft, color }
      };
    });
  }

  function onTogglePopoverUnlock() {
    setPopover((current) => ({
      ...current,
      deleteArmed: false,
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

    if (isIsoDateInPast(popover.draft.endDate)) {
      popoverEndRef.current?.setCustomValidity(END_DATE_IN_PAST_ERROR);
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

    setPopover((current) => ({ ...current, unlocked: false, deleteArmed: false }));
  }

  function onDeleteFromPopover() {
    if (!popover.taskId) return;
    if (!popover.deleteArmed) {
      setPopover((current) => ({ ...current, deleteArmed: true }));
      return;
    }

    const task = tasksRef.current.find((entry) => entry.id === popover.taskId);
    if (task) {
      const trashedTask = createTrashedTask(task);
      setTrashedTasks((previous) => upsertTrashTask(previous, trashedTask));
    }
    setTasks((previous) => previous.filter((task) => task.id !== popover.taskId));
    appendLog("deleted", task?.title || "");
    closePopover();
  }

  function onToggleTrash() {
    setShowTrash((current) => {
      const next = !current;
      if (next) {
        setShowLogs(false);
      }
      return next;
    });
  }

  function onRestoreTrashTask(taskId) {
    const taskToRestore = trashedTasks.find((task) => task.id === taskId);
    if (!taskToRestore) return;

    const restoredTask = restoreTaskFromTrash(taskToRestore);

    setTasks((previous) => {
      if (previous.some((task) => task.id === restoredTask.id)) {
        return [...previous, { ...restoredTask, id: createId() }];
      }
      return [...previous, restoredTask];
    });
    setTrashedTasks((previous) => removeTrashTaskById(previous, taskId));
    appendLog("restored", restoredTask.title);
  }

  function onDeleteTrashTaskPermanently(taskId) {
    const taskToDelete = trashedTasks.find((task) => task.id === taskId);
    setTrashedTasks((previous) => removeTrashTaskById(previous, taskId));
    appendLog("permanently deleted", taskToDelete?.title || "");
  }

  function onClearTrash() {
    if (trashedTasks.length === 0) return;
    setTrashedTasks([]);
    appendLog("cleared trash", "all deleted tasks");
  }

  function onCycleTheme() {
    setThemeKey((currentThemeKey) => getNextThemeKey(currentThemeKey));
  }

  function onSelectTimelineView(viewKey) {
    setTimelineViewKey(viewKey);
  }

  return (
    <div className="app-shell">
      <LeftPanel
        form={form}
        startDateInputRef={startDateInputRef}
        endDateInputRef={endDateInputRef}
        taskPalette={taskPalette}
        durationOptions={DURATION_OPTIONS}
        todayISO={todayISO}
        activeThemeName={activeTheme.name}
        showTrash={showTrash}
        trashedTasks={trashedTasks}
        showLogs={showLogs}
        logs={logs}
        logsText={toTextLog(logs)}
        loggingEnabled={loggingEnabled}
        onChangeField={onChangeField}
        onSubmit={onSubmit}
        onSetToday={onSetToday}
        onApplyDuration={onApplyDuration}
        onPickColor={onPickColor}
        onResetForm={resetForm}
        onCycleTheme={onCycleTheme}
        onToggleTrash={onToggleTrash}
        onCloseTrash={() => setShowTrash(false)}
        onRestoreTrashTask={onRestoreTrashTask}
        onDeleteTrashTaskPermanently={onDeleteTrashTaskPermanently}
        onClearTrash={onClearTrash}
        onToggleLogs={() =>
          setShowLogs((current) => {
            const next = !current;
            if (next) {
              setShowTrash(false);
            }
            return next;
          })
        }
        onCloseLogs={() => setShowLogs(false)}
        onClearLogs={() => setLogs([])}
        onToggleLogging={() => setLoggingEnabled((current) => !current)}
      />

      <RightPanel
        timelineViewOptions={TIMELINE_VIEW_OPTIONS}
        timelineViewKey={timelineViewKey}
        onSelectTimelineView={onSelectTimelineView}
        goToControls={goToControls}
        timelineCanvasRef={timelineCanvasRef}
        timelineContainerRef={timelineContainerRef}
      />

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
                min={todayISO}
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
            <button
              type="button"
              className={popover.deleteArmed ? "confirm-delete-btn" : "secondary"}
              onClick={onDeleteFromPopover}
            >
              {popover.deleteArmed ? "Confirm Delete" : "Delete"}
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

    </div>
  );
}
