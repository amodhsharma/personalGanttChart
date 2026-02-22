import "./DeletePage.css";
import { formatDeletedAt, formatIsoToDdMmYyyy } from "./deleteLogic";

export default function DeletePage({
  showTrash,
  trashedTasks,
  onClose,
  onRestoreTask,
  onDeleteTaskPermanently,
  onClearTrash
}) {
  if (!showTrash) return null;

  return (
    <section className="trash-panel">
      <div className="trash-head">
        <h3>Trash</h3>
        <div className="trash-head-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="confirm-delete-btn"
            onClick={onClearTrash}
            disabled={trashedTasks.length === 0}
          >
            Empty Trash
          </button>
        </div>
      </div>

      <p className="trash-subtle">Restore tasks or permanently delete them.</p>

      <div className="trash-list">
        {trashedTasks.length === 0 ? <p className="trash-empty">Trash is empty.</p> : null}

        {trashedTasks.map((task) => (
          <article key={`trash-${task.id}`} className="trash-item">
            <div className="trash-item-main">
              <h4>{task.title}</h4>
              <p>
                {formatIsoToDdMmYyyy(task.startDate)} to {formatIsoToDdMmYyyy(task.endDate)}
              </p>
              <p className="trash-time">Deleted: {formatDeletedAt(task.deletedAt)}</p>
            </div>
            <div className="trash-item-actions">
              <button type="button" className="secondary" onClick={() => onRestoreTask(task.id)}>
                Restore
              </button>
              <button type="button" className="danger" onClick={() => onDeleteTaskPermanently(task.id)}>
                Delete Permanently
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
