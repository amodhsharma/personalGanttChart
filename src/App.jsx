import { useEffect, useMemo, useRef, useState } from "react";
import { Timeline } from "vis-timeline/standalone";
import "vis-timeline/styles/vis-timeline-graph2d.min.css";

const STORAGE_KEY = "personalGanttPlannerTasks";
const DEFAULT_COLORS = ["#bfd8e6", "#c8e7cc", "#f4ddc8", "#f1d2d2", "#d8d0e8", "#f1e8cf"];

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

function formatDisplayDate(isoDate) {
  if (!isoDate || typeof isoDate !== "string") return isoDate;
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return `${day}-${month}-${year}`;
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

function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function taskToTimelineItem(task) {
  const start = new Date(`${task.startDate}T00:00:00`);
  const endInclusive = new Date(`${task.endDate}T00:00:00`);
  const endExclusive = addDays(endInclusive, 1);
  const taskColor = task.color || DEFAULT_COLORS[0];
  return {
    id: task.id,
    group: task.id,
    content: task.title,
    start,
    end: endExclusive,
    style: `background: ${taskColor}; border-color: ${taskColor}; color: #1f2937;`
  };
}

const emptyForm = {
  title: "",
  startDate: "",
  endDate: "",
  color: DEFAULT_COLORS[0]
};

export default function App() {
  const [tasks, setTasks] = useState(loadTasks);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");

  const timelineContainerRef = useRef(null);
  const timelineRef = useRef(null);

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      if (a.startDate === b.startDate) return a.endDate.localeCompare(b.endDate);
      return a.startDate.localeCompare(b.startDate);
    });
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

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

    return () => {
      timelineRef.current?.destroy();
      timelineRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!timelineRef.current) return;
    const items = tasks.map(taskToTimelineItem);
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
  }, [tasks]);

  function onChangeField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setError("");
  }

  function onSubmit(event) {
    event.preventDefault();
    setError("");

    if (!form.title.trim()) {
      setError("Task title is required.");
      return;
    }

    if (!form.startDate || !form.endDate) {
      setError("Start and end date are required.");
      return;
    }

    if (form.endDate < form.startDate) {
      setError("End date cannot be before start date.");
      return;
    }

    if (editingId) {
      setTasks((previous) =>
        previous.map((task) =>
          task.id === editingId
            ? {
                ...task,
                title: form.title.trim(),
                startDate: form.startDate,
                endDate: form.endDate,
                color: form.color
              }
            : task
        )
      );
      resetForm();
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

  function onEdit(task) {
    setEditingId(task.id);
    setForm({
      title: task.title,
      startDate: task.startDate,
      endDate: task.endDate,
      color: task.color || DEFAULT_COLORS[0]
    });
    setError("");
  }

  function onDelete(taskId) {
    setTasks((previous) => previous.filter((task) => task.id !== taskId));
    if (editingId === taskId) {
      resetForm();
    }
  }

  return (
    <div className="app-shell">
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
                type="date"
                name="endDate"
                value={form.endDate}
                onChange={onChangeField}
                placeholder="dd/mm/yyyy"
                required
              />
            </label>
          </div>

          {/* <label>
            Color
            <input type="color" name="color" value={form.color} onChange={onChangeField} />
          </label> */}
          <div className="palette-row">
            {DEFAULT_COLORS.map((color) => (
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

          {error ? <p className="error">{error}</p> : null}

          <div className="form-actions">
            <button type="submit">{editingId ? "Update Task" : "Add Task"}</button>
            {editingId ? (
              <button type="button" className="secondary" onClick={resetForm}>
                Cancel
              </button>
            ) : null}
          </div>
        </form>

        <section className="task-list-wrap">
          <h2>Tasks ({sortedTasks.length})</h2>
          <ul className="task-list">
            {sortedTasks.map((task) => (
              <li key={task.id} className="task-row">
                <div>
                  <strong>{task.title}</strong>
                  <div className="dates">
                    {formatDisplayDate(task.startDate)} to {formatDisplayDate(task.endDate)}
                  </div>
                </div>
                <div className="row-actions">
                  <button type="button" className="secondary" onClick={() => onEdit(task)}>
                    Edit
                  </button>
                  <button type="button" className="danger" onClick={() => onDelete(task.id)}>
                    Delete
                  </button>
                </div>
              </li>
            ))}
            {sortedTasks.length === 0 ? <li className="empty">No tasks yet.</li> : null}
          </ul>
        </section>
      </aside>

      <main className="right-panel">
        <div className="timeline-header">
          <h2>Timeline</h2>
          <p>Drag bars to reschedule tasks.</p>
        </div>
        <div className="timeline-frame">
          <div ref={timelineContainerRef} className="timeline" />
        </div>
      </main>
    </div>
  );
}
