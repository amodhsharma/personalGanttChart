import "./LeftPanel.css";
import DeletePage from "../deletecomponent/DeletePage";

export default function LeftPanel({
  form,
  startDateInputRef,
  endDateInputRef,
  taskPalette,
  durationOptions,
  todayISO,
  activeThemeName,
  showTrash,
  trashedTasks,
  showLogs,
  logs,
  logsText,
  loggingEnabled,
  onChangeField,
  onSubmit,
  onSetToday,
  onApplyDuration,
  onPickColor,
  onResetForm,
  onCycleTheme,
  onToggleTrash,
  onCloseTrash,
  onRestoreTrashTask,
  onDeleteTrashTaskPermanently,
  onClearTrash,
  onToggleLogs,
  onCloseLogs,
  onClearLogs,
  onToggleLogging
}) {
  return (
    <>
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
                min={todayISO}
                required
              />
            </label>

            <div className="duration-row">
              {durationOptions.map((option) => (
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
            <button type="button" className="secondary" onClick={onResetForm}>
              Clear
            </button>
          </div>
        </form>

        <div className="control-dock">
          <div className="control-dock-row">
            <button type="button" className="theme-button" onClick={onCycleTheme}>
              {activeThemeName}
            </button>
            <button type="button" className="logs-button secondary" onClick={onToggleLogs}>
              Logs
            </button>
            <button type="button" className="trash-button secondary" onClick={onToggleTrash}>
              Trash ({trashedTasks.length})
            </button>
          </div>
        </div>
      </aside>

      <DeletePage
        showTrash={showTrash}
        trashedTasks={trashedTasks}
        onClose={onCloseTrash}
        onRestoreTask={onRestoreTrashTask}
        onDeleteTaskPermanently={onDeleteTrashTaskPermanently}
        onClearTrash={onClearTrash}
      />

      {showLogs ? (
        <section className="logs-panel">
          <div className="logs-head">
            <h3>Logs</h3>
            <div className="logs-head-actions">
              <button type="button" className="secondary" onClick={onCloseLogs}>
                Close
              </button>
              <button type="button" className="secondary" onClick={onClearLogs}>
                Clear Logs
              </button>
              <button type="button" className={loggingEnabled ? "secondary" : ""} onClick={onToggleLogging}>
                {loggingEnabled ? "Stop Logs" : "Start Logs"}
              </button>
            </div>
          </div>

          <p className="logs-subtle">
            Logging is currently <strong>{loggingEnabled ? "ON" : "OFF"}</strong>.
          </p>

          <div className="logs-list">
            {logs.length === 0 ? <p className="logs-empty">No logs yet.</p> : null}
            {logs.length > 0 ? <pre>{logsText}</pre> : null}
          </div>
        </section>
      ) : null}
    </>
  );
}
